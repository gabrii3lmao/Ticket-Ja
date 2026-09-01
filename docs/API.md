# Ticket Já API — Complete API Reference

All endpoints are prefixed with `/api`. Swagger docs are available at `/api/docs` in non-production environments.

## Table of Contents

- [Authentication](#authentication)
- [Roles](#roles)
- [Health](#health)
- [Auth](#auth)
- [Venue](#venue)
- [Event](#event)
- [Category](#category)
- [Order](#order)
- [Ticket](#ticket)
- [Admin](#admin)
- [Testing the Full Flow](#testing-the-full-flow)

---

## Authentication

Most endpoints require a valid JWT Bearer token. Obtain one via `POST /api/auth/signin` or `POST /api/auth/register`.

```
Authorization: Bearer <token>
```

Swagger UI supports the **Authorize** button (padlock icon) to set the token globally.

## Roles

| Role | Description |
|------|-------------|
| `BUYER` | Can purchase tickets, view own tickets |
| `ORGANIZER` | Can create venues, events, and categories |
| `ADMIN` | Full access including payment confirmation and organizer application review |

---

## Health

### `GET /api/health`

Check application health (Prisma DB ping).

**Auth:** Requires API key header (`x-api-key`).

**Response:**
```json
{
  "status": "ok",
  "info": { "prisma": { "status": "up" } }
}
```

---

## Auth

### `POST /api/auth/register`

Register a new user.

**Rate limit:** 3 requests/second.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@email.com",
  "password": "secret123",
  "role": "BUYER"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | |
| `email` | string | yes | Must be unique |
| `password` | string | yes | Min 6 characters |
| `role` | enum | no | `BUYER` (default) or `ORGANIZER` |
| `organizer` | object | conditional | Required if `role = "ORGANIZER"` |

**Organizer object:**
```json
{
  "legalName": "My Company LTDA",
  "tradeName": "My Events",
  "document": "12345678000190"
}
```

**Response `201`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:** `409` — Email already in use.

---

### `POST /api/auth/signin`

Sign in and get tokens.

**Rate limit:** 3 requests/second.

**Body:**
```json
{
  "email": "john@email.com",
  "password": "secret123"
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:** `401` — Invalid credentials.

---

### `POST /api/auth/refresh`

Refresh token pair.

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### `POST /api/auth/logout`

Revoke a refresh token.

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response `204`** — No content.

---

### `DELETE /api/auth/account`

Delete the authenticated user's account.

**Auth:** Any authenticated user.

**Response `204`** — No content.

---

## Venue

### `POST /api/venue`

Create a new venue.

**Auth:** `ORGANIZER` or `ADMIN`.

**Body:**
```json
{
  "name": "Arena São Paulo",
  "street": "Av. Paulista",
  "number": "1000",
  "district": "Bela Vista",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01310-100",
  "capacity": 45000
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | |
| `capacity` | integer | yes | Min 1 |
| `street` | string | no | |
| `number` | string | no | |
| `district` | string | no | |
| `city` | string | no | |
| `state` | string | no | 2 characters (e.g., "SP") |
| `zipCode` | string | no | |

**Response `201`:** Created venue object with `id`, `createdAt`, `updatedAt`.

---

### `GET /api/venue`

List venues (paginated, cached).

**Auth:** Public.

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | integer | 1 | Min 1 |
| `limit` | integer | 10 | 1–100 |
| `name` | string | — | Partial match |
| `city` | string | — | Partial match |
| `state` | string | — | Exact match (2 chars) |
| `minCapacity` | integer | — | |
| `maxCapacity` | integer | — | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Response `200`:**
```json
{
  "data": [{ "id": "...", "name": "...", "capacity": 45000, ... }],
  "meta": { "total": 42, "page": 1, "limit": 10, "totalPages": 5 }
}
```

---

### `GET /api/venue/:id`

Get venue by ID (cached).

**Auth:** Public.

**Response `200`:** Venue object. **`404`:** Not found.

---

### `PUT /api/venue/:id`

Update a venue.

**Auth:** `ORGANIZER` or `ADMIN` (owner only).

**Body:** Same as create, all fields optional.

**Response `200`:** Updated venue. **`404`:** Not found.

---

### `DELETE /api/venue/:id`

Delete a venue.

**Auth:** `ORGANIZER` or `ADMIN` (owner only).

**Response `204`:** No content. **`404`:** Not found.

---

## Event

### `POST /api/event`

Create a new event.

**Auth:** `ORGANIZER` or `ADMIN`.

**Body:**
```json
{
  "name": "Rock in Rio 2026",
  "description": "The biggest rock festival in the world",
  "artists": ["Iron Maiden", "Green Day", "Slipknot"],
  "startDate": "2026-09-25T18:00:00.000Z",
  "endDate": "2026-09-28T23:59:00.000Z",
  "imageUrl": "https://example.com/image.jpg",
  "minimumAge": 18,
  "venueId": "uuid-of-venue"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | |
| `artists` | string[] | yes | Non-empty array |
| `startDate` | datetime | yes | |
| `venueId` | string (UUID) | yes | Must reference an existing venue |
| `description` | string | no | |
| `endDate` | datetime | no | |
| `imageUrl` | string | no | Max 500 chars |
| `minimumAge` | integer | no | Min 0 |

**Response `201`:** Created event with `status: "DRAFT"`.

---

### `GET /api/event`

List events (paginated, cached).

**Auth:** Public.

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | integer | 1 | |
| `limit` | integer | 10 | 1–100 |
| `name` | string | — | Partial match |
| `city` | string | — | Partial match |
| `state` | string | — | |
| `startDate` | datetime | — | |
| `endDate` | datetime | — | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | string | `desc` | |

---

### `GET /api/event/:id`

Get event by ID (cached).

**Auth:** Public. **`404`:** Not found.

---

### `PUT /api/event/:id`

Update an event.

**Auth:** `ORGANIZER` or `ADMIN` (owner only).

**Body:** Same as create, all fields optional.

---

### `DELETE /api/event/:id`

Delete an event.

**Auth:** `ORGANIZER` or `ADMIN` (owner only). **`204`:** No content.

---

### `PATCH /api/event/:id/status`

Update event status (lifecycle).

**Auth:** `ORGANIZER` or `ADMIN` (owner only).

**Body:**
```json
{
  "status": "PUBLISHED"
}
```

Valid statuses: `DRAFT`, `PUBLISHED`, `FINISHED`, `CANCELED`.

**Response `200`:** Updated event.

---

## Category

### `POST /api/event/:eventId/category`

Create a ticket category under an event.

**Auth:** `ORGANIZER` or `ADMIN`.

**Body:**
```json
{
  "name": "VIP",
  "description": "Access to VIP lounge with open bar",
  "price": 500.00,
  "quantity": 500,
  "salesStart": "2026-01-01T00:00:00.000Z",
  "salesEnd": "2026-09-20T23:59:59.000Z"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | Max 100 chars |
| `price` | decimal | yes | Min 0 |
| `quantity` | integer | yes | Min 0 (stock) |
| `description` | string | no | |
| `salesStart` | datetime | no | When sales open |
| `salesEnd` | datetime | no | When sales close |

**Response `201`:** Created category.

---

### `GET /api/event/:eventId/category`

List categories for an event (cached).

**Auth:** Public.

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | integer | 1 | |
| `limit` | integer | 10 | 1–100 |
| `name` | string | — | Partial match |
| `minPrice` | number | — | |
| `maxPrice` | number | — | |
| `salesStartDate` | datetime | — | |
| `salesEndDate` | datetime | — | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | string | `desc` | |

---

### `GET /api/event/:eventId/category/:id`

Get category by ID (cached). **`404`:** Not found.

---

### `PATCH /api/event/:eventId/category/:id`

Update a category.

**Auth:** `ORGANIZER` or `ADMIN`.

**Body:** Same as create, all fields optional.

---

### `DELETE /api/event/:eventId/category/:id`

Delete a category. **`204`:** No content. **`404`:** Not found.

---

## Order

### `POST /api/order`

Purchase tickets. Creates order, tickets, and a payment record atomically.

**Auth:** Any authenticated user.

**Rate limit:** 5 requests/10 seconds.

**Body:**
```json
{
  "items": [
    { "categoryId": "uuid-of-category", "quantity": 2 },
    { "categoryId": "uuid-of-another-category", "quantity": 1 }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `items` | array | yes | Non-empty |
| `items[].categoryId` | string (UUID) | yes | Must exist, be on sale, and have stock |
| `items[].quantity` | integer | yes | Min 1 |

**Validation rules (enforced inside transaction):**
- Category must exist.
- Event must be `PUBLISHED`.
- Sales window must be active (between `salesStart` and `salesEnd`).
- Event must not have started yet.
- Stock must be sufficient (optimistic locking with `WHERE quantity >= requested`).
- Duplicate `categoryId` entries are aggregated into a single order item.

**Response `201`:**
```json
{
  "id": "order-uuid",
  "subtotal": "500.00",
  "discount": "0.00",
  "fee": "25.00",
  "total": "525.00",
  "status": "PENDING",
  "orderItems": [
    {
      "id": "oi-uuid",
      "quantity": 2,
      "unitPrice": "250.00",
      "total": "500.00",
      "tickets": [
        {
          "id": "ticket-uuid",
          "code": "TKT-aBcDeFgHiJkL",
          "qrCode": "http://localhost:3000/api/ticket/validate/TKT-aBcDeFgHiJkL",
          "status": "VALID"
        }
      ]
    }
  ],
  "payment": {
    "id": "pay-uuid",
    "amount": "525.00",
    "status": "PENDING"
  }
}
```

**Errors:** `400` — Insufficient stock, sales not started/ended, event not published, event already started. `404` — Category or user not found.

**Note:** A 5% fee is automatically added to the total.

---

## Ticket

### `GET /api/ticket`

List the current user's tickets (paginated).

**Auth:** Any authenticated user.

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | integer | 1 | |
| `limit` | integer | 10 | 1–100 |
| `status` | enum | — | `VALID`, `USED`, `CANCELED` |
| `code` | string | — | Partial match |
| `eventId` | string (UUID) | — | |
| `orderId` | string (UUID) | — | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | string | `desc` | |

**Response `200`:**
```json
{
  "data": [{ "id": "...", "code": "TKT-...", "status": "VALID", "event": { "name": "..." }, "orderItem": { "orderId": "...", "categoryId": "..." } }],
  "meta": { "total": 3, "page": 1, "limit": 10, "totalPages": 1 }
}
```

---

### `GET /api/ticket/validate/:code`

Validate a ticket by its code (public endpoint for QR code scanning).

**Auth:** Public (no token needed).

**Response `200`:**
```json
{
  "ticket": { "code": "TKT-...", "status": "VALID", "createdAt": "..." },
  "event": {
    "name": "Rock in Rio",
    "startDate": "2026-09-25T18:00:00.000Z",
    "venue": { "name": "Arena São Paulo", "city": "São Paulo", "state": "SP" }
  },
  "valid": true
}
```

`valid` is `true` only when `ticket.status === "VALID"` AND `event.status === "PUBLISHED"`.

**`404`:** Ticket not found.

---

### `GET /api/ticket/:id`

Get ticket details.

**Auth:** Any authenticated user (admin can see any ticket; buyers can only see their own).

**Response `200`:** Full ticket with `orderItem` (including `order` and `category`) and `event`.

---

### `PATCH /api/ticket/:id/use`

Mark a ticket as used.

**Auth:** Any authenticated user (owner or admin).

**Validation:** Ticket must be in `VALID` status. Uses optimistic locking (`UPDATE ... WHERE status = 'VALID'`).

**Response `200`:**
```json
{ "count": 1 }
```

**Errors:** `400` — Ticket already used or canceled. `403` — Not your ticket.

---

## Admin

All admin endpoints require the `ADMIN` role.

### `GET /api/admin/organizer-application`

List organizer applications (paginated).

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | integer | 1 | |
| `limit` | integer | 10 | 1–100 |
| `status` | enum | — | `PENDING`, `APPROVED`, `REJECTED` |
| `legalName` | string | — | Partial match |
| `tradeName` | string | — | Partial match |
| `document` | string | — | Exact match |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | string | `desc` | |

---

### `PATCH /api/admin/organizer-application/:id/approve`

Approve an organizer application. Creates an `OrganizerProfile` and promotes the user to `ORGANIZER` role.

**`400`:** Application is not pending. **`404`:** Not found.

---

### `PATCH /api/admin/organizer-application/:id/reject`

Reject an organizer application.

**Body:**
```json
{
  "rejectReason": "Invalid document provided"
}
```

---

### `GET /api/admin/payments-requests`

List orders for payment review (paginated).

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | integer | 1 | |
| `limit` | integer | 10 | 1–100 |
| `status` | enum | `PENDING` | `PENDING`, `PAID`, `CANCELED` |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | string | `desc` | |

---

### `GET /api/admin/payments-requests/:id`

Get order detail with items, payment, and user info.

**Response `200`:**
```json
{
  "id": "order-uuid",
  "status": "PENDING",
  "total": "525.00",
  "orderItems": [...],
  "payment": { "id": "pay-uuid", "amount": "525.00", "status": "PENDING" },
  "user": { "id": "user-uuid", "name": "John", "email": "john@email.com", "taxId": "...", "phone": "..." }
}
```

---

### `PATCH /api/admin/payments-requests/:id/confirm`

Confirm payment. Marks order as `PAID` and payment as `APPROVED`.

**Response `200`:** Success. **`404`:** Payment not found.

---

### `PATCH /api/admin/payments-requests/:id/reject`

Reject payment. Cancels order, restores stock, cancels tickets.

**Body:**
```json
{
  "reason": "Payment not confirmed within deadline"
}
```

`reason` is optional (max 500 chars).

---

## Testing the Full Flow

Here is a step-by-step walkthrough using `curl` to test the complete application flow.

### 1. Register an Organizer

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Organizer",
    "email": "organizer@test.com",
    "password": "123456",
    "role": "ORGANIZER",
    "organizer": {
      "legalName": "Test Events LTDA",
      "tradeName": "Test Events",
      "document": "12345678000190"
    }
  }'
```

Save the `accessToken` from the response.

### 2. Create a Venue

```bash
curl -X POST http://localhost:3000/api/venue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <organizer_token>" \
  -d '{
    "name": "Test Arena",
    "capacity": 10000,
    "city": "São Paulo",
    "state": "SP"
  }'
```

Save the `id` as `venueId`.

### 3. Create an Event

```bash
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <organizer_token>" \
  -d '{
    "name": "Test Concert",
    "artists": ["Test Artist"],
    "startDate": "2026-12-31T20:00:00.000Z",
    "venueId": "<venueId>"
  }'
```

Save the `id` as `eventId`.

### 4. Publish the Event

```bash
curl -X PATCH http://localhost:3000/api/event/<eventId>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <organizer_token>" \
  -d '{ "status": "PUBLISHED" }'
```

### 5. Create a Ticket Category

```bash
curl -X POST http://localhost:3000/api/event/<eventId>/category \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <organizer_token>" \
  -d '{
    "name": "General Admission",
    "price": 100.00,
    "quantity": 500,
    "salesStart": "2026-01-01T00:00:00.000Z",
    "salesEnd": "2026-12-30T23:59:59.000Z"
  }'
```

Save the `id` as `categoryId`.

### 6. Register a Buyer

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Buyer",
    "email": "buyer@test.com",
    "password": "123456"
  }'
```

Save the `accessToken` as `buyer_token`.

### 7. Purchase Tickets

```bash
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <buyer_token>" \
  -d '{
    "items": [{ "categoryId": "<categoryId>", "quantity": 2 }]
  }'
```

The response includes the order, tickets (with codes), and a `PENDING` payment.

### 8. Admin: Log In

```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@email.com", "password": "123456" }'
```

Save the `accessToken` as `admin_token`.

### 9. Admin: View Pending Payments

```bash
curl http://localhost:3000/api/admin/payments-requests \
  -H "Authorization: Bearer <admin_token>"
```

### 10. Admin: Confirm Payment

```bash
curl -X PATCH http://localhost:3000/api/admin/payments-requests/<orderId>/confirm \
  -H "Authorization: Bearer <admin_token>"
```

The order status is now `PAID`.

### 11. Buyer: View Tickets

```bash
curl http://localhost:3000/api/ticket \
  -H "Authorization: Bearer <buyer_token>"
```

### 12. Validate a Ticket (QR Code Scan)

```bash
curl http://localhost:3000/api/ticket/validate/<ticket_code>
```

Returns `valid: true` if the ticket is `VALID` and the event is `PUBLISHED`.

### 13. Mark Ticket as Used

```bash
curl -X PATCH http://localhost:3000/api/ticket/<ticketId>/use \
  -H "Authorization: Bearer <buyer_token>"
```

### 14. Verify Ticket is No Longer Valid

```bash
curl http://localhost:3000/api/ticket/validate/<ticket_code>
```

Now returns `valid: false` with `status: "USED"`.
