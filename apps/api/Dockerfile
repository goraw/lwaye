FROM node:22-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY . .
EXPOSE 4000
CMD ["node", "--import", "tsx", "apps/api/src/main.ts"]
