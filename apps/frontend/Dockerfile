FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
COPY apps/frontend/package*.json apps/frontend/
COPY packages/ui/package*.json packages/ui/
COPY packages/shared/package*.json packages/shared/
RUN npm install
COPY . .
RUN npm run build --workspace=@tailored/shared
RUN npm run build --workspace=@tailored/ui
RUN npm run build --workspace=@tailored/frontend

FROM nginx:1.27-alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
