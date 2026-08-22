import { before, after } from "@lib/api/patcher";
import { findByPropsLazy } from "@metro/wrappers";
import { ActionSheetRow } from "@metro/common/components";
import { findAssetId } from "@lib/api/assets";
import { findInReactTree } from "@lib/utils";
import { showInputAlert } from "@core/vd-compat/alerts";
import { messageUtil } from "@metro/common";
import { createElement as h } from "react";

const LazyActionSheet = findByPropsLazy("openLazy", "hideActionSheet");

function getAuthorName(message: any) {
    return message.author?.globalName
        || message.author?.global_name
        || message.author?.username
        || "Unknown";
}

function formatQuoteContent(message: any) {
    const author = getAuthorName(message);
    const timestamp = new Date(message.timestamp).toLocaleString();

    const rawContent = String(message.content ?? "").trim().replace(/\n/g, " ");
    const displayContent = rawContent.length > 0
        ? rawContent.slice(0, 20) + (rawContent.length > 20 ? "..." : "")
        : "(no text)";

    const combined = `${author} - ${timestamp}\n${displayContent}`;
    const maxBacktickRun = (combined.match(/`+/g) || []).reduce((m, r) => Math.max(m, r.length), 0);
    const fence = "`".repeat(maxBacktickRun + 3);

    return `${fence}${author} - ${timestamp}\n${displayContent}${fence}`;
}

function formatQuoteResponse(quoted: string, response: string) {
    const responseLines = response
        .split("\n")
        .map(line => "> " + line)
        .join("\n");

    return `${quoted}\n\n${responseLines}`;
}

export default function initQuote() {
    if (!LazyActionSheet) return;

    const unpatch = before("openLazy", LazyActionSheet, ([component, key, msg]: any[]) => {
        if (key !== "MessageLongPressActionSheet" || !msg?.message) return;

        component.then((instance: any) => {
            instance.__quoteActiveMessage = msg.message;
            if (instance.__quotePatched) return;
            instance.__quotePatched = true;

            after("default", instance, (_: any, result: any) => {
                try {
                    const message = instance.__quoteActiveMessage;
                    if (!message) return;

                    const iconId = findAssetId("ChatIcon") || findAssetId("MessageIcon") || findAssetId("QuoteIcon");
                    const icon = iconId ? h(ActionSheetRow.Icon, { source: iconId }) : undefined;

                    const row = h(ActionSheetRow, {
                        label: "Quote",
                        subLabel: "Quote this message",
                        icon,
                        onPress: () => {
                            LazyActionSheet?.hideActionSheet?.();

                            showInputAlert({
                                title: "Quote message",
                                placeholder: "Type your response...",
                                confirmText: "Send",
                                onConfirm: (response) => {
                                    const trimmed = response?.trim();
                                    if (!trimmed) return;

                                    const quoted = formatQuoteContent(message);
                                    const content = formatQuoteResponse(quoted, trimmed);

                                    messageUtil.sendMessage(
                                        message.channel_id,
                                        { content },
                                        void 0,
                                        { nonce: Date.now().toString() }
                                    );
                                }
                            });
                        },
                        key: "retribution-quote"
                    });

                    const groups = findInReactTree(
                        result,
                        (x: any) => Array.isArray(x) && x[0]?.type?.name === "ActionSheetRowGroup"
                    );

                    if (Array.isArray(groups) && groups.length) {
                        for (const group of groups) {
                            const children = findInReactTree(
                                group,
                                (c: any) => Array.isArray(c) && c.some((child: any) => child?.type?.name === "ActionSheetRow")
                            );
                            if (Array.isArray(children)) {
                                children.push(row);
                                return;
                            }
                        }
                    }

                    const genericRowGroup = findInReactTree(
                        result,
                        (x: any) =>
                            Array.isArray(x) &&
                            x.length > 0 &&
                            x.every((el: any) => typeof el?.props?.label === "string" && typeof el?.props?.onPress === "function")
                    );

                    if (Array.isArray(genericRowGroup)) genericRowGroup.push(row);
                } catch {
                    // Best-effort: if the action sheet shape is unrecognized, skip.
                }
            });
        });
    });

    return unpatch;
}
