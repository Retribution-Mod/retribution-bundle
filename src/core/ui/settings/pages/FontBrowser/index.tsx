import DataBrowser, { DataItem } from "@core/ui/components/DataBrowser";
import AddonCard from "@core/ui/components/AddonCard";
import FontPreview from "@core/ui/settings/pages/Fonts/components/FontPreview";
import { useProxy } from "@core/vd-compat/storage";
import { fonts, installFont } from "@lib/addons/fonts";
import { findAssetId } from "@lib/api/assets";
import { showToast } from "@lib/ui/toasts";
import { safeFetch } from "@lib/utils";
import { rawColors } from "@ui/color";
import { useEffect, useState } from "react";
import { Image } from "react-native";
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

const installedIconColor = rawColors.GREEN_500 || rawColors.GREEN_360 || "#43B581";
const previewText = "Sphinx of black quartz judge my vow 1234567890";

function FontBrowserCard({ item }: { item: FontDataItem }) {
    useProxy(fonts);
    const [fontUrl, setFontUrl] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await safeFetch(specUrl(item.family));
                const spec = await res.json();
                const url = Object.values<string>(spec?.main ?? {})[0];
                if (mounted) setFontUrl(url ?? null);
            } catch {
                if (mounted) setFontUrl(null);
            }
        })();
        return () => { mounted = false; };
    }, [item.family]);

    const installed = item.family in fonts && !!fonts[item.family];

    return (
        <AddonCard
            headerLabel={item.family}
            headerSublabel={item.category}
            descriptionLabel={item.subsets?.join(", ")}
            actions={[
                {
                    icon: installed
                        ? <Image
                            source={findAssetId("CheckmarkSmallIcon")!}
                            style={{ width: 20, height: 20, tintColor: installedIconColor }}
                            resizeMode="contain"
                        />
                        : "DownloadIcon",
                    disabled: installed,
                    onPress: async () => {
                        if (installed) return;
                        try {
                            await installFont(specUrl(item.family), true);
                            showToast(`Installed ${item.family}`, findAssetId("CheckmarkSmallIcon")!);
                        } catch (e) {
                            showToast(e instanceof Error ? e.message : String(e), findAssetId("XSmallIcon")!);
                        }
                    },
                },
            ]}
        >
            {fontUrl && <FontPreview family={fontUrl} text={previewText} height={64} />}
        </AddonCard>
    );
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
            CardComponent={FontBrowserCard as any}
        />
    );
}
