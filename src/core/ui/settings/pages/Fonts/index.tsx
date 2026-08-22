import { Strings } from "@core/i18n";
import AddonPage from "@core/ui/components/AddonPage";
import FontBrowser from "@core/ui/settings/pages/FontBrowser";
import FontEditor from "@core/ui/settings/pages/Fonts/FontEditor";
import { useProxy } from "@core/vd-compat/storage";
import { FontDefinition, fonts } from "@lib/addons/fonts";
import { settings } from "@lib/api/settings";
import { findAssetId } from "@lib/api/assets";
import { NavigationNative } from "@metro/common";
import { Button } from "@metro/common/components";
import { View } from "react-native";

import FontCard from "./FontCard";

export default function Fonts() {
    useProxy(settings);
    useProxy(fonts);

    const navigation = NavigationNative.useNavigation();

    return (
        <AddonPage<FontDefinition>
            title={Strings.FONTS}
            searchKeywords={["name", "description"]}
            sortOptions={{
                "Name (A-Z)": (a, b) => a.name.localeCompare(b.name),
                "Name (Z-A)": (a, b) => b.name.localeCompare(a.name)
            }}
            items={Object.values(fonts)}
            safeModeHint={{ message: Strings.SAFE_MODE_NOTICE_FONTS }}
            ListHeaderComponent={() => (
                <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 12 }}>
                    <Button
                        size="lg"
                        text="Browse Google Fonts"
                        icon={findAssetId("CompassIcon")}
                        onPress={() => {
                            navigation.push("BUNNY_CUSTOM_PAGE", {
                                title: "Google Font Browser",
                                render: FontBrowser,
                            });
                        }}
                    />
                </View>
            )}
            CardComponent={FontCard}
            installAction={{
                label: "Install a font",
                onPress: () => {
                    navigation.push("BUNNY_CUSTOM_PAGE", {
                        title: "Import Font",
                        render: () => <FontEditor />
                    });
                }
            }}
        />
    );
}
