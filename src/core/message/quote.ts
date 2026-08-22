import { before, after } from "@lib/api/patcher";
import { findByPropsLazy } from "@metro/wrappers";
import { ActionSheetRow, TableRow } from "@metro/common/components";
import { findAssetId } from "@lib/api/assets";
import { findInReactTree } from "@lib/utils";
import { showQuotePrompt } from "./QuotePrompt";
import { createElement as h } from "react";

const LazyActionSheet = findByPropsLazy("openLazy", "hideActionSheet");
const ActionSheetRowGroup = (ActionSheetRow as any).Group;

function injectQuoteRow(result: any, message: any) {
    try {
        const iconId = findAssetId("ChatIcon") || findAssetId("MessageIcon") || findAssetId("QuoteIcon");
        const icon = iconId ? h(TableRow.Icon, { source: iconId }) : undefined;

        const row = h(ActionSheetRow, {
            label: "Quote",
            subLabel: "Quote this message",
            icon,
            onPress: () => {
                LazyActionSheet?.hideActionSheet?.();
                showQuotePrompt(message);
            },
            key: "retribution-quote"
        });

        const group = findInReactTree(
            result,
            (x: any) =>
                x?.type === ActionSheetRowGroup ||
                x?.type?.name === "ActionSheetRowGroup" ||
                x?.type?.name === "Group"
        );

        if (group && group.props) {
            const children = group.props.children;
            if (Array.isArray(children)) {
                children.push(row);
            } else if (children) {
                group.props.children = [children, row];
            } else {
                group.props.children = [row];
            }
            return;
        }

        const rowGroup = findInReactTree(
            result,
            (x: any) =>
                Array.isArray(x) &&
                x.length > 0 &&
                x.every((el: any) => typeof el?.props?.label === "string" && typeof el?.props?.onPress === "function")
        );

        if (Array.isArray(rowGroup)) rowGroup.push(row);
    } catch (e) {
        console.error("[Quote] failed to inject row:", e);
    }
}

export default function initQuote() {
    if (!LazyActionSheet) {
        console.log("[Quote] LazyActionSheet not found");
        return;
    }

    const unpatch = before("openLazy", LazyActionSheet, ([component, key, props]: any[]) => {
        if (key !== "MessageLongPressActionSheet") return;

        let modulePromise = component;
        if (typeof modulePromise === "function" && !("then" in modulePromise)) {
            try {
                modulePromise = Promise.resolve(modulePromise());
            } catch (e) {
                console.error("[Quote] component call failed:", e);
                return;
            }
        } else if (!("then" in modulePromise)) {
            modulePromise = Promise.resolve({ default: modulePromise });
        }

        Promise.resolve(modulePromise).then((instance: any) => {
            if (!instance) return;

            const target = instance.default ?? instance;
            if (typeof target !== "function") {
                console.log("[Quote] MessageLongPressActionSheet target is not a function");
                return;
            }

            const message = props?.message;

            if (instance.__quotePatched) return;
            instance.__quotePatched = true;

            after("default", instance, (_: any, result: any) => {
                if (!message) return;
                injectQuoteRow(result, message);
            });
        }).catch((e: any) => console.error("[Quote] modulePromise error:", e));
    });

    return unpatch;
}
