import AddonCard from "@core/ui/components/AddonCard";
import AddonPage from "@core/ui/components/AddonPage";
import { findAssetId } from "@lib/api/assets";
import { showToast } from "@lib/ui/toasts";
import { rawColors } from "@ui/color";
import { Image } from "react-native";

export interface DataItem {
    name: string;
    description?: string;
    authors?: string[];
    status?: string;
}

export interface DataBrowserProps<T extends DataItem> {
    title: string;
    items: T[];
    onInstall: (item: T) => Promise<void> | void;
    searchKeys: Array<string | ((obj: T) => string)>;
    sortOptions?: Record<string, (a: T, b: T) => number>;
    installAction?: {
        label?: string;
        fetchFn?: (url: string) => Promise<void>;
        onPress?: () => void;
    };
    isInstalled?: (item: T) => boolean;
}

export default function DataBrowser<T extends DataItem>({
    title,
    items,
    onInstall,
    searchKeys,
    sortOptions,
    installAction,
    isInstalled,
}: DataBrowserProps<T>) {
    const installedIconColor = rawColors.GREEN_500 || rawColors.GREEN_360 || "#43B581";

    function CardComponent({ item }: { item: T; result: any }) {
        const installed = isInstalled?.(item) ?? false;
        const sublabel = [item.authors?.join(", "), item.status].filter(Boolean).join(" • ");

        return (
            <AddonCard
                headerLabel={item.name}
                headerSublabel={sublabel || undefined}
                descriptionLabel={item.description}
                actions={[
                    {
                        icon: installed
                            ? <Image
                                source={findAssetId("CheckmarkSmallIcon")!}
                                style={{ width: 20, height: 20, tintColor: installedIconColor }}
                                resizeMode="contain"
                            />
                            : "DownloadIcon",
                        disabled: installed || item.status === "broken" || item.status === "incompatible",
                        onPress: async () => {
                            if (installed) return;
                            try {
                                await onInstall(item);
                                showToast(`Installed ${item.name}`, findAssetId("CheckmarkSmallIcon")!);
                            } catch (e) {
                                showToast(e instanceof Error ? e.message : String(e), findAssetId("XSmallIcon")!);
                            }
                        },
                    },
                ]}
            />
        );
    }

    return (
        <AddonPage<T>
            title={title}
            items={items}
            searchKeywords={searchKeys}
            sortOptions={sortOptions}
            installAction={installAction}
            CardComponent={CardComponent as any}
        />
    );
}
