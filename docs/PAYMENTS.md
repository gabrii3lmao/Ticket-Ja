# Payments — Manual Confirmation

## Overview

The payment flow is **100% manual**, with no external payment gateway integration (ASAAS, Stripe, etc). Administrators verify and confirm or reject each payment through the admin panel.

**Flow:**

1. `POST /api/order` creates the order, tickets, and a payment record in a single `$transaction` (status `PENDING`, stock decremented).
2. The order appears in the admin panel (`GET /api/admin/payments-requests`).
3. The administrator verifies the payment manually (e.g., bank transfer, PIX confirmation, cash).
4. The administrator confirms (`PATCH /api/admin/payments-requests/:id/confirm`) or rejects (`PATCH /api/admin/payments-requests/:id/reject`) the payment.
5. Confirmation: Payment → `APPROVED`, Order → `PAID`.
6. Rejection: Payment → `REJECTED`, Order → `CANCELED`, stock restored, tickets → `CANCELED`.
7. Expiry: if the administrator does not act within the reservation TTL, `OrderExpirationService` (cron, every minute) cancels the order with the same side effects as a rejection, using the reason `Reservation TTL expired`.

The reservation deadline is stored on `Order.reservedUntil` and defaults to 15 minutes (`ORDER_RESERVATION_TTL_MINUTES`). Orders created before this feature have `reservedUntil = NULL` and are never expired.

**Response from `POST /api/order`:**

```json
{
  "id": "order-uuid",
  "status": "PENDING",
  "total": "525.00",
  "payment": {
    "id": "pay-uuid",
    "amount": "525.00",
    "status": "PENDING"
  }
}
```

## Module Structure

```
src/payment/
├── payment.module.ts     — module (exports PaymentService)
└── payment.service.ts    — markOrderPaid + releaseOrder

src/admin/
├── admin.controller.ts   — confirm/reject endpoints
├── admin.service.ts      — confirmation/rejection logic
└── dto/
    ├── query-order.dto.ts       — list filters
    └── reject-payment.dto.ts    — rejection reason

src/order/order-expiration/
└── order-expiration.service.ts  — cron job that expires PENDING reservations
```

## Prisma Schema

- `Payment` — `amount`, `status` (PENDING/APPROVED/REJECTED), `confirmedAt?`, `rejectedAt?`, `rejectReason?`, `orderId` (unique).
- `Order` — `status` (PENDING/PAID/CANCELED), `reservedUntil?` (reservation deadline), 1:1 relation with `Payment`, index on `[status, reservedUntil]`.
- Removed models: `GatewayCustomer`, `PaymentAccount`, `PaymentWebhookEvent`.

## Admin Endpoints

All endpoints require JWT authentication + `ADMIN` role.

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/admin/payments-requests` | List orders (default filter: status=PENDING) |
| `GET` | `/api/admin/payments-requests/:id` | Order detail with items, payment, and user info |
| `PATCH` | `/api/admin/payments-requests/:id/confirm` | Confirm payment |
| `PATCH` | `/api/admin/payments-requests/:id/reject` | Reject payment (body: `{ reason? }`) |

## State Transitions

| Action | Payment | Order | Tickets | Stock |
|--------|---------|-------|---------|-------|
| Confirm | `APPROVED` + `confirmedAt` | `PAID` | — | — |
| Reject | `REJECTED` + `rejectedAt` + `rejectReason` | `CANCELED` | `CANCELED` | Restored |
| Expire | `REJECTED` + `rejectedAt` + `rejectReason` | `CANCELED` | `CANCELED` | Restored |

All transitions are idempotent: `markOrderPaid`/`releaseOrder` only act if `order.status === PENDING`.

## Code Conventions

- Enums come from `generated/prisma/enums`; the client from `generated/prisma/client`.
- Confirmation/rejection operations are transactional (Prisma `$transaction`).
- Specs that import `PrismaService` need `jest.mock('generated/prisma/client', () => ({ PrismaClient: class {} }))`.

## Tests

- `src/payment/payment.service.spec.ts` — `markOrderPaid` (idempotency), `releaseOrder` (stock restoration, rejection reason).
- `src/admin/admin.service.spec.ts` — `confirmPayment`, `rejectPayment`, `listOrders`, `getOrderDetail`.
- `src/admin/admin.controller.spec.ts` — endpoint delegation tests.
- `src/order/order.service.spec.ts` — order creation without gateway.
- `src/order/order-expiration/order-expiration.service.spec.ts` — reservation expiry job.
- `test/ticket.e2e-spec.ts` — full purchase flow.
