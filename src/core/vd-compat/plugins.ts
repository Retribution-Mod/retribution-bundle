import { awaitStorage, createMMKVBackend, createStorage, purgeStorage, wrapSync } from "@core/vd-compat/storage";
import { Author } from "@lib/addons/types";
import { findAssetId } from "@lib/api/assets";
import { settings } from "@lib/api/settings";
import { showToast } from "@lib/ui/toasts";
import { safeFetch } from "@lib/utils";
import { asyncPool } from "@lib/utils/concurrency";
import { BUNNY_PROXY_PREFIX, VD_PROXY_PREFIX } from "@lib/utils/constants";
import { logger,LoggerClass } from "@lib/utils/logger";

type EvaledPlugin = {
    onLoad?(): void;
    onUnload(): void;
    settings: React.ComponentType<unknown>;
};

// See https://github.com/vendetta-mod/polymanifest
interface PluginManifest {
    name: string;
    description: string;
    authors: Author[];
    main: string;
    hash: string;
    // Vendor-specific field, contains our own data
    vendetta?: {
        icon?: string;
    };
}

export interface VendettaPlugin {
    id: string;
    manifest: PluginManifest;
    enabled: boolean;
    update: boolean;
    js: string;
}

const plugins = wrapSync(createStorage<Record<string, VendettaPlugin>>(createMMKVBackend("VENDETTA_PLUGINS")));
const pluginInstance: Record<string, EvaledPlugin> = {};

