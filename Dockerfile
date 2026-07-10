# --- ESTÁGIO 1: Build ---
FROM node:24-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copia arquivos de pacotes e a pasta prisma
COPY package.json yarn.lock ./
COPY prisma ./prisma/

# Instala todas as dependências (incluindo devDependencies para o build)
RUN yarn install --frozen-lockfile

# Copia todo o código fonte da sua API
COPY . .

# Gera o Prisma Client na nossa nova pasta visível
RUN yarn prisma generate

# Compila o projeto NestJS (a pasta dist/ vai incluir o client gerado)
RUN yarn build

# --- ESTÁGIO 2: Produção ---
FROM node:24-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json yarn.lock ./

# Instala apenas as dependências necessárias para rodar (sem devDependencies)
RUN yarn install --frozen-lockfile --production

# Copia a pasta dist (que já contém nosso Prisma compilado) e a pasta prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD [ "yarn", "start:prod" ]