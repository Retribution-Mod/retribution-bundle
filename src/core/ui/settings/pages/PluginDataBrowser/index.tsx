import DataBrowser from "@core/ui/components/DataBrowser";
import { VdPluginManager } from "@core/vd-compat/plugins";
import { useProxy } from "@core/vd-compat/storage";
import pluginsData from "@assets/data/plugins-data.json";
import safeFetch from "@lib/utils/safeFetch";
import { createStorage, awaitStorage } from "@lib/api/storage";
import { useEffect, useState } from "react";

interface PluginDataItem {
    name: string;
    description?: string;
    authors?: string[];
    status?: string;
    sourceUrl?: string;
    installUrl: string;
    warningMessage?: string;
    hidden?: boolean;
}

const PUBLIC_PLUGINS_URL = "https://retribution.is-your.app/data/plugins-data.json";
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = createStorage<{ items: PluginDataItem[]; fetchedAt: number }>("plugin-browser-cache.json");

export default function PluginDataBrowser() {
    useProxy(VdPluginManager.plugins);
    const [items, setItems] = useState<PluginDataItem[]>(pluginsData as unknown as PluginDataItem[]);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                await awaitStorage(cache);
                const cached = cache.items;
                const fetchedAt = cache.fetchedAt;
                if (cached && fetchedAt && Date.now() - Number(fetchedAt) < CACHE_TTL_MS) {
                    if (mounted) setItems(cached.filter((i: PluginDataItem) => !i.hidden) as unknown as PluginDataItem[]);
                }
            } catch { /* no cache yet */ }

            try {
                const r = await safeFetch(PUBLIC_PLUGINS_URL, { method: "GET", cache: "no-store" });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const data = await r.json();
                if (!Array.isArray(data) || data.length === 0) return;
                const filtered = data.filter((i: PluginDataItem) => !i.hidden) as unknown as PluginDataItem[];
                if (mounted) setItems(filtered);
                cache.items = data;
                cache.fetchedAt = Date.now();
            } catch {
                // Keep stale cache or bundled data
            }
        })();

        return () => { mounted = false; };
    }, []);

    return (
        <DataBrowser<PluginDataItem>
            title="Plugin Browser"
            items={items}
            onInstall={async (item) => {
                let url = item.installUrl;
                if (!url.endsWith("/")) url += "/";
                await VdPluginManager.installPlugin(url, true);
            }}
            searchKeys={[
                "name",
                "description",
                (obj) => obj.authors?.join(" ") ?? "",
            ]}
            sortOptions={{
                "Name (A-Z)": (a, b) => a.name.localeCompare(b.name),
                "Name (Z-A)": (a, b) => b.name.localeCompare(a.name),
            }}
            installAction={{
                label: "Install a plugin",
                fetchFn: (url) => VdPluginManager.installPlugin(url, true),
            }}
            isInstalled={(item) => {
                const url = item.installUrl.endsWith("/") ? item.installUrl : item.installUrl + "/";
                return url in VdPluginManager.plugins;
            }}
        />
    );
}
