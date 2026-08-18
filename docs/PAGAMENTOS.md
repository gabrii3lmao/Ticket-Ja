# Pagamentos — ASAAS / PIX

## Visão geral

O módulo de pagamentos abstrai o gateway através de um **Strategy Pattern** (`PaymentProvider`). Hoje existe apenas o provedor **ASAAS (PIX)**, mas a estrutura permite adicionar novos gateways (Stripe, Mercado Pago, etc.) sem alterar o fluxo de pedidos.

Fluxo de compra:

1. `POST /api/order` cria o pedido e os tickets dentro de uma `$transaction` (status `PENDING`, estoque decrementado).
2. Fora da transação, o `OrderService` chama o gateway:
   - `ensureGatewayCustomer(userId, provider)` — encontra ou cria o `GatewayCustomer` (find-or-create com dedup por `@@unique([userId, provider])`, tratando `P2002`).
   - `createPayment(order, gatewayCustomer, ...)` — gera o PIX com vencimento de 30 min (`PIX_EXPIRATION_MS`).
3. O `Payment` resultante é atualizado no banco (`externalId`, `providerData`, `dueDate`) e anexado à resposta:

```json
{
  "id": "order-uuid",
  "status": "PENDING",
  "total": "525.00",
  "payment": {
    "id": "pay-uuid",
    "externalId": "pay_test",
    "providerData": { "pixCopiaECola": "...", "pixQrCode": "..." },
    "dueDate": "2026-08-18T15:30:00.000Z",
    "status": "PENDING"
  }
}
```

Se o gateway falhar, o pedido continua `PENDING` no banco e a API responde `502 Bad Gateway`; o job de expiração libera o estoque depois.

## Estrutura do módulo

```
src/payment/
├── payment.module.ts              — módulo (controllers/services/guard/expiry)
├── payment.controller.ts          — PaymentService (chamadas via SDK)
├── payment.service.ts             — orquestrador: delegações + markOrderPaid/releaseOrder
├── payment-expiry.service.ts      — job @Cron(EVERY_5_MINUTES)
├── interfaces/
│   ├── payment-provider.interface.ts          — contrato do provider
│   ├── payment-provider-config.interface.ts   — contrato de config
│   └── dto/
│       ├── create-customer.dto.ts
│       └── create-payment.dto.ts
├── providers/
│   ├── base.payment-provider.ts   — base abstrata compartilhada
│   └── asaas/
│       ├── asaas.config.ts        — AsaasConfig (env, getOrThrow)
│       ├── asaas.payment-provider.ts
│       └── asaas.types.ts
├── strategy/
│   └── payment-provider.factory.ts — resolve provider por PaymentProvider
└── webhooks/
    ├── asaas-webhook.controller.ts
    ├── asaas-webhook.guard.ts     — valida header access_token
    └── asaas-webhook.service.ts    — dedup + transições de estado
```

## Schema (Prisma)

- `Payment` — `provider`, `externalId`, `providerData Json?`, `dueDate DateTime?`, `status`.
- `GatewayCustomer` — mapeia `userId` → `customerId` por `provider`, com `@@unique([userId, provider])`.
- `PaymentWebhookEvent` — histórico de webhooks com `@@unique([provider, eventId])`.

## Webhook

Rota: `POST /api/payments/webhook/asaas` — pública, mas protegida pelo `AsaasWebhookGuard` (exige o header `access_token` igual a `ASAAS_WEBHOOK_TOKEN`).

**Dedup:** `eventId = "${externalId}:${event}"`. O registro só é gravado **depois** de processar com sucesso — se qualquer transição lançar erro, o evento não é registrado e o ASAAS reenvia.

**Transições por `event`:**

| Evento ASAAS | Ação |
|---|---|
| `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED` | `markOrderPaid` → order `PAID`, tickets `ACTIVE`, estoque mantido |
| `PAYMENT_OVERDUE`, `PAYMENT_CANCELED`, `PAYMENT_FAILED` | `releaseOrder` → payment `FAILED`, order `CANCELED`, estoque devolvido, tickets `CANCELED` |
| `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED` | `releaseOrder` → payment `REFUNDED`, order `REFUNDED`, estoque devolvido |
| outros (`PAYMENT_ANTICIPATED`, `PAYMENT_DUNNING_*`, ...) | ignorado |

Transições são idempotentes: `markOrderPaid`/`releaseOrder` só agem se `order.status === PENDING`.

**Eventos órfãos:** se não houver `Payment` para o `externalId`, o evento é registrado com `processedAt` e a resposta é `{ received: true, processed: false, reason: 'payment_not_found' }` (sem erro, para não disparar retries em lote).

## Expiração de pagamentos

`PaymentExpiryService` roda a cada **5 minutos** (`@Cron(CronExpression.EVERY_5_MINUTES)`):

1. Busca pagamentos `PENDING` com `dueDate < now` e `order.status === PENDING`.
2. Se houver `externalId`, tenta `cancelPayment` no gateway (falha é engolida — "segue o jogo").
3. `releaseOrder(p.orderId, p.id, FAILED, CANCELED)` — libera o estoque e cancela o pedido.

## Configuração

```bash
ASAAS_API_KEY=        # chave da API ASAAS (sandbox ou produção)
ASAAS_BASE_URL=       # ex.: https://sandbox.asaas.com/api/v3
ASAAS_WEBHOOK_TOKEN=  # token para autenticar webhooks
```

Todas as variáveis são lidas via `ConfigService`; `AsaasConfig.getOrThrow()` lança erro de startup se faltarem.

## Convenções de código

- Enums vêm de `generated/prisma/enums`; o client de `generated/prisma/client`.
- Chamadas HTTP ao gateway ficam **fora** da `$transaction` (evita segurar conexão do banco).
- Specs que importam `PrismaService` precisam de `jest.mock('generated/prisma/client', () => ({ PrismaClient: class {} }))`.

## Testes

- `src/payment/payment.service.spec.ts` — delegações, `ensureGatewayCustomer` (incl. `P2002`), `markOrderPaid`, `releaseOrder`.
- `src/payment/payment.controller.spec.ts` — roteamento do `PaymentService`.
- `src/payment/webhooks/asaas-webhook.service.spec.ts` — dedup, evento órfão, transições por evento, retry após falha.
- `src/payment/payment-expiry.service.spec.ts` — job de expiração (cenários com/sem `externalId`, erro de gateway).
- `src/order/order.service.spec.ts` — integração do pedido com o gateway (happy path, `NotFoundException` de user, `BadGatewayException`).
- `test/ticket.e2e-spec.ts` — stub do `PaymentService` via `overrideProvider`.

> O e2e exige PostgreSQL rodando e as chaves ASAAS no `.env` (`AsaasConfig.getOrThrow`).