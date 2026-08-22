import { after } from "@lib/api/patcher";
import { TableRow } from "@metro/common/components";
import { findByNameLazy, findByPropsLazy } from "@metro/wrappers";
import { registeredSections } from "@ui/settings";
import { Strings } from "@core/i18n";
import { CustomPageRenderer, wrapOnPress } from "./shared";
import { findInReactTree } from "@lib/utils";

const settingConstants = findByPropsLazy("SETTING_RENDERER_CONFIG");
const createListModule = findByPropsLazy("createList");
const SettingsOverviewScreen = findByNameLazy("SettingsOverviewScreen", false);



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

    // Prefer the specific SettingsOverviewScreen patch; it only fires for the top-level
    // settings screen. Fall back to the generic createList patch only if the component
    // cannot be resolved.
    try {
        if (SettingsOverviewScreen) {
            unpatches.push(after("default", SettingsOverviewScreen, (_, ret) => {
                const sectionNode = findInReactTree(ret, i => i.props?.sections);
                if (!sectionNode) return;

                const { sections } = sectionNode.props;

                // Insert Retribution at the very top of the settings list
                let index = 0;

                Object.keys(registeredSections).forEach(sect => {
                    const rows = registeredSections[sect];
                    if (!rows?.length) return;

                    const alreadyExists = sections.some((s: any) => s.label === sect);
                    if (!alreadyExists) {
                        sections.splice(index++, 0, {
                            label: sect,
                            title: sect,
                            settings: rows.map(a => a.key)
                        });
                    }
                });
            }));
        } else if (createListModule) {
            unpatches.push(after("createList", createListModule, function(args, ret) {
                const [config] = args;

                if (config?.sections && Array.isArray(config.sections)) {
                    const sections = config.sections;

                    // Insert Retribution at the very top of the settings list
                    let index = 0;

                    Object.keys(registeredSections).forEach(sect => {
                        const rows = registeredSections[sect];
                        if (!rows?.length) return;

                        const alreadyExists = sections.some((s: any) => s.label === sect);
                        if (!alreadyExists) {
                            sections.splice(index++, 0, {
                                label: sect,
                                title: sect,
                                settings: rows.map(a => a.key)
                            });
                        }
                    });
                }
                return ret;
            }));
        }
    } catch {
        // If the SettingsOverviewScreen patch throws, fall back to the generic list patch.
        if (createListModule) {
            unpatches.push(after("createList", createListModule, function(args, ret) {
                const [config] = args;

                if (config?.sections && Array.isArray(config.sections)) {
                    const sections = config.sections;

                    let index = 0;

                    Object.keys(registeredSections).forEach(sect => {
                        const rows = registeredSections[sect];
                        if (!rows?.length) return;

                        const alreadyExists = sections.some((s: any) => s.label === sect);
                        if (!alreadyExists) {
                            sections.splice(index++, 0, {
                                label: sect,
                                title: sect,
                                settings: rows.map(a => a.key)
                            });
                        }
                    });
                }
                return ret;
            }));
        }
    }
};
