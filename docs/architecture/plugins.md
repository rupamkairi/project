## Plugin System — Architecture Description

---

### Overview

This system follows a `Core → Module → Compose` three-layer architecture. Plugins are **reusable packages** that sit between the infrastructure (vendor SDKs) and the compose layer (applications). They are never hardwired into modules or core — they are factory functions that accept config and return registered provider instances.

---

### Plugin Package Structure

```
packages/
  plugin-{capability}/
    src/
      index.ts          ← factory function: createXPlugin(config) → instance
      providers/        ← one file per vendor implementation
    package.json        ← name: "@repo/plugin-{capability}"
```

A plugin package:

- Imports **only** from `@core` interfaces and its own provider implementations
- Exports a single `create{X}Plugin(config)` factory function
- Never imports from modules, other plugins, or compose
- Is consumed by compose via `import { createXPlugin } from "@repo/plugin-x"`

---

### Example: Notification Plugin

**Core** defines the `NotificationAdapter` interface and `AdapterRegistry`. It knows nothing about SendGrid or Twilio.

**Module** (`modules/notification`) owns the business logic — trigger matching, preference checking, template rendering, queue dispatch, delivery logging. It resolves the active channel provider at runtime via `channelPluginRegistry.resolve(channel, org.settings)`.

**Plugin package** (`packages/plugin-notification`) wraps SendGrid, Resend, Twilio, MSG91, FCM behind a common `NotificationChannelPlugin` interface. It exports `createNotificationPlugin(config)`.

**Compose** calls the factory at boot with environment-specific config. Different composes can use different providers. Different orgs within the same compose can route to different providers via org settings.

```typescript
// packages/plugin-notification/src/index.ts

export function createNotificationPlugin(config: NotificationPluginConfig) {
  const registry = new ChannelPluginRegistry();

  if (config.channels.email?.provider === "sendgrid")
    registry.register(new SendGridPlugin(config.channels.email));

  if (config.channels.email?.provider === "resend")
    registry.register(new ResendPlugin(config.channels.email));

  if (config.channels.sms?.provider === "twilio")
    registry.register(new TwilioPlugin(config.channels.sms));

  if (config.channels.push?.provider === "fcm")
    registry.register(new FCMPlugin(config.channels.push));

  return { registry };
}

// compose/lms/boot.ts
const notification = createNotificationPlugin({
  channels: {
    email: { provider: "resend", apiKey: env.RESEND_KEY },
    sms: {
      provider: "twilio",
      accountSid: env.TWILIO_SID,
      authToken: env.TWILIO_TOKEN,
    },
  },
});

// compose/restaurant/boot.ts — same plugin, different config
const notification = createNotificationPlugin({
  channels: {
    sms: { provider: "msg91", apiKey: env.MSG91_KEY },
    push: { provider: "fcm", serviceAccountKey: env.FCM_KEY },
  },
});
```

---

### Dependency Rule

```
core/               ← no dependencies
modules/            ← depends on core only
packages/plugin-*/  ← depends on core interfaces + own infra providers
compose/*/          ← depends on modules + plugin packages
```

A plugin package must **never** import from a module. A module must **never** import from a plugin package. The compose is the **only** place they meet.

---

### Applying This Pattern To Any Capability

Every plugin follows the same shape regardless of capability:

| Capability    | Package                     | Factory                            | Interface                   |
| ------------- | --------------------------- | ---------------------------------- | --------------------------- |
| Notifications | `@repo/plugin-notification` | `createNotificationPlugin(config)` | `NotificationChannelPlugin` |
| Auth          | `@repo/plugin-auth`         | `createAuthPlugin(config)`         | `AuthProviderPlugin`        |
| Storage       | `@repo/plugin-storage`      | `createStoragePlugin(config)`      | `StorageAdapter`            |
| Payment       | `@repo/plugin-payment`      | `createPaymentPlugin(config)`      | `PaymentAdapter`            |
| Search        | `@repo/plugin-search`       | `createSearchPlugin(config)`       | `SearchAdapter`             |

Same pattern. Same boundaries. Different config shape and providers per capability.
