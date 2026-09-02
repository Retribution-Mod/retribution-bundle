import * as Sentry from "@sentry/browser";
import type { ErrorEvent, SeverityLevel } from "@sentry/browser";
import { version } from "bunny-build-info";
import { settings } from "@lib/api/settings";
import { findByProps } from "@metro/wrappers";

const DSN = "https://50e2941f7dc5a3387e8121ef714187e2@o4509257425813504.ingest.us.sentry.io/4511957712109568";

let initialized = false;

const TOKEN_REGEXES = [
    { pattern: /\bM[\w-]{20,}\.[\w-]{6,}\.[\w-]{27,}\b/g, replacement: "<redacted-discord-token>" },
    { pattern: /\bmfa_[\w-]{10,}\b/gi, replacement: "<redacted-mfa-token>" },
    { pattern: /\beyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}\b/g, replacement: "<redacted-jwt>" },
    { pattern: /\bBearer\s+[\w-]+/gi, replacement: "Bearer <redacted>" },
    { pattern: /\b[a-f0-9]{64}\b/gi, replacement: "<redacted-hash>" },
    { pattern: /\b(token|authorization|password|secret|cookie)\s*[:=]\s*[^\s&"]{4,}/gi, replacement: "$1: <redacted>" },
    { pattern: /(https?:\/\/[^\s?"<]+)\?[^\s"<]+/g, replacement: "$1?<redacted>" },
];

function redactString(value: string): string {
    return TOKEN_REGEXES.reduce(
        (str, { pattern, replacement }) => str.replace(pattern, replacement),
        value
    );
}

function redactEvent(event: ErrorEvent): ErrorEvent | null {
    delete event.user;
    delete event.request;
    delete event.contexts?.["react"];

    if (event.breadcrumbs) {
        for (const crumb of event.breadcrumbs) {
            if (crumb.category === "http" || crumb.category === "xhr" || crumb.category === "fetch") {
                crumb.message = crumb.message ? "[redacted network]" : undefined;
                crumb.data = {};
                continue;
            }
            if (crumb.message) crumb.message = redactString(crumb.message);
            if (crumb.data && typeof crumb.data === "object") {
                for (const key of Object.keys(crumb.data)) {
                    const value = crumb.data[key];
                    if (typeof value === "string") crumb.data[key] = redactString(value);
                }
            }
        }
    }

    if (event.exception?.values) {
        for (const ex of event.exception.values) {
            if (ex.value) ex.value = redactString(ex.value);
            if (typeof ex.mechanism?.data?.description === "string") {
                ex.mechanism.data.description = redactString(ex.mechanism.data.description);
            }
        }
    }

    if (typeof event.message === "string") event.message = redactString(event.message);

    return event;
}

export function isSentryEnabled(): boolean {
    return settings.enableSentry ?? true;
}

export function initSentry() {
    if (initialized) return;
    if (!isSentryEnabled()) return;
    initialized = true;

    Sentry.init({
        dsn: DSN,
        release: `retribution-bundle@${version}`,
        environment: `bundle-${__BUILD_TARGET__}`,
        defaultIntegrations: false,
        integrations: [Sentry.dedupeIntegration()],
        tracesSampleRate: 0,
        sampleRate: 1,
        beforeSend: (event) => {
            if (!isSentryEnabled()) return null;
            return redactEvent(event);
        },
    });
}

export function overwriteDiscordSentry() {
    const ErrorUtils = (globalThis as any).ErrorUtils;
    if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === "function" && typeof ErrorUtils.getGlobalHandler === "function") {
        const original = ErrorUtils.getGlobalHandler();
        ErrorUtils.setGlobalHandler((...args: any[]) => {
            if (isSentryEnabled()) {
                const raw = args[0];
                const err = raw instanceof Error ? raw : new Error(String(raw));
                captureException(err);
            }
            if (typeof original === "function") return original(...args);
        });
    }

    try {
        const discordSentry = findByProps("captureException", "init")
            ?? findByProps("captureException", "captureMessage");
        if (discordSentry) {
            discordSentry.captureException = (error: any) => {
                if (isSentryEnabled()) captureException(error);
            };
            discordSentry.captureMessage = (msg: string, level?: SeverityLevel) => {
                if (isSentryEnabled()) captureMessage(msg, level);
            };
        }
    } catch {}
}

export function captureException(error: unknown) {
    if (!isSentryEnabled()) return;
    if (!initialized) initSentry();
    Sentry.captureException(error);
}

export function captureMessage(message: string, level: SeverityLevel = "error") {
    if (!isSentryEnabled()) return;
    if (!initialized) initSentry();
    Sentry.captureMessage(message, level);
}
