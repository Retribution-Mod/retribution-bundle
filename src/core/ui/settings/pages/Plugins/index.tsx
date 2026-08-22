import { Strings } from "@core/i18n";
import AddonPage from "@core/ui/components/AddonPage";
import PluginDataBrowser from "@core/ui/settings/pages/PluginDataBrowser";
import PluginCard from "@core/ui/settings/pages/Plugins/components/PluginCard";
import { VdPluginManager } from "@core/vd-compat/plugins";
import { useProxy } from "@core/vd-compat/storage";
import { isCorePlugin, isPluginInstalled, pluginSettings, registeredPlugins } from "@lib/addons/plugins";
import { Author } from "@lib/addons/types";
import { findAssetId } from "@lib/api/assets";
import { settings } from "@lib/api/settings";
import { useObservable } from "@lib/api/storage";
import { NavigationNative } from "@metro/common";
import { Button, Card, Text } from "@metro/common/components";
import { ComponentProps } from "react";
import { View } from "react-native";

import { UnifiedPluginModel } from "./models";
import unifyBunnyPlugin from "./models/bunny";
import unifyVdPlugin from "./models/vendetta";

interface PluginPageProps extends Partial<ComponentProps<typeof AddonPage<UnifiedPluginModel>>> {
    useItems: () => unknown[];
}

function PluginPage(props: PluginPageProps) {
    const items = props.useItems();

    return <AddonPage<UnifiedPluginModel>
        CardComponent={PluginCard}
        title={Strings.PLUGINS}
        searchKeywords={[
            "name",
            "description",
            p => p.authors?.map(
                (a: Author | string) => typeof a === "string" ? a : a.name
            ).join() || ""
        ]}
        sortOptions={{
            "Name (A-Z)": (a, b) => a.name.localeCompare(b.name),
            "Name (Z-A)": (a, b) => b.name.localeCompare(a.name),
            "Enabled": (a, b) => Number(b.isEnabled()) - Number(a.isEnabled()),
            "Disabled": (a, b) => Number(a.isEnabled()) - Number(b.isEnabled())

        }}
        safeModeHint={{ message: Strings.SAFE_MODE_NOTICE_PLUGINS }}
        items={items}
        {...props}
    />;
}

export default function Plugins() {
    useProxy(settings);
    const navigation = NavigationNative.useNavigation();

    return <PluginPage
        useItems={() => {
            useProxy(VdPluginManager.plugins);
            useObservable([pluginSettings]);

            const vdPlugins = Object.values(VdPluginManager.plugins).map(unifyVdPlugin);
            const bnPlugins = [...registeredPlugins.values()].filter(p => isPluginInstalled(p.id) && !isCorePlugin(p.id)).map(unifyBunnyPlugin);

            return [...vdPlugins, ...bnPlugins];
        }}
        ListHeaderComponent={() => (
            <View style={{ marginVertical: 12, marginHorizontal: 10, gap: 12 }}>
                <Card border="strong">
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
                        <View style={{ gap: 6, flexShrink: 1 }}>
                            <Text variant="heading-md/bold">Browser Attribution</Text>
                            <Text variant="text-sm/medium" color="text-muted">
                                Public Plugin Browser is attributed to Arthur777 on discord, Purple Eyes on GitHub
                            </Text>
                        </View>
                    </View>
                </Card>
                <View style={{ alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <Button
                        size="lg"
                        text="Browse Public Plugins"
                        icon={findAssetId("CompassIcon")}
                        onPress={() => {
                            navigation.push("BUNNY_CUSTOM_PAGE", {
                                title: "Public Plugin Browser",
                                render: PluginDataBrowser,
                            });
                        }}
                    />
                </View>
            </View>
        )}
        installAction={{
            label: "Install a plugin",
            fetchFn: (url: string) => VdPluginManager.installPlugin(url)
        }}
    />;
}
