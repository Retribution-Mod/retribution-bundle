import { createFileBackend, createMMKVBackend, createStorage, wrapSync } from "@core/vd-compat/storage";
import { getLoaderConfigPath } from "@lib/api/native/loader";

export type TimestampMode = "local" | "calendar" | "relative" | "iso" | "custom";

export interface TimestampSettings {
    mode: TimestampMode;
    customFormat: string;
    hideDateIfToday: boolean;
}

export interface Settings {
    debuggerUrl: string;
    enableAutoDebugger?: boolean;
    developerSettings: boolean;
    enableDiscordDeveloperSettings: boolean;
    safeMode?: {
        enabled: boolean;
        currentThemeId?: string;
    };
    enableEvalCommand?: boolean;
    timestamps?: TimestampSettings;
}

export interface LoaderConfig {
    customLoadUrl: {
        enabled: boolean;
        url: string;
    };
    loadReactDevTools: boolean;
}

export const settings = wrapSync(createStorage<Settings>(createMMKVBackend("VENDETTA_SETTINGS")));

export const loaderConfig = wrapSync(createStorage<LoaderConfig>(
    createFileBackend(getLoaderConfigPath(), {
        customLoadUrl: {
            enabled: false,
            url: "http://localhost:4040/Retribution.js"
        }
    })
));
