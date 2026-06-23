FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/backend/package*.json apps/backend/
COPY apps/backend/tsconfig*.json apps/backend/
COPY packages/shared/package*.json packages/shared/
RUN npm install
COPY . .
RUN npm run build --workspace=@tailored/shared
RUN npm run build --workspace=@tailored/backend

FROM node:22-alpine AS runtime
WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/backend/package*.json apps/backend/
COPY apps/backend/tsconfig*.json apps/backend/
COPY packages/shared/package*.json packages/shared/
RUN npm install
ENV NODE_ENV=production
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/backend/src apps/backend/src
COPY --from=build /app/apps/backend/scripts apps/backend/scripts
COPY --from=build /app/apps/backend/libs apps/backend/libs
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/shared/src packages/shared/src
COPY apps/backend/scripts/render-start.mjs apps/backend/scripts/render-start.mjs
COPY apps/backend/scripts/demo-assets.ts apps/backend/scripts/demo-assets.ts
COPY apps/backend/scripts/ensure-demo-assets.ts apps/backend/scripts/ensure-demo-assets.ts
EXPOSE 4000
CMD ["node", "apps/backend/scripts/render-start.mjs"]
