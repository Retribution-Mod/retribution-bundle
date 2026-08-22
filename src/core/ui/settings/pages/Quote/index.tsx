import { useProxy } from "@core/vd-compat/storage";
import { settings } from "@lib/api/settings";
import { findAssetId } from "@lib/api/assets";
import { ScrollView } from "react-native";
import { Stack, TableRowGroup, TableSwitchRow, TableRadioGroup, TableRadioRow, TextInput } from "@metro/common/components";

export default function Quote() {
    useProxy(settings);

    const quote = settings.quote ??= {};

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title="Header">
                    <TableSwitchRow
                        label="Show author"
                        value={quote.includeAuthor ?? true}
                        onValueChange={(v: boolean) => quote.includeAuthor = v}
                    />
                    <TableSwitchRow
                        label="Show day"
                        value={quote.includeDay ?? true}
                        onValueChange={(v: boolean) => quote.includeDay = v}
                    />
                    <TableSwitchRow
                        label="Show timestamp"
                        value={quote.includeTimestamp ?? true}
                        onValueChange={(v: boolean) => quote.includeTimestamp = v}
                    />
                    <TableRadioGroup
                        title="Timestamp style"
                        defaultValue={quote.timestampStyle ?? "T"}
                        hasIcons={false}
                        onChange={v => quote.timestampStyle = v as any}
                    >
                        <TableRadioRow label="Short time (t)" value="t" />
                        <TableRadioRow label="Long time (T)" value="T" />
                        <TableRadioRow label="Short date (d)" value="d" />
                        <TableRadioRow label="Long date (D)" value="D" />
                        <TableRadioRow label="Short date/time (f)" value="f" />
                        <TableRadioRow label="Long date/time (F)" value="F" />
                        <TableRadioRow label="Relative (R)" value="R" />
                    </TableRadioGroup>
                </TableRowGroup>

                <TableRowGroup title="Quoted message">
                    <TableSwitchRow
                        label="Include original message"
                        subLabel="Adds the quoted message body below the header"
                        value={quote.includeQuotedMessage ?? true}
                        onValueChange={(v: boolean) => quote.includeQuotedMessage = v}
                    />
                </TableRowGroup>

                <TableRowGroup title="Reply">
                    <TextInput
                        label="Reply prefix"
                        placeholder="> "
                        defaultValue={quote.replyPrefix ?? "> "}
                        onChange={(v: string) => quote.replyPrefix = v}
                    />
                </TableRowGroup>
            </Stack>
        </ScrollView>
    );
}
