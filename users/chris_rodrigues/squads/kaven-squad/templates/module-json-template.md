# Module JSON Template — Kaven CLI

> Use this template when creating a `module.json` for a new kaven-cli installable module.

---

## File Location

```
modules/{module-name}/
├── module.json              # Module manifest (this template)
├── backend/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── schemas/
├── frontend/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   └── i18n/
├── database/
│   ├── schema.prisma        # Prisma model additions
│   └── seed.ts              # Seed data
└── README.md
```

---

## Complete module.json Structure

```json
{
  "$schema": "https://kaven.dev/schemas/module.json",
  "name": "notifications",
  "version": "1.0.0",
  "displayName": "Notifications Module",
  "description": "In-app notifications with real-time delivery, email digests, and per-user preferences.",
  "author": "Kaven Team",
  "license": "MIT",
  "kavenVersion": ">=1.0.0",
  "category": "communication",
  "tags": ["notifications", "email", "real-time", "websocket"],
  "icon": "bell",

  "files": {
    "backend": [
      {
        "src": "backend/routes/notifications.routes.ts",
        "dest": "apps/api/src/modules/notifications/notifications.routes.ts"
      },
      {
        "src": "backend/routes/notifications.controller.ts",
        "dest": "apps/api/src/modules/notifications/notifications.controller.ts"
      },
      {
        "src": "backend/services/notifications.service.ts",
        "dest": "apps/api/src/modules/notifications/notifications.service.ts"
      },
      {
        "src": "backend/services/notification-delivery.service.ts",
        "dest": "apps/api/src/modules/notifications/notification-delivery.service.ts"
      },
      {
        "src": "backend/schemas/notifications.schema.ts",
        "dest": "apps/api/src/modules/notifications/notifications.schema.ts"
      },
      {
        "src": "backend/middleware/notification-rate-limit.ts",
        "dest": "apps/api/src/middleware/notification-rate-limit.ts"
      }
    ],
    "frontend": [
      {
        "src": "frontend/pages/notifications-page.tsx",
        "dest": "apps/tenant-app/src/app/[locale]/(dashboard)/notifications/page.tsx"
      },
      {
        "src": "frontend/components/notification-bell.tsx",
        "dest": "apps/tenant-app/src/components/notifications/notification-bell.tsx"
      },
      {
        "src": "frontend/components/notification-list.tsx",
        "dest": "apps/tenant-app/src/components/notifications/notification-list.tsx"
      },
      {
        "src": "frontend/components/notification-preferences.tsx",
        "dest": "apps/tenant-app/src/components/notifications/notification-preferences.tsx"
      },
      {
        "src": "frontend/hooks/use-notifications.ts",
        "dest": "apps/tenant-app/src/hooks/use-notifications.ts"
      },
      {
        "src": "frontend/i18n/en.json",
        "dest": "apps/tenant-app/src/messages/en/notifications.json"
      },
      {
        "src": "frontend/i18n/pt-BR.json",
        "dest": "apps/tenant-app/src/messages/pt-BR/notifications.json"
      }
    ],
    "database": [
      {
        "src": "database/schema.prisma",
        "dest": "packages/database/schema.modules/notifications.prisma",
        "type": "prisma-merge"
      },
      {
        "src": "database/seed.ts",
        "dest": "packages/database/prisma/seeds/notifications.seed.ts"
      }
    ]
  },

  "injections": [
    {
      "target": "apps/api/src/app.ts",
      "anchor": "// [KAVEN_MODULE_ROUTES]",
      "content": "app.register(import('./modules/notifications/notifications.routes'), { prefix: '/api/v1/notifications' });",
      "position": "after"
    },
    {
      "target": "apps/tenant-app/src/components/layout/sidebar-nav.tsx",
      "anchor": "// [KAVEN_MODULE_NAV]",
      "content": "{ title: t('notifications.nav'), href: '/notifications', icon: Bell },",
      "position": "after"
    },
    {
      "target": "apps/tenant-app/src/components/layout/header.tsx",
      "anchor": "// [KAVEN_MODULE_HEADER]",
      "content": "<NotificationBell />",
      "position": "after"
    },
    {
      "target": "apps/tenant-app/src/components/layout/header.tsx",
      "anchor": "// [KAVEN_MODULE_IMPORTS]",
      "content": "import { NotificationBell } from '@/components/notifications/notification-bell';",
      "position": "after"
    }
  ],

  "dependencies": {
    "npm": {
      "production": {
        "@fastify/websocket": "^10.0.0",
        "nodemailer": "^6.9.0"
      },
      "development": {
        "@types/nodemailer": "^6.4.0"
      }
    },
    "peerModules": [],
    "conflictsWith": []
  },

  "env": [
    {
      "key": "SMTP_HOST",
      "description": "SMTP server hostname for email notifications",
      "required": true,
      "example": "smtp.sendgrid.net"
    },
    {
      "key": "SMTP_PORT",
      "description": "SMTP server port",
      "required": false,
      "default": "587",
      "example": "587"
    },
    {
      "key": "SMTP_USER",
      "description": "SMTP authentication username",
      "required": true,
      "example": "apikey"
    },
    {
      "key": "SMTP_PASS",
      "description": "SMTP authentication password",
      "required": true,
      "sensitive": true,
      "example": "SG.xxxxxxxxxxxx"
    },
    {
      "key": "NOTIFICATION_FROM_EMAIL",
      "description": "Default sender email for notifications",
      "required": true,
      "example": "noreply@yourdomain.com"
    }
  ],

  "scripts": {
    "postInstall": [
      "pnpm --filter @kaven/database merge-schema",
      "pnpm --filter @kaven/database prisma migrate dev --name add_notifications",
      "pnpm --filter @kaven/database prisma generate"
    ],
    "preRemove": [
      "echo 'Warning: Notification data will remain in database. Run migration to remove tables if needed.'"
    ],
    "verify": [
      "pnpm --filter @kaven/api typecheck",
      "pnpm --filter @kaven/tenant-app typecheck"
    ]
  },

  "featureFlags": {
    "notifications.enabled": {
      "description": "Enable notifications module",
      "defaultValue": true,
      "plans": ["STARTER", "COMPLETE", "PRO"]
    },
    "notifications.email": {
      "description": "Enable email notification delivery",
      "defaultValue": false,
      "plans": ["COMPLETE", "PRO"]
    },
    "notifications.realtime": {
      "description": "Enable WebSocket real-time notifications",
      "defaultValue": false,
      "plans": ["PRO"]
    },
    "notifications.maxPerDay": {
      "description": "Maximum notifications per tenant per day",
      "type": "number",
      "defaultValue": 100,
      "plans": {
        "STARTER": 100,
        "COMPLETE": 1000,
        "PRO": -1
      }
    }
  },

  "capabilities": {
    "multiTenant": true,
    "softDelete": true,
    "auditLog": true,
    "i18n": ["en", "pt-BR"],
    "realtime": true
  }
}
```

