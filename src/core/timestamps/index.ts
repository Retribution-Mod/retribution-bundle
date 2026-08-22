import { settings } from "@lib/api/settings";
import type { TimestampMode } from "@lib/api/settings";
import { before, after } from "@lib/api/patcher";
import { findByNameLazy } from "@metro/wrappers";
import { createSimpleFilter } from "@metro/factories";
import { findAllModule, findModule } from "@metro/finders";
import { requireModule } from "@metro/internals/modules";
import moment from "moment";

const DEFAULT_CUSTOM_FORMAT = "dddd, MMMM Do YYYY, h:mm:ss a";

function ensureSettings() {
    if (!settings.timestamps) {
        settings.timestamps = {
            mode: "local",
            customFormat: DEFAULT_CUSTOM_FORMAT,
            hideDateIfToday: false
        };
    }
    settings.timestamps.mode ??= "local";
    settings.timestamps.customFormat ??= DEFAULT_CUSTOM_FORMAT;
    settings.timestamps.hideDateIfToday ??= false;
}

export function formatTimestamp(value: any, mode?: TimestampMode): string {
    ensureSettings();

    const cfg = settings.timestamps!;
    const selectedMode = mode ?? cfg.mode;

    try {
        const parsed = moment(value);
        if (!parsed.isValid()) return String(value ?? "");

        if (
            cfg.hideDateIfToday &&
            (selectedMode === "calendar" || selectedMode === "custom") &&
            parsed.isSame(moment(), "day")
        ) {
            return parsed.format("LT");
        }

        switch (selectedMode) {
            case "calendar":
                return parsed.calendar();
            case "relative":
                return parsed.fromNow();
            case "iso":
                return parsed.toISOString();
            case "custom":
                return parsed.format(cfg.customFormat || DEFAULT_CUSTOM_FORMAT);
            case "local":
            default:
                return parsed.format("L, LTS");
        }
    } catch {
        return String(value ?? "");
    }
}

function wrapTimestamp(original: any): any {
    const getFormatted = () => formatTimestamp(original);
    if (typeof Proxy === "undefined") return { ...original, format: getFormatted };
    return new Proxy(original, {
        get(target, prop) {
            if (prop === "format" || prop === "calendar" || prop === "fromNow" || prop === "toISOString" || prop === "toString" || prop === "toJSON") {
                return getFormatted;
            }
            const value = target[prop];
            return typeof value === "function" ? value.bind(target) : value;
        }
    });
}

function parseTimestamp(value: any): any {
    if (value && typeof value.format === "function") return value;
    return moment(value);
}

function findTimestampModule(): any | undefined {
    const filter = createSimpleFilter((m: any) => {
        if (typeof m !== "object" || m == null) return false;
        return Object.values(m).some((v: any) => {
            if (typeof v === "string") return v.includes("MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL");
            if (typeof v === "function") {
                const s = v.toString();
                return s.includes("MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL") || s.includes("MESSAGE_CREATED_TIMESTAMP_A11Y_LABEL");
            }
            return false;
        });
    }, "retribution-timestamp-component");

    const found = findAllModule(filter);
    for (const { id, defaultExport } of found) {
        const mod = requireModule(id);
        if (mod && (defaultExport ? mod.default : mod)) return mod;
    }
    return undefined;
}

function patchTimestampComponent(): (() => void) | undefined {
    const module = findTimestampModule();
    if (!module) {
        console.log("[Timestamps] timestamp component module not found");
        return;
    }

    return before("default", module, ([props]: any[]) => {
        try {
            if (props?.timestamp != null) {
                const parsed = parseTimestamp(props.timestamp);
                props.timestamp = wrapTimestamp(parsed);
            }
            if (props?.editedTimestamp != null) {
                const parsed = parseTimestamp(props.editedTimestamp);
                props.editedTimestamp = wrapTimestamp(parsed);
            }
        } catch {
            // leave timestamps untouched
        }
    });
}

function patchRowManager(): (() => void) | undefined {
    const RowManager = findByNameLazy("RowManager");
    if (!RowManager) {
        console.log("[Timestamps] RowManager not found");
        return;
    }

    const unpatches: (() => void)[] = [];

    unpatches.push(before("generate", RowManager.prototype, ([row]: any[]) => {
        try {
            if (row.rowType === 1) {
                const parsed = parseTimestamp(row.message.timestamp);
                row.message.__customTimestamp = wrapTimestamp(parsed);
            } else if (row.rowType === "day") {
                const parsed = moment(row.text, "LL");
                if (settings.timestamps?.hideDateIfToday && parsed.isValid() && parsed.isSame(moment(), "day")) {
                    row.text = "Today";
                } else {
                    row.text = formatTimestamp(parsed);
                }
            }
        } catch {
            // leave this row's timestamp untouched
        }
    }));

    unpatches.push(after("generate", RowManager.prototype, ([row]: any[], result: any) => {
        try {
            if (row.rowType !== 1) return;
            if (row.message?.__customTimestamp && result?.message?.timestamp) {
                result.message.timestamp = row.message.__customTimestamp;
            }
        } catch {
            // leave the default timestamp
        }
    }));

    return () => unpatches.forEach(u => u?.());
}

export function initTimestamps() {
    ensureSettings();
    const unpatches: ((() => void) | undefined)[] = [];
    unpatches.push(patchTimestampComponent());
    unpatches.push(patchRowManager());
    return () => unpatches.forEach(u => u?.());
}
