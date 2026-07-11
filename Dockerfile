# ---------- Desenvolvimento ----------
FROM node:24-alpine AS development

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN yarn install

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "yarn prisma generate && yarn start:dev"]


# ---------- Build ----------
FROM development AS builder

RUN yarn build


# ---------- Produção ----------
FROM node:24-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile --production
RUN yarn prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["yarn", "start:prod"]