# Legacy Prisma artifacts

This folder may contain historical Prisma schema and seed scripts from an earlier Postgres-based prototype.

**The running product uses MongoDB with Mongoose** (`apps/backend/src/mongo`). All application data models live there; do not treat `schema.prisma` as the source of truth for the current stack.

If you still need Prisma Client for one-off tooling, run the usual `prisma generate` in this package. For normal development, use `npm run seed` (Mongo seed) and the Nest API only.
