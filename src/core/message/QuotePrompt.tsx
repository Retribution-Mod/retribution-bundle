import { React } from "@metro/common";
import { AlertActionButton, AlertActions, AlertModal, Text } from "@metro/common/components";
import { openAlert, dismissAlert } from "@lib/ui/alerts";
import { messageUtil } from "@metro/common";
import { settings } from "@lib/api/settings";

function getAuthorName(message: any) {
    return message.author?.globalName
        || message.author?.global_name
        || message.author?.username
        || "Unknown";
}

const defaultQuoteSettings: NonNullable<typeof settings.quote> = {
    includeAuthor: true,
    includeDay: true,
    includeTimestamp: true,
    dateStyle: "D",
    timeStyle: "T",
    includeQuotedMessage: true,
};

function getQuoteSettings() {
    return Object.assign({}, defaultQuoteSettings, settings.quote ?? {});
}

export function formatQuoteContent(message: any) {
    const q = getQuoteSettings();
    const author = getAuthorName(message);
    const timestampSeconds = Math.floor(new Date(message.timestamp).getTime() / 1000);

    const parts: string[] = [];
    if (q.includeAuthor) parts.push(author);
    if (q.includeDay) parts.push(`<t:${timestampSeconds}:${q.dateStyle ?? "D"}>`);
    if (q.includeTimestamp) parts.push(`<t:${timestampSeconds}:${q.timeStyle ?? "T"}>`);

    const header = parts.join(" | ");

    if (!q.includeQuotedMessage) return header;

    const content = String(message.content ?? "").trim();
    const quotedBody = content.length > 0
        ? content.split("\n").map(line => `> ${line}`).join("\n")
        : "> (no text)";

    return `${header}\n${quotedBody}`;
}

interface QuotePromptProps {
    message: any;
}

const ALERT_KEY = "retribution-quote";

export default function QuotePrompt({ message }: QuotePromptProps) {
    const preview = formatQuoteContent(message);

    function onConfirm() {
        messageUtil.sendMessage(
            message.channel_id,
            { content: preview },
            void 0,
            { nonce: Date.now().toString() }
        );

        dismissAlert(ALERT_KEY);
    }

    return (
        <AlertModal
            title="Quote message"
            content="Preview:"
            extraContent={
                <Text variant="text-md/medium" style={{ marginTop: 8 }}>
                    {preview}
                </Text>
            }
            actions={
                <AlertActions>
                    <AlertActionButton
                        text="Cancel"
                        variant="secondary"
                        onPress={() => dismissAlert(ALERT_KEY)}
                    />
                    <AlertActionButton
                        text="Send"
                        variant="primary"
                        onPress={onConfirm}
                    />
                </AlertActions>
            }
        />
    );
}

export function showQuotePrompt(message: any) {
    openAlert(ALERT_KEY, <QuotePrompt message={message} />);
}
