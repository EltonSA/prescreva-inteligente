FROM node:20-alpine AS api-builder

WORKDIR /build/api

COPY apps/api/package*.json ./
COPY apps/api/prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY apps/api/ .
RUN npm run build

FROM node:20-alpine AS web-builder

WORKDIR /build/web

COPY apps/web/package*.json ./
RUN npm ci

COPY apps/web/ .

RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

COPY --from=api-builder /build/api/dist ./api/dist
COPY --from=api-builder /build/api/node_modules ./api/node_modules
COPY --from=api-builder /build/api/package*.json ./api/
COPY --from=api-builder /build/api/prisma ./api/prisma
COPY --from=api-builder /build/api/uploads ./api/uploads

COPY --from=web-builder /build/web/.next/standalone ./web
COPY --from=web-builder /build/web/.next/static ./web/.next/static
COPY --from=web-builder /build/web/public ./web/public

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3000 3333

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/entrypoint.sh"]
