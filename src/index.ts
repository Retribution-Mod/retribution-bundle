import { captureException, initSentry, overwriteDiscordSentry } from "@lib/sentry";
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
import { openAlert } from "@lib/ui/alerts";
import { showToast } from "@lib/ui/toasts";
import { findAssetId } from "@lib/api/assets";
import { patchSettings } from "@ui/settings";
import initQuote from "@core/message/quote";
import { semver } from "@metro/common";
import { AlertActionButton, AlertActions, AlertModal } from "@metro/common/components";
import { Platform } from "react-native";
import { createElement as h } from "react";
import { Linking } from "react-native";

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
    try {
    const loaderVersion = getLoaderVersion();
    if (loaderVersion && semver.lt(loaderVersion, "1.6.3")) {
        openAlert(
            "retribution-loader-outdated",
            h(AlertModal, {
                title: "Retribution Xposed Module Outdated",
                content: `Your Xposed module (v${loaderVersion}) is too old for this bundle. Open the Retribution Manager app and repatch Discord by reinstalling it.`,
                actions: h(AlertActions, null,
                    h(AlertActionButton, {
                        text: "Open Manager",
                        variant: "primary",
                        onPress: () => {
                            Linking.openURL("retribution://manager").catch(() => {
                                showToast("Unable to open Retribution Manager", findAssetId("XSmallIcon")!);
                            });
                        }
                    }),
                    h(AlertActionButton, { text: "Dismiss", variant: "secondary" })
                )
            })
        );
        logger.warn(`Xposed module ${loaderVersion} is below the required 1.6.3; bundle load halted`);
        return;
    }

    await awaitStorage(settings);

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
        initSentry();
        overwriteDiscordSentry();

        showToast("Safe mode is enabled. Plugins, themes, and fonts are disabled.", findAssetId("XSmallIcon")!);
        logger.log("Retribution is ready in safe mode!");
        return;
    }
    await Promise.all([
        initThemes(),
        patchSettings(),
        patchJsx(),
        initRetributionObject(),
        initFetchI18nStrings(),
        initSettings(),
        initFixes(),
        patchErrorBoundary(),
        updatePlugins(),
        initQuote()
    ]).then(
        u => u.forEach(f => f && lib.unload.push(f))
    );
    lib.unload.push(patchCommands());
    lib.unload.push(injectFluxInterceptor());
    window.bunny = lib;
    initDebugger();
    try {
        lib.unload.push(await VdPluginManager.initPlugins());
        if (Platform.OS === "android") {
            lib.unload.push(VdPluginManager.schedulePluginUpdateChecks());
        }
        await handlePendingDeepLink();
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error("Failed to initialize plugins or handle deep link", e);
        showToast(`Deep link failed: ${message}`, findAssetId("XSmallIcon")!);
    }
    if (Platform.OS === "android") {
        updateAllRepository()
            .then(() => initPlugins())
            .catch(e => {
                logger.error("Failed to refresh plugin repositories", e);
                initPlugins();
            });
        updateFonts();
    } else {
        initPlugins();
    }
    initSentry();
    overwriteDiscordSentry();
    logger.log("Retribution is ready!");
    } catch (e) {
        captureException(e);
        throw e;
    }
};
