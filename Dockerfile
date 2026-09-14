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


# ---------- Client ----------
FROM node:24-alpine AS client-builder

RUN corepack enable

WORKDIR /client

COPY client/package.json client/yarn.lock client/.yarnrc.yml ./

RUN yarn install --immutable

COPY client/ ./

RUN yarn generate


# ---------- Produção ----------
FROM node:24-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN yarn install --immutable
RUN yarn prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=client-builder /client/.output/public ./public

EXPOSE 3000

CMD ["yarn", "start:prod"]
