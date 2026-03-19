FROM node:18-alpine AS builder

WORKDIR /app

COPY apps/api/package*.json ./
COPY apps/api/prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY apps/api/ .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/uploads ./uploads

ENV NODE_ENV=production

EXPOSE 3333

CMD ["node", "dist/server.js"]
