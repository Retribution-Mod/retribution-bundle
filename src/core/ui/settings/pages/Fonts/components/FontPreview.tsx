import { lazyDestructure } from "@lib/utils/lazy";
import { createStyles, TextStyleSheet } from "@lib/ui/styles";
import { tokens } from "@metro/common";
import { Text } from "@metro/common/components";
import { findByProps } from "@metro";
import { useMemo, useState } from "react";
import { PixelRatio, View } from "react-native";
import { WebView } from "react-native-webview";
import previewHtml from "../preview.html";

const { useToken } = lazyDestructure(() => findByProps("useToken"));

const useStyles = createStyles({
    full: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%"
    }
});

interface FontPreviewProps {
    family: string;
    text: string;
    height?: number;
}

export default function FontPreview({ family, text, height = 64 }: FontPreviewProps) {
    const [loaded, setLoaded] = useState(false);
    const styles = useStyles();

    const TEXT_DEFAULT = useToken(tokens.colors.TEXT_DEFAULT);
    const { fontSize } = TextStyleSheet["text-md/medium"];

    const props = useMemo(() => ({
        family,
        size: fontSize! * PixelRatio.getFontScale(),
        color: TEXT_DEFAULT,
        text,
    }), [family, fontSize, TEXT_DEFAULT, text]);

    if (!family) {
        return (
            <View style={{ width: "100%", height, justifyContent: "center", alignItems: "center" }}>
                <Text color="text-muted" variant="heading-lg/semibold">
                    Preview unavailable
                </Text>
            </View>
        );
    }

    return <View style={{ width: "100%", height }}>
        <WebView
            onMessage={() => setLoaded(true)}
            source={{
                html: previewHtml.replace("$$props", JSON.stringify(props))
            }}
            javaScriptEnabled
            scrollEnabled={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            pointerEvents="none"
            style={[styles.full, { backgroundColor: "transparent", opacity: Number(loaded) }]}
        />
        {!loaded && <View style={[styles.full, { justifyContent: "center", alignItems: "center" }]}>
            <Text color="text-muted" variant="heading-lg/semibold">
                Loading...
            </Text>
        </View>}
    </View>;
}
