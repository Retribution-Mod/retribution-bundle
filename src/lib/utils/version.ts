import { Platform } from "react-native";

type RNVersion = {
    major: number;
    minor: number;
    patch: number;
};

interface IsNewArchitecture {
    major: number;
    minor: number;
    patch: number;
}

export function getReactNativeVersion(): IsNewArchitecture | null {
    try {
        return (Platform.constants as any).reactNativeVersion as IsNewArchitecture;
    } catch {
        return null;
    }
}

export function getHermesBytecodeVersion(): number {
    try {
        return Number(window.HermesInternal.getRuntimeProperties()["Bytecode Version"]);
    } catch {
        return 0;
    }
}


export function isNewArchitecture(): boolean {
    if (getHermesBytecodeVersion() >= 98) return true;

    const rn = getReactNativeVersion();
    if (!rn) return false;

    const { major, minor } = rn;
    return major > 0 || minor >= 86;
}


export const BUILD_TARGET: "old" | "new" = typeof __BUILD_TARGET__ !== "undefined" ? __BUILD_TARGET__ : "old";
