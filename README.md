# ChatMod

> Modern full-stack chat moderation platform built with React, TypeScript, Node.js and PostgreSQL.

[![CI](https://github.com/korsetof/chatmod/actions/workflows/ci.yml/badge.svg)](https://github.com/korsetof/chatmod/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-informational)

ChatMod is a full-stack application for real-time chat, moderation workflows, authentication, file uploads and data management.

## Highlights

- 💬 Real-time chat and WebSocket communication
- 🛡️ Moderation-oriented architecture and access control
- 🔐 Session-based authentication and environment-based secrets
- 🗄️ PostgreSQL with Drizzle ORM
- ⚛️ React + Vite + TypeScript frontend
- 📎 File upload support
- 📊 UI prepared for moderation and analytics workflows
- 🚀 Deployment documentation and CI checks

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Realtime | WebSocket |
| Database | PostgreSQL, Drizzle ORM |
| Tooling | npm, GitHub Actions |
| Deployment | VPS / static hosting |

## Architecture

```text
┌──────────────────────┐
│      Browser         │
│ React + TypeScript   │
└──────────┬───────────┘
           │ HTTP / WebSocket
           ▼
┌──────────────────────┐
│   Node.js / Express  │
│ API + Auth + Chat    │
└───────┬────────┬─────┘
        │        │
        ▼        ▼
┌────────────┐ ┌──────────────┐
│ PostgreSQL │ │ File uploads │
│ + Drizzle  │ │ / storage    │
└────────────┘ └──────────────┘
```

## Project structure

```text
chatmod/
├── client/          # React frontend
├── server/          # Node.js backend
├── shared/          # Shared types / schemas
├── deploy/           # Deployment assets
├── uploads/          # Upload storage
├── docs/             # Project documentation
└── .github/          # CI, templates and repository automation
```

## Getting started

### 1. Clone

```bash
git clone https://github.com/korsetof/chatmod.git
cd chatmod
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and set your local PostgreSQL connection and application secrets.

> Never commit `.env`, passwords, API keys or production credentials.

### 4. Run checks

```bash
npm run check
```

Use the scripts from `package.json` for development, database migrations and production builds.

## Security

If you discover a security issue, please do **not** open a public issue. See [SECURITY.md](SECURITY.md).

Production credentials and server addresses should stay outside tracked documentation. See [DEPLOYMENT.md](DEPLOYMENT.md) for the sanitized deployment guide.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## Roadmap

- [ ] Expand moderation rules
- [ ] Improve moderation analytics
- [ ] Add more automated tests
- [ ] Improve observability and audit logging
- [ ] Document production deployment in more detail

## License

MIT — see [LICENSE](LICENSE).
