import { NativeFileModule } from "./modules";


function isAbsolutePath(path: string) {
    return path.startsWith("/") || path.startsWith("\\") || /^[a-zA-Z]:[\\\/]/.test(path) || /^[a-z][a-z0-9+.-]*:\/\//i.test(path);
}

function splitPath(path: string) {
    return path.replace(/\\/g, "/").split("/").filter(Boolean);
}

function getBasePath(storageDir?: "documents" | "cache") {
    const constants = NativeFileModule.getConstants();
    return storageDir === "cache" ? constants.CacheDirPath : constants.DocumentsDirPath;
}

function assertPathUnderBase(path: string, prefix: string, base: string) {
    if (typeof path !== "string" || path.length === 0) throw new Error("Invalid path");
    if (path.includes("\0")) throw new Error("Invalid path");
    if (isAbsolutePath(path)) throw new Error("Absolute paths are not allowed");

    const baseParts = splitPath(base);
    const resolved = [...baseParts];
    for (const part of splitPath(`${prefix}${path}`)) {
        if (part === "..") {
            if (resolved.length === 0) throw new Error("Path traversal");
            resolved.pop();
        } else if (part !== ".") {
            resolved.push(part);
        }
    }

    if (resolved.length < baseParts.length) throw new Error("Path traversal");
    for (let i = 0; i < baseParts.length; i++) {
        if (resolved[i] !== baseParts[i]) throw new Error("Path traversal");
    }
}

export function validatePath(path: string) {
    if (typeof path !== "string" || path.length === 0) throw new Error("Invalid path");
    if (path.includes("\0")) throw new Error("Invalid path");
    if (isAbsolutePath(path)) throw new Error("Absolute paths are not allowed");
    for (const part of splitPath(path)) {
        if (part === "..") throw new Error("Path traversal");
    }
}

export async function clearFolder(path: string, { prefix = "pyoncord/" } = {}) {
    if (typeof NativeFileModule.clearFolder !== "function") throw new Error("'fs.clearFolder' is not supported");
    assertPathUnderBase(path, prefix, getBasePath("documents"));
    return void await NativeFileModule.clearFolder("documents", `${prefix}${path}`);
}


export async function removeFile(path: string, { prefix = "pyoncord/" } = {}) {
    if (typeof NativeFileModule.removeFile !== "function") throw new Error("'fs.removeFile' is not supported");
    assertPathUnderBase(path, prefix, getBasePath("documents"));
    return void await NativeFileModule.removeFile("documents", `${prefix}${path}`);
}


export async function removeCacheFile(path: string, prefix = "pyoncord/") {
    if (typeof NativeFileModule.removeFile !== "function") throw new Error("'fs.removeFile' is not supported");
    assertPathUnderBase(path, prefix, getBasePath("cache"));
    return void await NativeFileModule.removeFile("cache", `${prefix}${path}`);
}


export async function fileExists(path: string, { prefix = "pyoncord/" } = {}) {
    assertPathUnderBase(path, prefix, getBasePath("documents"));
    return await NativeFileModule.fileExists(`${NativeFileModule.getConstants().DocumentsDirPath}/${prefix}${path}`);
}


export async function writeFile(path: string, data: string, { prefix = "pyoncord/" } = {}): Promise<void> {
    if (typeof data !== "string") throw new Error("Argument 'data' must be a string");
    assertPathUnderBase(path, prefix, getBasePath("documents"));
    return void await NativeFileModule.writeFile("documents", `${prefix}${path}`, data, "utf8");
}


export async function readFile(path: string, { prefix = "pyoncord/" } = {}): Promise<string> {
    assertPathUnderBase(path, prefix, getBasePath("documents"));
    try {
        return await NativeFileModule.readFile(`${NativeFileModule.getConstants().DocumentsDirPath}/${prefix}${path}`, "utf8");
    } catch (err) {
        throw new Error(`An error occured while writing to '${path}'`, { cause: err });
    }
}


export async function downloadFile(url: string, path: string, { prefix = "pyoncord/" } = {}) {
    assertPathUnderBase(path, prefix, getBasePath("documents"));
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download file from ${url}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer).toString("base64");

    await NativeFileModule.writeFile("documents", `${prefix}${path}`, data, "base64");
}
