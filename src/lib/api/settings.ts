import { createFileBackend, createMMKVBackend, createStorage, wrapSync } from "@core/vd-compat/storage";
import { getLoaderConfigPath } from "@lib/api/native/loader";

export type QuoteTimestampStyle = "t" | "T" | "d" | "D" | "f" | "F" | "R";

export interface QuoteSettings {
    includeAuthor?: boolean;
    includeDay?: boolean;
    includeTimestamp?: boolean;
    timestampStyle?: QuoteTimestampStyle;
    includeQuotedMessage?: boolean;
    replyPrefix?: string;
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
    quote?: QuoteSettings;
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
