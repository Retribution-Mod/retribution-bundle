# Sentry integration

All Retribution projects report to the same Sentry project.

DSN:

```text
https://50e2941f7dc5a3387e8121ef714187e2@o4509257425813504.ingest.us.sentry.io/4511957712109568
```

## Release names

| Project | Release format |
| --- | --- |
| `Retribution` (main JS bundle) | `retribution-bundle@<version>` |
| `Retribution-IPA` (iOS JS bundle) | `retribution-bundle@<version>` |
| `retribution-tweak` (iOS native tweak) | `retribution-tweak@<PACKAGE_VERSION>` |
| `retribution-manager` (Android app) | `retribution-manager@<VERSION_NAME>` |
| `retribution-xposed` (Android Xposed module) | `retribution-xposed@<VERSION_NAME>` |

## Environments

| Project | Environment values |
| --- | --- |
| Bundles | `bundle-old` or `bundle-new` based on the Hermes bridge build target |
| `retribution-tweak` | `jailbroken` only (gated; SentryObjC is skipped on sideloaded installs) |
| `retribution-manager` | `debug` or `release` |
| `retribution-xposed` | `debug` or `release` |

## Data filtering

All projects strip the following from every event:

- `event.user`
- `event.request`
- `contexts.react`

Network breadcrumbs (`http`, `xhr`, `fetch`) are replaced with a placeholder and their `data` is cleared.

Exception values, breadcrumb messages, and event messages are redacted with regex patterns for:

- Discord / JWT tokens
- MFA tokens
- Bearer authorization values
- 64-character hex hashes
- `token`, `authorization`, `password`, `secret`, and `cookie` key/value pairs
- URLs with query strings

## Per-project setup

### Bundles (`Retribution` and `Retribution-IPA`)

- Wrapper: `src/lib/sentry.ts`
- `Sentry.init` in `src/entry.ts`
- Error capture in `src/index.ts`, `src/lib/utils/logger.ts`, and `src/core/debug/patches/patchErrorBoundary.tsx`

### iOS tweak (`retribution-tweak`)

- Native SentryObjC is configured in `Sources/Tweak.x`.
- It is gated to jailbroken devices (`isJailbroken`) to avoid sandboxed sideloaded crashes during `SentryObjCSDK` bootstrap.
- A `beforeSend` block redacts PII in `SentryObjCEvent`.
- `Headers/Logger.h` wraps `RetributionLog` in `extern "C"` so `.xm` files link to the C symbol instead of a C++ mangled name.

### Android manager (`retribution-manager`)

- Wrapper: `app/src/main/java/app/retribution/manager/Sentry.kt`
- Initialized in `ManagerApplication.onCreate`.
- Uses `io.sentry:sentry-android`.

### Android Xposed module (`retribution-xposed`)

- Wrapper: `app/src/main/kotlin/io/github/retribution/xposed/tweaks/SentryTweak.kt`
- Registered in `Main.kt` immediately after `lifecycleSupport` so it initializes once the host app context is attached.
- Uses `io.sentry:sentry-android`.
