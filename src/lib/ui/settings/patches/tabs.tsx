import { after } from "@lib/api/patcher";
import { TableRow } from "@metro/common/components";
import { findByPropsLazy } from "@metro/wrappers";
import { registeredSections } from "@ui/settings";
import { Strings } from "@core/i18n";
import { CustomPageRenderer, wrapOnPress } from "./shared";

const settingConstants = findByPropsLazy("SETTING_RENDERER_CONFIG");
const createListModule = findByPropsLazy("createList");



export function patchTabsUI(unpatches: (() => void | boolean)[]) {
    const getRows = () => Object.values(registeredSections)
        .flatMap(sect => sect.map(row => ({
            [row.key]: {
                type: "pressable",
                // title was renamed to useTitle, both are here for compatibility (thanks kmiioo) https://codeberg.org/raincord/rain/pulls/52
                useTitle: row.title,
                title: row.title,
                icon: row.icon,
                IconComponent: () => <TableRow.Icon source={row.icon} />,
                usePredicate: row.usePredicate,
                useTrailing: row.useTrailing,
                onPress: wrapOnPress(row.onPress, null, row.render, row.title()),
                withArrow: true,
                ...row.rawTabsConfig
            }
        })))
        .reduce((a, c) => Object.assign(a, c));

    const origRendererConfig = settingConstants.SETTING_RENDERER_CONFIG;
    let rendererConfigValue = settingConstants.SETTING_RENDERER_CONFIG;

    Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
        enumerable: true,
        configurable: true,
        get: () => ({
            ...rendererConfigValue,
            VendettaCustomPage: {
                type: "route",
                useTitle: () => Strings.BUNNY,
                title: () => Strings.BUNNY,
                screen: {
                    route: "VendettaCustomPage",
                    getComponent: () => CustomPageRenderer
                }
            },
            BUNNY_CUSTOM_PAGE: {
                type: "route",
                useTitle: () => Strings.BUNNY,
                title: () => Strings.BUNNY,
                screen: {
                    route: "BUNNY_CUSTOM_PAGE",
                    getComponent: () => CustomPageRenderer
                }
            },
            ...getRows()
        }),
        set: v => rendererConfigValue = v,
    });

    unpatches.push(() => {
        Object.defineProperty(settingConstants, "SETTING_RENDERER_CONFIG", {
            value: origRendererConfig,
            writable: true,
            get: undefined,
            set: undefined
        });
    });

    if (createListModule) {
        unpatches.push(after("createList", createListModule, function(args, ret) {
            const [config] = args;
            if (!config?.sections || !Array.isArray(config.sections)) return ret;

            // createList is shared across every settings sub-page, not just the
            // top-level overview. SettingsOverviewScreen's default export can't be
            // patched directly (Discord captures a direct reference internally
            // before our patch runs), so scope by call stack instead — verified
            // live that only the top-level screen's call chain includes a
            // SettingsOverviewScreen frame.
            const stack = new Error().stack ?? "";
            if (!stack.includes("SettingsOverviewScreen")) return ret;

            const sections = config.sections;

            // Append custom sections at the bottom, after Discord's native categories.
            Object.keys(registeredSections).forEach(sect => {
                const rows = registeredSections[sect];
                if (!rows?.length) return;

                const alreadyExists = sections.some((s: any) => s.label === sect);
                if (!alreadyExists) {
                    sections.push({
                        label: sect,
                        title: sect,
                        settings: rows.map(a => a.key)
                    });
                }
            });
            return ret;
        }));
    }
};
