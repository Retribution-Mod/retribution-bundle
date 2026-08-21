import { lazyDestructure, proxyLazy } from "@lib/utils/lazy";
import { findByProps, findByPropsLazy } from "@metro/wrappers";
import { isSemanticColor, resolveSemanticColor } from "@ui/color";
import { TextStyles } from "@ui/types";
import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from "react-native";

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

const Styles = findByPropsLazy("createStyles");

export const { ThemeContext } = lazyDestructure(() => findByProps("ThemeContext"), { hint: "object" });
export const { TextStyleSheet } = lazyDestructure(() => findByProps("TextStyleSheet")) as unknown as {
    TextStyleSheet: Record<TextStyles, TextStyle>;
};


export function createStyles<T extends NamedStyles<T>>(sheet: T | ((props: any) => T)): () => T {
    return proxyLazy(() => Styles.createStyles(sheet));
}


export function createLegacyClassComponentStyles<T extends NamedStyles<T>>(sheet: T | ((props: any) => T)): (ctxt: typeof ThemeContext) => T {
    return proxyLazy(() => Styles.createLegacyClassComponentStyles(sheet));
}

/**
 * Reimplementation of Discord's createThemedStyleSheet, which was removed since 204201
 * Not exactly a 1:1 reimplementation, but sufficient to keep compatibility with existing plugins
 * @deprecated Use createStyles or createLegacyClassComponentStyles instead
*/

export function createThemedStyleSheet<T extends StyleSheet.NamedStyles<T>>(sheet: T) {
    for (const key in sheet) {
        // @ts-ignore
        sheet[key] = new Proxy(StyleSheet.flatten(sheet[key]), {
            get(target, prop, receiver) {
                const res = Reflect.get(target, prop, receiver);
                return isSemanticColor(res) ? resolveSemanticColor(res) : res;
            }
        });
    }

    return sheet;
}
