import { formatString, Strings } from "@core/i18n";
import AddonPage from "@core/ui/components/AddonPage";
import ThemeBrowser from "@core/ui/settings/pages/ThemeBrowser";
import ThemeCard from "@core/ui/settings/pages/Themes/ThemeCard";
import { useProxy } from "@core/vd-compat/storage";
import { getCurrentTheme, installTheme, themes, VdThemeInfo } from "@lib/addons/themes";
import { colorsPref } from "@lib/addons/themes/colors/preferences";
import { updateBunnyColor } from "@lib/addons/themes/colors/updater";
import { Author } from "@lib/addons/types";
import { findAssetId } from "@lib/api/assets";
import { settings } from "@lib/api/settings";
import { useObservable } from "@lib/api/storage";
import { ActionSheet, BottomSheetTitleHeader, Button, TableRowGroup, TableRowIcon, TableSwitchRow, TableRow, TableRadioGroup, TableRadioRow } from "@metro/common/components";
import { NavigationNative } from "@metro/common";
import { View } from "react-native";

export default function Themes() {
    useProxy(settings);
    useProxy(themes);
    const navigation = NavigationNative.useNavigation();

    return (
        <AddonPage<VdThemeInfo>
            title={Strings.THEMES}
            searchKeywords={[
                "data.name",
                "data.description",
                p => p.data.authors?.map((a: Author) => a.name).join(", ") ?? ""
            ]}
            sortOptions={{
                "Name (A-Z)": (a, b) => a.data.name.localeCompare(b.data.name),
                "Name (Z-A)": (a, b) => b.data.name.localeCompare(a.data.name)
            }}
            installAction={{
                label: "Install a theme",
                fetchFn: installTheme
            }}
            items={Object.values(themes)}
            safeModeHint={{
                message: formatString("SAFE_MODE_NOTICE_THEMES", { enabled: Boolean(settings.safeMode?.currentThemeId) }),
                footer: settings.safeMode?.currentThemeId && <Button
                    size="small"
                    text={Strings.DISABLE_THEME}
                    onPress={() => delete settings.safeMode?.currentThemeId}
                    style={{ marginTop: 8 }}
                />
            }}
            ListHeaderComponent={() => (
                <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 12 }}>
                    <Button
                        size="lg"
                        text="Browse Public Themes"
                        icon={findAssetId("CompassIcon")}
                        onPress={() => {
                            navigation.push("BUNNY_CUSTOM_PAGE", {
                                title: "Public Theme Browser",
                                render: ThemeBrowser,
                            });
                        }}
                    />
                </View>
            )}
            CardComponent={ThemeCard}
            OptionsActionSheetComponent={() => {
                useObservable([colorsPref]);

                return <ActionSheet>
                    <BottomSheetTitleHeader title="Options" />
                    <View style={{ paddingVertical: 20, gap: 12 }}>
                        <TableRadioGroup
                            title="Override Theme Type"
                            defaultValue={colorsPref.type ?? "auto"}
                            hasIcons={true}
                            onChange={type => {
                                colorsPref.type = type !== "auto" ? type as "dark" | "light" : undefined;
                                getCurrentTheme()?.data && updateBunnyColor(getCurrentTheme()!.data!, { update: true });
                            }}
                        >
                            <TableRadioRow icon={<TableRowIcon source={findAssetId("RobotIcon")} />} label="Auto" value="auto" />
                            <TableRadioRow icon={<TableRowIcon source={findAssetId("ThemeDarkIcon")} />} label="Dark" value="dark" />
                            <TableRadioRow icon={<TableRowIcon source={findAssetId("ThemeLightIcon")} />} label="Light" value="light" />
                        </TableRadioGroup>

                        <TableRowGroup title="Settings">
                            <TableSwitchRow
                                label="Show Chat Background"
                                subLabel="Shows or hides the theme's background image in chat"
                                icon={<TableRow.Icon source={findAssetId("ImageIcon")} />}
                                value={colorsPref.customBackground !== "hidden"}
                                onValueChange={(value) => {
                                    colorsPref.customBackground = value ? null : "hidden";
                                }}
                            />
                        </TableRowGroup>
                    </View>
                </ActionSheet>;
            }}
        />
    );
}