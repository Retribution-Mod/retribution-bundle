import { React } from "@metro/common";
import { AlertActionButton, AlertActions, AlertModal, Stack, Forms } from "@metro/common/components";
import { openAlert, dismissAlert } from "@lib/ui/alerts";
import { messageUtil } from "@metro/common";

function getAuthorName(message: any) {
    return message.author?.globalName
        || message.author?.global_name
        || message.author?.username
        || "Unknown";
}

function formatQuoteContent(message: any) {
    const author = getAuthorName(message);
    const date = new Date(message.timestamp);
    const day = date.toLocaleDateString(undefined, { weekday: "long" });
    const timestampSeconds = Math.floor(date.getTime() / 1000);

    return `${author} | ${day} - <t:${timestampSeconds}:F>`;
}

function formatQuoteResponse(quoted: string, response: string) {
    const responseLines = response
        .split("\n")
        .map(line => "> " + line)
        .join("\n");

    return `${quoted}\n\n${responseLines}`;
}

interface QuotePromptProps {
    message: any;
}

const ALERT_KEY = "retribution-quote";

export default function QuotePrompt({ message }: QuotePromptProps) {
    const [value, setValue] = React.useState("");

    function onConfirm() {
        const trimmed = value.trim();
        if (!trimmed) return;

        const quoted = formatQuoteContent(message);
        const content = formatQuoteResponse(quoted, trimmed);

        messageUtil.sendMessage(
            message.channel_id,
            { content },
            void 0,
            { nonce: Date.now().toString() }
        );

        dismissAlert(ALERT_KEY);
    }

    return (
        <AlertModal
            title="Quote message"
            content="Type your response below:"
            extraContent={
                <Stack spacing={8}>
                    <Forms.FormInput
                        placeholder="Type your response..."
                        value={value}
                        onChange={(v: string | { text: string }) => {
                            setValue(typeof v === "string" ? v : v.text);
                        }}
                        returnKeyType="done"
                        onSubmitEditing={onConfirm}
                        autoFocus={true}
                        showBorder={true}
                        style={{ alignSelf: "stretch" }}
                    />
                </Stack>
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
