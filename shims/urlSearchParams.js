// @ts-nocheck

class URLSearchParamsFallback {
    constructor(init) {
        this._entries = [];
        if (typeof init === "string") {
            let str = init.startsWith("?") ? init.slice(1) : init;
            if (str) {
                for (const pair of str.split("&")) {
                    if (!pair) continue;
                    const idx = pair.indexOf("=");
                    if (idx !== -1) {
                        this._entries.push([
                            decodeURIComponent(pair.slice(0, idx).replace(/\+/g, " ")),
                            decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, " "))
                        ]);
                    } else {
                        this._entries.push([decodeURIComponent(pair.replace(/\+/g, " ")), ""]);
                    }
                }
            }
        } else if (init && typeof init === "object") {
            const entries = Array.isArray(init) ? init : Object.entries(init);
            for (const [k, v] of entries) {
                this._entries.push([String(k), String(v)]);
            }
        }
    }

    append(name, value) {
        this._entries.push([String(name), String(value)]);
    }

    delete(name) {
        this._entries = this._entries.filter(([k]) => k !== String(name));
    }

    get(name) {
        const found = this._entries.find(([k]) => k === String(name));
        return found ? found[1] : null;
    }

    getAll(name) {
        return this._entries.filter(([k]) => k === String(name)).map(([, v]) => v);
    }

    has(name) {
        return this._entries.some(([k]) => k === String(name));
    }

    set(name, value) {
        this.delete(name);
        this.append(name, value);
    }

    sort() {
        this._entries.sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0));
    }

    forEach(callback, thisArg) {
        for (const [key, value] of this._entries) {
            callback.call(thisArg, value, key, this);
        }
    }

    *keys() {
        for (const [k] of this._entries) yield k;
    }

    *values() {
        for (const [, v] of this._entries) yield v;
    }

    *entries() {
        for (const entry of this._entries) yield entry;
    }

    [Symbol.iterator]() {
        return this.entries();
    }

    toString() {
        return this._entries
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join("&");
    }
}

const urlSearchParams = globalThis.URLSearchParams ??= URLSearchParamsFallback;

export { urlSearchParams as "globalThis.URLSearchParams" };
