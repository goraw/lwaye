FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL=http://127.0.0.1:4000
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY . .
RUN npm run build --workspace @lwaye/admin

FROM nginx:1.27-alpine AS runner
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
