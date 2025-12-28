# Pool Tables Manager — Scaffold (Demo)

This repository contains a minimal scaffold for the Pool Tables Manager app.

Services:
- backend: Node/Express app serving a small static frontend and simple API endpoints
- db: Postgres (for future use)

Quick start (requires Docker & Docker Compose):

```bash
docker compose up --build
```

Open http://localhost:3000 to view the demo UI.

Next steps:
- Implement DB schema and migrations (Prisma)
- Add session/table management, billing, subscriptions, reporting
- Add admin authentication and role-based access
- Add CI to build and publish container images
