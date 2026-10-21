# Multi-Stage Dockerfile for DevPulse Server
# Stage 1: Dependencies & Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY src ./src
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma/
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 5000

CMD ["node", "dist/index.js"]
