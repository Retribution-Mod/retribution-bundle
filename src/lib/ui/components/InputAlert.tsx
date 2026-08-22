import { AlertActionButton, AlertActions, AlertModal, Stack, Forms } from "@metro/common/components";
import { React } from "@metro/common";
import { findByPropsLazy } from "@metro/wrappers";

const Alerts = findByPropsLazy("openLazy", "close");

export interface InputAlertProps {
    title?: string;
    confirmText?: string;
    confirmColor?: string;
    onConfirm: (input: string) => (void | Promise<void>);
    cancelText?: string;
    placeholder?: string;
    initialValue?: string;
    secureTextEntry?: boolean;
}

export default function InputAlert({ title, confirmText, confirmColor, onConfirm, cancelText, placeholder, initialValue = "", secureTextEntry }: InputAlertProps) {
    const [value, setValue] = React.useState(initialValue);
    const [error, setError] = React.useState("");

    function onConfirmWrapper() {
        const asyncOnConfirm = Promise.resolve(onConfirm(value));

        asyncOnConfirm.then(() => {
            Alerts.close();
        }).catch((e: Error) => {
            setError(e.message);
        });
    }

    return (
        <AlertModal
            title={title}
            content={placeholder}
            extraContent={
                <Stack spacing={8}>
                    <Forms.FormInput
                        placeholder={placeholder}
                        value={value}
                        onChange={(v: string | { text: string }) => {
                            setValue(typeof v === "string" ? v : v.text);
                            if (error) setError("");
                        }}
                        returnKeyType="done"
                        onSubmitEditing={onConfirmWrapper}
                        error={error || undefined}
                        secureTextEntry={secureTextEntry}
                        autoFocus={true}
                        showBorder={true}
                        style={{ alignSelf: "stretch" }}
                    />
                </Stack>
            }
            actions={
                <AlertActions>
                    <AlertActionButton
                        text={cancelText || "Cancel"}
                        variant="secondary"
                        onPress={() => Alerts.close()}
                    />
                    <AlertActionButton
                        text={confirmText || "Confirm"}
                        color={confirmColor}
                        variant="primary"
                        onPress={onConfirmWrapper}
                        disabled={error.length !== 0}
                    />
                </AlertActions>
            }
        />
    );
}
