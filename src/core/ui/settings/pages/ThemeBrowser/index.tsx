import DataBrowser from "@core/ui/components/DataBrowser";
import { useProxy } from "@core/vd-compat/storage";
import { installTheme, themes } from "@lib/addons/themes";
import themesData from "@assets/data/themes-data.json";

interface ThemeDataItem {
    name: string;
    description?: string;
    authors?: string[];
    status?: string;
    installUrl: string;
    tags?: string[];
}

export default function ThemeBrowser() {
    useProxy(themes);

    return (
        <DataBrowser<ThemeDataItem>
            title="Theme Browser"
            items={themesData as ThemeDataItem[]}
            onInstall={async (item) => {
                await installTheme(item.installUrl);
            }}
            searchKeys={[
                "name",
                "description",
                (obj) => obj.authors?.join(" ") ?? "",
                (obj) => obj.tags?.join(" ") ?? "",
            ]}
            sortOptions={{
                "Name (A-Z)": (a, b) => a.name.localeCompare(b.name),
                "Name (Z-A)": (a, b) => b.name.localeCompare(a.name),
            }}
            installAction={{
                label: "Install a theme",
                fetchFn: (url) => installTheme(url),
            }}
            isInstalled={(item) => item.installUrl in themes}
        />
    );
}
