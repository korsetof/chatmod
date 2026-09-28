# Architecture

## Overview

ChatMod is split into a browser client, a Node.js API/realtime layer and PostgreSQL persistence.

```text
Browser
  │
  ├── HTTPS ───────────────► Express API
  │                            │
  └── WebSocket ──────────────┤
                               ├── Authentication / sessions
                               ├── Chat / moderation logic
                               ├── Upload handling
                               │
                               └──────────► PostgreSQL
```

## Boundaries

- **Client** — presentation, user interaction and realtime UI.
- **Server** — authentication, business logic, API endpoints and WebSocket handling.
- **Shared** — types and schemas shared by client and server.
- **Database** — persistent application data through Drizzle ORM.
- **Uploads** — application-managed file storage.

## Security considerations

Keep production secrets outside Git. Protect authentication/session configuration, validate uploaded files and inputs, and restrict access to administrative functionality.
