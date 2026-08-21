import DataBrowser, { DataItem } from "@core/ui/components/DataBrowser";
import { useProxy } from "@core/vd-compat/storage";
import { fonts, installFont } from "@lib/addons/fonts";
import fontsData from "@assets/data/fonts-data.json";

interface FontDataItem extends DataItem {
    family: string;
    category?: string;
    subsets?: string[];
    variants?: string[];
}

function specUrl(family: string) {
    return `https://bunny-google-fonts.vercel.app/api/spec?font=${encodeURIComponent(family)}`;
}

export default function FontBrowser() {
    useProxy(fonts);
    const items = (fontsData as unknown as FontDataItem[]).map((f) => ({
        ...f,
        name: f.family,
        description: f.category,
    }));

    return (
        <DataBrowser<FontDataItem>
            title="Font Browser"
            items={items}
            onInstall={async (item) => {
                await installFont(specUrl(item.family), true);
            }}
            searchKeys={[
                "family",
                "category",
                (obj) => obj.subsets?.join(" ") ?? "",
            ]}
            sortOptions={{
                "Name (A-Z)": (a, b) => a.family.localeCompare(b.family),
                "Name (Z-A)": (a, b) => b.family.localeCompare(a.family),
            }}
            installAction={{
                label: "Install a font",
                fetchFn: (url) => installFont(url, true),
            }}
            isInstalled={(item) => item.family in fonts && !!fonts[item.family]}
        />
    );
}
