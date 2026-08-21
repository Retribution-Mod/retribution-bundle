import { NativeFileModule } from "./modules";


export async function clearFolder(path: string, { prefix = "pyoncord/" } = {}) {
    if (typeof NativeFileModule.clearFolder !== "function") throw new Error("'fs.clearFolder' is not supported");
    return void await NativeFileModule.clearFolder("documents", `${prefix}${path}`);
}


export async function removeFile(path: string, { prefix = "pyoncord/" } = {}) {
    if (typeof NativeFileModule.removeFile !== "function") throw new Error("'fs.removeFile' is not supported");
    return void await NativeFileModule.removeFile("documents", `${prefix}${path}`);
}


export async function removeCacheFile(path: string, prefix = "pyoncord/") {
    if (typeof NativeFileModule.removeFile !== "function") throw new Error("'fs.removeFile' is not supported");
    return void await NativeFileModule.removeFile("cache", `${prefix}${path}`);
}


export async function fileExists(path: string, { prefix = "pyoncord/" } = {}) {
    return await NativeFileModule.fileExists(`${NativeFileModule.getConstants().DocumentsDirPath}/${prefix}${path}`);
}


export async function writeFile(path: string, data: string, { prefix = "pyoncord/" } = {}): Promise<void> {
    if (typeof data !== "string") throw new Error("Argument 'data' must be a string");
    return void await NativeFileModule.writeFile("documents", `${prefix}${path}`, data, "utf8");
}


export async function readFile(path: string, { prefix = "pyoncord/" } = {}): Promise<string> {
    try {
        return await NativeFileModule.readFile(`${NativeFileModule.getConstants().DocumentsDirPath}/${prefix}${path}`, "utf8");
    } catch (err) {
        throw new Error(`An error occured while writing to '${path}'`, { cause: err });
    }
}


export async function downloadFile(url: string, path: string, { prefix = "pyoncord/" } = {}) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download file from ${url}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer).toString("base64");

    await NativeFileModule.writeFile("documents", `${prefix}${path}`, data, "base64");
}