export const VdPluginManager = {
    plugins,
    async pluginFetch(url: string) {
        if (url.startsWith(VD_PROXY_PREFIX)) {
            url = url
                .replace("https://bunny-mod.github.io/plugins-proxy", BUNNY_PROXY_PREFIX)
                .replace(VD_PROXY_PREFIX, BUNNY_PROXY_PREFIX);
        }

        return await safeFetch(url, { cache: "no-store" });
    },

    async fetchPlugin(id: string) {
        if (!id.endsWith("/")) id += "/";
        const existingPlugin = plugins[id];

        let pluginManifest: PluginManifest;

        try {
            pluginManifest = await (await this.pluginFetch(id + "manifest.json")).json();
        } catch {
            throw new Error(`Failed to fetch manifest for ${id}`);
        }

        let pluginJs: string | undefined;

        if (existingPlugin?.manifest.hash !== pluginManifest.hash) {
            try {
                // by polymanifest spec, plugins should always specify their main file, but just in case
                pluginJs = await (await this.pluginFetch(id + (pluginManifest.main || "index.js"))).text();
            } catch { } // Empty catch, checked below
        }

        if (!pluginJs && !existingPlugin) throw new Error(`Failed to fetch JS for ${id}`);

        plugins[id] = {
            id: id,
            manifest: pluginManifest,
            enabled: existingPlugin?.enabled ?? false,
            update: existingPlugin?.update ?? true,
            js: pluginJs ?? existingPlugin.js,
        };
    },

    async installPlugin(id: string, enabled = true) {
        if (!id.endsWith("/")) id += "/";
        if (typeof id !== "string" || id in plugins) throw new Error("Plugin already installed");
        await this.fetchPlugin(id);
        if (enabled) await this.startPlugin(id);
    },

    /** @internal */
    async evalPlugin(plugin: VendettaPlugin) {
        const api = {
            ...window.retribution,
            plugin: {
                id: plugin.id,
                manifest: plugin.manifest,
                // Wrapping this with wrapSync is NOT an option.
                storage: await createStorage<Record<string, any>>(createMMKVBackend(plugin.id)),
            },
            logger: new LoggerClass(`Retribution » ${plugin.manifest.name}`),
        };
        // The plugin JS is a raw expression (the plugin's exported object).
        // We wrap it in an arrow function that receives the API object.
        // The parameter name "vendetta" is kept for backwards compatibility —
        // existing plugins reference `vendetta.*` inside their code.
        // New plugins built with the retribution template will use a different
        // parameter name but the API object is the same.
        const pluginString = `vendetta=>{return ${plugin.js}}\n//# sourceURL=${plugin.id}`;

        const raw = (0, eval)(pluginString)(api);
        const ret = typeof raw === "function" ? raw() : raw;
        return ret?.default ?? ret ?? {};
    },

    async startPlugin(id: string) {
        if (!id.endsWith("/")) id += "/";
        const plugin = plugins[id];
        if (!plugin) throw new Error("Attempted to start non-existent plugin");

        try {
            if (!settings.safeMode?.enabled) {
                const pluginRet: EvaledPlugin = await this.evalPlugin(plugin);
                pluginInstance[id] = pluginRet;
                pluginRet.onLoad?.();
            }
            plugin.enabled = true;
        } catch (e) {
            logger.error(`Plugin ${plugin.id} errored whilst loading, and will be unloaded`, e);

            try {
                pluginInstance[plugin.id]?.onUnload?.();
            } catch (e2) {
                logger.error(`Plugin ${plugin.id} errored whilst unloading`, e2);
            }

            delete pluginInstance[id];
            plugin.enabled = false;
        }
    },

    stopPlugin(id: string, disable = true) {
        if (!id.endsWith("/")) id += "/";
        const plugin = plugins[id];
        const pluginRet = pluginInstance[id];
        if (!plugin) throw new Error("Attempted to stop non-existent plugin");

        if (!settings.safeMode?.enabled) {
            try {
                pluginRet?.onUnload?.();
            } catch (e) {
                logger.error(`Plugin ${plugin.id} errored whilst unloading`, e);
            }

            delete pluginInstance[id];
        }

        if (disable) plugin.enabled = false;
    },

    async removePlugin(id: string) {
        if (!id.endsWith("/")) id += "/";
        const plugin = plugins[id];
        if (plugin.enabled) this.stopPlugin(id);
        delete plugins[id];
        await purgeStorage(id);
    },

    /** @internal */
    async initPlugins() {
        await awaitStorage(settings, plugins);
        const allIds = Object.keys(plugins);

        if (!settings.safeMode?.enabled) {
            const enabledIds = allIds.filter(pl => plugins[pl].enabled);

            // Start all enabled plugins from their currently cached JS. This keeps the
            // startup path off the network so first paint isn't gated by one fetch per
            // enabled plugin. Concurrency is capped to keep the JS eval from hammering
            // the main thread all at once.
            await asyncPool(enabledIds, id => this.startPlugin(id), 6);

            // Update disabled plugins lazily in the background.
            allIds.filter(pl => !plugins[pl].enabled && plugins[pl].update).forEach(pl => this.fetchPlugin(pl));

            // After the app has had a chance to render, check enabled plugins for
            // updates and restart any whose JS actually changed. Limit concurrency
            // to avoid a burst of network requests right as the app becomes usable.
            setTimeout(() => {
                asyncPool(
                    enabledIds.filter(pl => plugins[pl].update),
                    async pl => {
                        const beforeHash = plugins[pl].manifest.hash;
                        try {
                            await this.fetchPlugin(pl);
                            if (plugins[pl].manifest.hash !== beforeHash) {
                                if (pluginInstance[pl]) this.stopPlugin(pl, false);
                                await this.startPlugin(pl);
                            }
                        } catch (e: any) {
                            logger.error(`[PluginUpdate] ${pl}: ${e.message}`);
                        }
                    },
                    4
                );
            }, 2000);
        }

        return () => this.stopAllPlugins();
    },

    stopAllPlugins() {
        return Object.keys(pluginInstance).forEach(p => this.stopPlugin(p, false));
    },

    schedulePluginUpdateChecks(intervalMs = 15 * 60 * 1000) {
        const checkForUpdates = async () => {
            const ids = Object.keys(plugins).filter(id => plugins[id].update);
            if (ids.length === 0) return;

            const before = new Map<string, string>();
            for (const id of ids) before.set(id, plugins[id].manifest.hash);

            await Promise.allSettled(ids.map(id => this.fetchPlugin(id).catch((e: Error) => logger.error(`[PluginUpdateChecker] ${id}: ${e.message}`))));

            const updatedIds = ids.filter(id => plugins[id].manifest.hash !== before.get(id));
            if (updatedIds.length === 0) return;

            const names = updatedIds.map(id => plugins[id].manifest.name).filter(Boolean).join(", ");
            showToast(
                `Plugin updates available for: ${names}. Restart Discord to apply.`,
                findAssetId("CheckmarkSmallIcon")!
            );
        };

        const id = setInterval(checkForUpdates, intervalMs);
        checkForUpdates();
        return () => clearInterval(id);
    },

    getSettings: (id: string) => pluginInstance[id]?.settings
};
