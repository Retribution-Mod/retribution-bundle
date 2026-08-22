import { settings } from "@lib/api/settings";
import { useProxy } from "@core/vd-compat/storage";
import { findAssetId } from "@lib/api/assets";
import {
    Stack,
    TableRowGroup,
    TableRow,
    TableRadioGroup,
    TableRadioRow,
    TableSwitchRow,
    TextInput
} from "@metro/common/components";
import { ScrollView } from "react-native";

const MODES: { label: string; value: string }[] = [
    { label: "Local", value: "local" },
    { label: "Calendar", value: "calendar" },
    { label: "Relative", value: "relative" },
    { label: "ISO", value: "iso" },
    { label: "Custom", value: "custom" },
];

export default function Timestamps() {
    useProxy(settings);

    const cfg = settings.timestamps ?? {
        mode: "local",
        customFormat: "dddd, MMMM Do YYYY, h:mm:ss a",
        hideDateIfToday: false
    };

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title="Timestamp mode">
                    <TableRadioGroup
                        title="Display mode"
                        defaultValue={cfg.mode}
                        onChange={value => cfg.mode = value as any}
                    >
                        {MODES.map(m => (
                            <TableRadioRow
                                key={m.value}
                                label={m.label}
                                value={m.value}
                            />
                        ))}
                    </TableRadioGroup>
                </TableRowGroup>

                {cfg.mode === "custom" && <TableRowGroup title="Custom format">
                    <TextInput
                        label="Moment.js format string"
                        placeholder="dddd, MMMM Do YYYY, h:mm:ss a"
                        defaultValue={cfg.customFormat}
                        onChange={(v: string) => cfg.customFormat = v}
                    />
                    <TableRow
                        label="Preview"
                        subLabel={new Date().toLocaleString()}
                        onPress={() => {}}
                    />
                </TableRowGroup>}

                <TableRowGroup title="Options">
                    <TableSwitchRow
                        label="Hide date if today"
                        subLabel="Only show the time for today's timestamps"
                        value={cfg.hideDateIfToday}
                        onValueChange={(v: boolean) => cfg.hideDateIfToday = v}
                    />
                </TableRowGroup>
            </Stack>
        </ScrollView>
    );
}
