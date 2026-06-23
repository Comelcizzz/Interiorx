# INTERIORIX

Business management platform for interior and exterior design projects (INTERIORIX).

## Quick start

```bat
start.bat
```

Open:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- Swagger: `http://localhost:4000/api/docs`

- [E2E: хто що робить (для нетехнічних, UK)](docs/E2E_FLOW_UK.md)
- [B2C-флоу — технічний опис (UK)](docs/B2C_FLOW_UK.md)
- [Інструкція для тестування (UK)](docs/TESTING_GUIDE_UK.md)

- [Опис для дипломної записки (UK)](help/README.md) — суть, бізнес-логіка, сторінки, стек
- [Повний аудит системи (UK)](docs/AUDIT_FULL_SYSTEM_UK.md) — усі сторінки, API, флоу, gaps
- [Флоу заявка → проєкт (UK)](docs/PROJECT_FLOW_UK.md)
- [Адміністрування та ролі](docs/ADMIN.md)
- [Користувацькі сценарії (UK)](docs/USER_FLOWS_UK.md)
- [E2E / MCP звіт](docs/E2E_MCP_AUDIT_REPORT.md)

## Current modules

- **Public:** marketing home, services catalog, portfolio, reviews, team, contact, receipt verify
- **Client portal:** dashboard, orders (new + detail), projects, invoices (mock pay), signed documents, reviews, notifications
- **Workspace:** dashboard, **my-work** (designer/worker), **orders** + order detail, projects + detail (inline measurements), estimates, measurements, payments, receipts, analytics, audit, users, review moderation, catalog/portfolio editor (admin/designer)
- Mock payment, PDF receipts, notifications, audit log
- **Removed from menu (redirect only):** map, calendar, kanban, operations — API still exists; see audit doc

## UI kit

Frontend uses the adapted `@tailored/ui` package for the workspace shell, glass cards, pill buttons, inputs, badges, navigation states and app theme tokens. The private source UI kit was used only as a local design reference; private names, URLs, logos and repository metadata are not included.

## Verified

Last verified: 2026-05-06.

```bash
npm run build
npm run lint
npm run test
start.bat
npm run smoke
npm run ui:smoke
npm run seed:report
```