---

## Injection Anchors Reference

The following anchors are available in the Kaven framework for module injections:

| Anchor | File | Purpose |
|--------|------|---------|
| `// [KAVEN_MODULE_ROUTES]` | `apps/api/src/app.ts` | Register API route plugins |
| `// [KAVEN_MODULE_NAV]` | `sidebar-nav.tsx` | Add navigation items |
| `// [KAVEN_MODULE_HEADER]` | `header.tsx` | Add header components |
| `// [KAVEN_MODULE_IMPORTS]` | Various | Add import statements |
| `// [KAVEN_MODULE_PROVIDERS]` | `providers.tsx` | Wrap with context providers |
| `// [KAVEN_MODULE_SEED]` | `seed.ts` | Add seed data calls |

---

## Notes

- The `$schema` field enables IDE autocompletion for the module manifest.
- Injection uses the markers-based idempotency pattern: `// [KAVEN_MODULE:notifications BEGIN]` / `// [KAVEN_MODULE:notifications END]` are automatically wrapped around injected content.
- `type: "prisma-merge"` tells the CLI to merge Prisma schema fragments during install rather than copying them directly.
- `sensitive: true` on env vars means `kaven module doctor` will check that the value is set but will not display it.
- `conflictsWith` can list module names that are incompatible (e.g., two competing auth modules).
- `featureFlags` are registered in the capabilities system automatically during install.
