import { awaitStorage } from "@core/vd-compat/storage";
import { settings } from "@lib/api/settings";
import patchErrorBoundary from "@core/debug/patches/patchErrorBoundary";
import initFixes from "@core/fixes";
import { initFetchI18nStrings } from "@core/i18n";
import initSettings from "@core/ui/settings";
import { initRetributionObject } from "@core/vd-compat/api";
import { VdPluginManager } from "@core/vd-compat/plugins";
import { installFont, updateFonts } from "@lib/addons/fonts";
import { initPlugins, updateAllRepository, updatePlugins } from "@lib/addons/plugins";
import { fetchTheme, initThemes } from "@lib/addons/themes";
import { patchCommands } from "@lib/api/commands";
import { initDebugger } from "@lib/api/debug";
import { injectFluxInterceptor } from "@lib/api/flux";
import { fileExists, readFile, removeFile } from "@lib/api/native/fs";
import { getLoaderVersion } from "@lib/api/native/loader";
import { patchJsx } from "@lib/api/react/jsx";
import { logger } from "@lib/utils/logger";
import { showToast } from "@lib/ui/toasts";
import { findAssetId } from "@lib/api/assets";
import { patchSettings } from "@ui/settings";
import { semver } from "@metro/common";
import { Alert, Linking } from "react-native";

import * as lib from "./lib";

type DeepLinkPayload = {
    type: "plugin" | "theme" | "font";
    url: string;
};

async function handlePendingDeepLink() {
    if (!await fileExists("deeplink.json")) return;

    const payload = JSON.parse(await readFile("deeplink.json")) as DeepLinkPayload;
    await removeFile("deeplink.json");

    if (typeof payload.url !== "string") throw new Error("Invalid deep link URL");

    switch (payload.type) {
        case "plugin":
            await VdPluginManager.installPlugin(payload.url);
            showToast(`Installed plugin from ${payload.url}`, findAssetId("CheckmarkSmallIcon")!);
            break;
        case "theme":
            await fetchTheme(payload.url, true);
            showToast("Theme applied", findAssetId("CheckmarkSmallIcon")!);
            break;
        case "font":
            await installFont(payload.url, true);
            showToast("Font applied", findAssetId("CheckmarkSmallIcon")!);
            break;
        default:
            throw new Error("Invalid deep link type");
    }
}

export default async () => {
    const loaderVersion = getLoaderVersion();
    if (loaderVersion && semver.lt(loaderVersion, "1.6.3")) {
        Alert.alert(
            "Retribution Xposed Module Outdated",
            `Your Xposed module (v${loaderVersion}) is too old for this bundle. Open the Retribution Manager app and repatch Discord by reinstalling it.`,
            [
                {
                    text: "Open Manager",
                    onPress: () => {
                        Linking.openURL("retribution://manager").catch(() => {
                            showToast("Unable to open Retribution Manager", findAssetId("XSmallIcon")!);
                        });
                    },
                    style: "default"
                },
                { text: "Dismiss", style: "cancel" }
            ],
            { cancelable: false }
        );
        logger.warn(`Xposed module ${loaderVersion} is below the required 1.6.3; bundle load halted`);
        return;
    }

    // Wait briefly for settings to load; safe-mode fast path is a nice-to-have,
    // so don't block the app if the storage backend is slow/failing.
    try {
        await Promise.race([
            awaitStorage(settings),
            new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Settings storage load timed out")), 500))
        ]);
    } catch (e) {
        logger.warn("Settings storage did not load in time; continuing without safe-mode fast path", e);
    }

    if (settings.safeMode?.enabled) {
        logger.warn("Safe mode is enabled; skipping plugins, themes, fonts, and heavy patches.");

        await Promise.all([
            initRetributionObject(),
            initFetchI18nStrings(),
            patchSettings(),
            patchJsx(),
            initSettings(),
            initFixes(),
            patchErrorBoundary()
        ]).then(u => u.forEach(f => f && lib.unload.push(f)));

        window.bunny = lib;
        initDebugger();

        showToast("Safe mode is enabled. Plugins, themes, and fonts are disabled.", findAssetId("XSmallIcon")!);
        logger.log("Retribution is ready in safe mode!");
        return;
    }

    // Load core UI in parallel, then apply non-critical patches in the background
    await Promise.all([
        initThemes(),
        patchSettings(),
        patchJsx(),
        initRetributionObject(),
        initFetchI18nStrings(),
        initSettings(),
        initFixes(),
        patchErrorBoundary(),
        updatePlugins()
    ]).then(
        // Push them all to unloader
        u => u.forEach(f => f && lib.unload.push(f))
    );

    // Apply non-critical patches after first render
    patchCommands().then(f => f && lib.unload.push(f));
    injectFluxInterceptor().then(f => f && lib.unload.push(f));

    // Assign window objects
    // window.bunny is kept for Bunny-spec plugins; window.retribution is the unified API
    window.bunny = lib;

    // Start debugger
    initDebugger();

    // Once done, load Retribution plugins (polymanifest format)
    try {
        lib.unload.push(await VdPluginManager.initPlugins());
        lib.unload.push(VdPluginManager.schedulePluginUpdateChecks());
        await handlePendingDeepLink();
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error("Failed to initialize plugins or handle deep link", e);
        showToast(`Deep link failed: ${message}`, findAssetId("XSmallIcon")!);
    }

    // And then, load Bunny-spec plugins after repository data is refreshed in the background
    updateAllRepository()
        .then(() => initPlugins())
        .catch(e => {
            logger.error("Failed to refresh plugin repositories", e);
            initPlugins();
        });

    // Update the fonts
    updateFonts();

    // We good :)
    logger.log("Retribution is ready!");
};
