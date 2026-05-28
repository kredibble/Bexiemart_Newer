# BexieMart — Production Readiness Audit Report

> Audit date: 2026-05-27
> Server TS errors: 0 | Mobile TS errors: 8 (7 missing module decls, 1 overload)

---

## Table of Contents

1. [CRITICAL — Security](#1-critical--security)
2. [CRITICAL — Error Handling & UX](#2-critical--error-handling--ux)
3. [HIGH — API & Backend Issues](#3-high--api--backend-issues)
4. [HIGH — Frontend Code Quality](#4-high--frontend-code-quality)
5. [MEDIUM — Architecture & Scalability](#5-medium--architecture--scalability)
6. [MEDIUM — Styling & Polish](#6-medium--styling--polish)
7. [LOW — Nice To Have](#7-low--nice-to-have)
8. [AI Sloppiness Score](#8-ai-sloppiness-score)
9. [FIX ORDER RECOMMENDATION](#9-fix-order-recommendation)

---

## 1. 🔴 CRITICAL — Security

### 1.1 Paystack Webhook — No HMAC Signature Verification

**Files:** `apps/server/src/modules/payments/payments.service.ts:129-243`

**Problem:** `handleWebhook()` accepts any POST body with zero authentication. An attacker can forge `charge.success` events to mark orders as paid, trigger escrow creation, etc.

**Fix:**
1. Verify Paystack HMAC SHA256 signature using the secret key
2. The raw body parser middleware at `apps/server/src/middleware/raw-body.middleware.ts:5` checks `req.path === "/webhooks/paystack"` but the actual endpoint is `/api/payments/webhook` (global prefix `api`) — this is dead code and never fires. Fix the path check.

```typescript
// In payments.service.ts or a dedicated guard:
const hash = crypto
  .createHmac("sha256", paystackSecretKey)
  .update(rawBody)
  .digest("hex");
const signature = req.headers["x-paystack-signature"];
if (hash !== signature) throw new UnauthorizedException("Invalid signature");
```

### 1.2 Wallet Transfer — PIN Never Verified

**Files:** `apps/server/src/modules/wallet/wallet.controller.ts:53-55`

**Problem:** `transfer()` accepts a `TransferDto` with a `pin` field (`apps/server/src/modules/wallet/dto/transfer.dto.ts:12`) but the PIN is **never checked** against the stored `pinHash` in the Wallet model. Any logged-in session can drain wallets.

**Fix:** Verify the PIN in `wallet.service.ts` before executing transfer:

```typescript
// In wallet.service.ts transfer() method:
const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
if (!wallet.pinHash) throw new BadRequestException("Wallet PIN not set");
const isValid = await bcrypt.compare(pin, wallet.pinHash);
if (!isValid) throw new BadRequestException("Invalid wallet PIN");
```

### 1.3 Wallet Withdraw — `body: any`, No PIN Check, No DTO

**Files:**
- `apps/server/src/modules/wallet/wallet.controller.ts:46-48` — uses `body: any`, withdraws without PIN
- `apps/server/src/modules/wallet/wallet.controller.ts:45-46` — AI internal monologue comment left in prod

**Fix:**
1. Use the existing `WithdrawDto` (import it)
2. Verify PIN before withdrawal
3. Remove the AI monologue comment

### 1.4 Coupons — `currentUses` Never Incremented

**Files:** `apps/server/src/modules/coupons/coupons.service.ts:9-27`

**Problem:** `validate()` reads `coupon.currentUses` but **never increments it** after successful validation. A coupon with `maxUses: 100` can be used infinitely.

**Fix:** After successful validation, increment `currentUses`:

```typescript
await this.prisma.coupon.update({
  where: { id: coupon.id },
  data: { currentUses: { increment: 1 } },
});
```

### 1.5 Stock Race Condition — Validation Outside Transaction

**Files:** `apps/server/src/modules/orders/orders.service.ts:33-41`

**Problem:** Stock validation (`if (product.stock < quantity)`) occurs BEFORE the `$transaction`. Two concurrent requests can both pass validation, then both decrement stock below zero.

**Fix:** Move stock validation INSIDE the `$transaction`:

```typescript
return this.prisma.$transaction(async (tx) => {
  for (const item of validatedItems) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product || product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${item.productName}`);
    }
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }
  // ... create order
});
```

### 1.6 Rate Limiting Gaps

**Files:**
- `apps/server/src/modules/coupons/coupons.controller.ts:13` — no throttle on coupon validation (attacker can brute-force codes)
- `apps/server/src/modules/wallet/wallet.controller.ts:50-55` — `transfer()` has no throttle
- `apps/server/src/chat/chat.gateway.ts` — WebSocket events (`send_message`, etc.) have no rate limiting

**Fix:** Add `@Throttle()` decorators to coupon validation and wallet transfer. Add rate limiting in the WebSocket gateway.

### 1.7 CORS Too Permissive

**Files:** `apps/server/src/main.ts:16-19`

**Problem:** `origin: true` in production reflects any origin.

**Fix:** Restrict to known domains or use an allowlist from env config:

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(",") ?? true,
  credentials: true,
});
```

### 1.8 Admin Role Registration

**Files:** `apps/server/src/auth/dto/register.dto.ts:14-16`

**Problem:** `role?: string` — missing `@IsIn(["customer", "vendor"])`. Nothing prevents setting `role: "admin"` in the future if code changes.

**Fix:** Add `@IsIn(["customer", "vendor"])` decorator.

### 1.9 Coupon Validation — Missing Auth Guard

**Files:** `apps/server/src/modules/coupons/coupons.controller.ts:1-17`

**Problem:** No auth guard on the controller. Unauthenticated users can validate coupons.

**Fix:** Add `@UseGuards(AuthGuard)` to the controller class.

---

## 2. 🔴 CRITICAL — Error Handling & UX

### 2.1 No Error Boundaries

**Files:** Entire mobile app (`apps/mobile/app/`)

**Problem:** Zero `<ErrorBoundary>` components exist. Any render crash = white screen of death with no recovery.

**Fix:** Create a reusable `ErrorBoundary` component and wrap root layouts:

```typescript
// src/components/ui/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorScreen />;
    }
    return this.props.children;
  }
}
```

Wrap in `app/_layout.tsx` and each tab `_layout.tsx`.

### 2.2 30+ Screens Missing Error/Loading States

**Files:** See audit table below. Nearly every customer/vendor/dispatcher screen.

**Problem:** Most screens have NO loading indicator and NO error state. Network failures silently show blank content or infinite spinners.

**Screens with missing error states (partial list):**

| Screen | Missing Loading | Missing Error | Missing Empty |
|--------|:-:|:-:|:-:|
| `(home)/index.tsx` | ❌ | ❌ | ❌ |
| `(shop)/index.tsx` | ❌ | ❌ | ❌ |
| `tabs/profile.tsx` | ❌ | ❌ | ❌ |
| `cart.tsx` | ❌ | ❌ | ✅ |
| `services.tsx` | ❌ | ❌ | ✅ |
| `orders.tsx` | ❌ | ❌ | ✅ |
| `addresses.tsx` | ❌ | ❌ | ❌ |
| `search.tsx` | ✅ (partial) | ❌ | ❌ |
| `flash-sales.tsx` | ❌ | ❌ | ❌ |
| `favorites/index.tsx` | ❌ | ❌ | ❌ |
| `notifications.tsx` | ❌ | ❌ | ❌ |
| `food.tsx` | ❌ | ❌ | ❌ |
| `restaurant/[id].tsx` | ❌ | ❌ | ❌ |
| `store/[id].tsx` | ❌ | ❌ | ❌ |
| Vendor dashboard | ❌ | ❌ | ❌ |
| Dispatcher home | ❌ | ❌ | ❌ |
| `referrals.tsx` | ❌ | ❌ | ❌ |

**Fix pattern (apply to all screens):**

```typescript
const { data, isLoading, isError, error, refetch } = useQuery({ ... });

if (isLoading) return <LoadingSpinner />;
if (isError) return (
  <ErrorState 
    message={error.message} 
    onRetry={() => refetch()} 
  />
);
if (!data || data.length === 0) return <EmptyState ... />;
// render data
```

### 2.3 No Retry-on-Error Pattern

**Problem:** Zero screens implement retry buttons. Users have no way to recover from transient failures.

**Fix:** Create a reusable `ErrorState` component with a retry button. Add `refetch()` calls on retry press to all query-based screens.

### 2.4 Silent Error Swallowing in Auth Controller

**Files:** `apps/server/src/auth/auth.controller.ts:71-73`

**Problem:** If vendor profile creation fails during registration, the user gets `{ success: true }` with no indication of failure. They register as "vendor" but have no VendorProfile.

**Fix:** Remove the try/catch or re-throw the error after logging:

```typescript
try {
  // create vendor profile
} catch (e) {
  console.error("Failed to create vendor profile:", e);
  throw new InternalServerErrorException("Failed to complete vendor setup");
}
```

### 2.5 Empty Catch Block in Products Visit Tracking

**Files:** `apps/server/src/modules/products/products.service.ts:175`

**Problem:** `catch(e) {}` — total silence on visit-tracking failure.

**Fix:** At minimum log the error.

---

## 3. 🟡 HIGH — API & Backend Issues

### 3.1 Mass Assignment / `body: any` Endpoints

| File | Line | Current | Fix |
|------|------|---------|-----|
| `wallet.controller.ts` | 46 | `withdraw(@Body() body: any)` | Import and use `WithdrawDto` |
| `wallet.controller.ts` | 173 | Inline anonymous type | Create `VerifyCardDto` |
| `wallet.service.ts` | 345 | `addCard(userId, data: any)` | Create `AddCardDto` |
| `wallet.service.ts` | 371 | `updateCard(userId, cardId, data: any)` | Create `UpdateCardDto` |
| `wallet.service.ts` | 447 | `linkBankAccount(userId, data: {...})` | Create `LinkBankDto` |
| `wallet.service.ts` | 500 | `linkMomoAccount(userId, data: {...})` | Create `LinkMomoDto` |
| `dispatcher.controller.ts` | 20 | `createProfile(@Body() dto: any)` | Create `CreateDispatcherDto` |
| `dispatcher.controller.ts` | 26,32,50,56,82 | Multiple inline types | Create DTOs for each |
| `admin.service.ts` | 94 | `updateConfig(data: any)` | Create `UpdateConfigDto` |

### 3.2 N+1 Query Problems

#### Chat — Conversation Unread Count
**Files:** `apps/server/src/modules/chat/chat.service.ts:41-52`

**Problem:** For each conversation, a separate `message.count()` query runs. With 100 conversations = 101 queries.

**Fix:** Use raw SQL with `GROUP BY` or a single batch query:

```typescript
const unreadCounts = await this.prisma.message.groupBy({
  by: ["conversationId"],
  where: {
    conversationId: { in: conversationIds },
    senderId: { not: userId },
    readAt: null,
  },
  _count: { id: true },
});
```

#### Admin — Vendor Stats
**Files:** `apps/server/src/modules/admin/admin.service.ts:55-71`

**Problem:** For each vendor, a separate `orderItem.findMany()` runs to calculate order stats.

**Fix:** Use aggregation with `groupBy` or a single query with `include`.

#### Vendor Customers — User Lookups
**Files:** `apps/server/src/modules/vendor-customers/vendor-customers.service.ts:24-31`

**Problem:** For each order item, `user.findUnique()` is called one by one.

**Fix:** Collect user IDs and use `findMany({ where: { id: { in: ids } } })`.

### 3.3 Missing Pagination — 11 List Endpoints

| Endpoint | File | Line |
|----------|------|------|
| `GET /vendor/products` | `vendor.controller.ts` | 39 |
| `GET /vendor/orders` | `vendor.controller.ts` | 63 |
| `GET /orders` | `orders.controller.ts` | 22 |
| `GET /admin/vendors` | `admin.controller.ts` | 41 |
| `GET /services` | `customer-services.controller.ts` | 14 |
| `GET /services/bookings` | `customer-services.controller.ts` | 33 |
| `GET /food/restaurants` | `food.controller.ts` | 15 |
| `GET /food/items` | `food.controller.ts` | 27 |
| `GET /food/orders` | `food.controller.ts` | 74 |
| `GET /dispatcher/tasks/available` | `dispatcher.controller.ts` | 37 |
| `GET /reviews/product/:id` | `reviews.controller.ts` | 22 |

**Fix:** Add `page` and `limit` query params to all list endpoints. Use `skip`/`take` on Prisma queries. Return `{ data, total, page, pages }`.

### 3.4 Inefficient Queries

| File | Line | Problem | Fix |
|------|------|---------|-----|
| `admin.service.ts` | 24-36 | `getUser()` loads ALL orders, payments, wallet, vendorProfile in one query | Add pagination or selective includes |
| `vendor.service.ts` | 167-211 | `getOrders()` loads ALL order items with full order details, no pagination | Add pagination |
| `dispatcher.service.ts` | 189-227 | Loads 50 transactions then filters in-memory for today/week | Use Prisma date filters |
| `dispatcher.service.ts` | 249-287 | `getAnalytics()` loads ALL completed rides + all earnings | Use aggregation |

### 3.5 Missing Connection Pooling

**Files:** `apps/server/src/prisma/prisma.service.ts:6-16`

**Problem:** No `connection_limit` configured in PrismaClient constructor.

**Fix:**
```typescript
new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL + "&connection_limit=10" },
  },
});
```

### 3.6 Auth Guard — Token Passed as Cookie Header

**Files:** `apps/server/src/guards/auth.guard.ts:23`

**Problem:** The Bearer token is passed to better-auth as a `cookie` header value. This could appear in server logs.

**Fix:** Strip the token from any response logging. Consider using a proper proxy header.

### 3.7 Inconsistent Guard Pattern on Escrow

**Files:** `apps/server/src/modules/escrow/escrow.controller.ts:8-44`

**Problem:** `@UseGuards(AuthGuard)` is on each method instead of class-level. Easy to miss on new methods.

**Fix:** Move to class level.

### 3.8 Missing Indexes

**Files:** `apps/server/prisma/schema.prisma`

| Model | Field | Why |
|-------|-------|-----|
| `Escrow` | `vendorWalletId` | Queried for vendor escrow lookups |
| `ServiceBooking` | `status` | Filtered by PENDING/CONFIRMED |
| `DispatcherProfile` | `lastLocationAt` | Geoqueries for nearby dispatchers |
| `VendorDocument` | `status` | Admin queries for PENDING documents |
| `Notification` | `type` | Filtered by notification type |

**Fix:** Add `@@index([field])` to each model.

### 3.9 Missing Cascade Deletes

**Files:** `apps/server/prisma/schema.prisma`

| Model | Relation | Line |
|-------|----------|------|
| `Wallet` → `BankAccount` | Missing `onDelete: Cascade` | ~639 |
| `Wallet` → `MomoAccount` | Missing `onDelete: Cascade` | ~655 |
| `Wallet` → `Transaction` | Missing `onDelete: Cascade` | ~616 |
| `User` → `Wallet` | Missing `onDelete: Cascade` | ~595 |

**Fix:** Add `onDelete: Cascade` to each relation.

### 3.10 Missing Unique Constraint

**Files:** `apps/server/prisma/schema.prisma:1001-1013`

**Model:** `FoodOrderItem` — no unique constraint on `orderId + foodItemId`.

**Fix:** Add `@@unique([orderId, foodItemId])`.

---

## 4. 🟡 HIGH — Frontend Code Quality

### 4.1 `as any` / `: any` Pervasive — 26 files

**Worst offenders (fix these first):**

| File | Line(s) | Issue |
|------|---------|-------|
| `src/lib/stores/auth-store.ts` | 23, 28-29 | `user: any|null` — infects ALL downstream usage |
| `src/lib/api/wallet.ts` | 15-19 | `data: any` on 4 functions |
| `src/lib/api/orders.ts` | 4 | `shippingAddress: any` |
| `app/(customer)/checkout.tsx` | 38, 89-90 | `i: any`, `...as any` in mutation |
| `app/(customer)/(tabs)/cart.tsx` | 50, 87-94 | `i: any`, `group: any` |
| `app/(customer)/(tabs)/(home)/index.tsx` | 67-70, 255, 380, 454 | `p: any`, `cat: any`, `item: any` |
| `app/(customer)/product/[id].tsx` | 117, 218, 247 | `_: any, i: any`, `review: any` |
| `app/(customer)/(tabs)/reels.tsx` | 31, 36, 70 | `activeReelForComments: any` |
| `app/(customer)/(tabs)/_layout.tsx` | 22, 44 | `CustomTabBar({ ... }: any)` |
| `src/lib/api/upload.ts` | 16 | `file as any` |

**Fix:** Replace `: any` with proper types. Define interfaces for API responses, store state, and component props.

### 4.2 Hardcoded "GHS " Currency — 15+ files

**Files:** `ProductCard.tsx`, `(home)/index.tsx`, `cart.tsx`, `product/[id].tsx`, `checkout.tsx`, `reels.tsx`, `services.tsx`, `search.tsx`, `orders.tsx`, `vendor/earnings/transactions.tsx`, `wallet-store.ts`, etc.

**Fix:** Create a currency utility:

```typescript
// src/lib/utils/format.ts
export function formatPrice(amount: number, currency = "GHS"): string {
  return `${currency} ${amount.toFixed(2)}`;
}
```

Replace ALL instances of `"GHS " + ...` or `` `GHS ${...}` `` with `formatPrice(...)`.

### 4.3 29 Console.log Statements Left In

**Files with console.log:**

| File | Lines |
|------|-------|
| `src/lib/stores/address-store.ts` | 34, 44, 54, 64, 74 |
| `src/lib/stores/payment-store.ts` | 34, 44, 54, 64, 74 |
| `src/lib/stores/product-store.ts` | 70, 80 |
| `src/lib/stores/reels-store.ts` | 54, 77, 118 |
| `src/lib/stores/services-store.ts` | 49, 59, 68, 78 |
| `src/lib/stores/wallet-store.ts` | 57, 67, 77, 105 |
| `app/(customer)/reels.tsx` | 48 |
| `app/(customer)/chats/[id].tsx` | 61 |
| `app/(customer)/wallet/topup.tsx` | 44 |
| `app/(customer)/referrals.tsx` | 42 |
| `app/(dispatcher)/chats/[id].tsx` | 61 |
| `app/(vendor)/chats/[id].tsx` | 61 |

**Fix:** Remove all `console.log` statements. Replace with structured logging if needed.

### 4.4 Inline Test Data

**Files to clean up:**

| File | Lines | What |
|------|-------|------|
| `(home)/index.tsx` | 12-50 | `HERO_BANNERS`, `SHOPS`, `QUICK_ACTIONS`, `FILTER_PILLS`, `FEATURED_HIGHLIGHTS` — all hardcoded mock data |
| `search.tsx` | 11 | `RECENT_SEARCHES = ["Wireless Earbuds", ...]` |
| `services.tsx` | 9-22 | `CATEGORIES`, `PROMO_BANNERS` |
| `services/[id].tsx` | 11, 187 | `DATES` hardcoded, time slots hardcoded |
| `cart.tsx` | 36 | `"BEXIE10"` coupon code hardcoded |

**Fix:** Remove hardcoded mock data. Replace with API data. If no API data exists yet, load from env/constants file.

### 4.5 Edit-Profile Screens — 3x Copy-Pasted (~214 lines each)

**Files:**
- `apps/mobile/app/(customer)/edit-profile.tsx`
- `apps/mobile/app/(dispatcher)/edit-profile.tsx`
- `apps/mobile/app/(vendor)/(settings)/profile.tsx`

**Fix:** Extract shared logic into a custom hook `useEditProfile()` or a reusable `<ProfileForm>` component.

### 4.6 Chat Screens — 3x Copy-Pasted (~165 lines each)

**Files:**
- `apps/mobile/app/(customer)/chats/[id].tsx`
- `apps/mobile/app/(dispatcher)/chats/[id].tsx`
- `apps/mobile/app/(vendor)/chats/[id].tsx`

**Fix:** Extract shared logic into a reusable `<ChatView>` component.

### 4.7 Dual State Systems — Dead Zustand Stores

**Files (likely dead — superseded by React Query):**
- `apps/mobile/src/lib/stores/product-store.ts`
- `apps/mobile/src/lib/stores/services-store.ts`

**Fix:** Verify these are unused (`grep` for imports). If confirmed dead, delete them.

### 4.8 Missing Persist on Zustand Stores

**Problem:** Cart, favorites, and food-cart stores lose all state on app restart.

**Files that need `persist` middleware:**

| Store | File |
|-------|------|
| `cart-store.ts` | `src/lib/stores/cart-store.ts` |
| `favorites-store.ts` | `src/lib/stores/favorites-store.ts` |
| `food-cart-store.ts` | `src/lib/stores/food-cart-store.ts` |

### 4.9 Raw `fetch()` Bypasses Axios Interceptors

**Files:** `apps/mobile/src/lib/api/upload.ts:19`

**Problem:** Uses `fetch()` directly instead of `apiClient`. The 401 interceptor (auto-logout) never fires for upload failures.

**Fix:** Switch to `apiClient.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })`.

### 4.10 One Orphaned Hook

**Files:**
- `apps/mobile/src/hooks/useCountdown.ts` — in `src/hooks/` (singular)
- All other hooks: `apps/mobile/src/lib/hooks/` (with `lib/` prefix)

**Fix:** Move `useCountdown.ts` to `src/lib/hooks/`.

### 4.11 Missing 7 Module Declarations (TS Errors)

**Files:**
- `src/components/ui/CloudinaryImage.tsx` — missing `@cloudinary/url-gen` and 4 sub-modules
- `src/lib/stores/socket-store.ts` — missing `socket.io-client`

**Fix:** Install the missing packages:
```bash
npm install @cloudinary/url-gen socket.io-client
```

### 4.12 Cart Store — Optimistic Stubs With Empty Values

**Files:** `apps/mobile/src/lib/stores/cart-store.ts`

**Problem:** `onMutate` in `useAddToCart` inserts stubs with `id: "", name: "", price: 0, stock: 99` — very fragile.

**Fix:** Use proper optimistic updates that mirror the actual server response shape.

---

## 5. 🟡 MEDIUM — Architecture & Scalability

### 5.1 Overly Complex Screens (Need Extraction)

| Screen | Lines | Sections |
|--------|-------|----------|
| `(home)/index.tsx` | 524 | Header, hero banner, ride status, filter pills, highlights, categories, top products, new items, flash sale, popular, just for you, quick actions |
| `checkout.tsx` | 347 | Delivery form, delivery method, payment method, BexieCoins, order summary, place order |
| `product/[id].tsx` | 332 | Gallery, info, description, seller, delivery, reviews, sticky bar |
| `cart.tsx` | 267 | Vendor groups, items, coupon, breakdown, checkout bar |
| `reels.tsx` | 263 | Player, actions, comments modal, header |
| `addresses.tsx` | 258 | List + modal form |
| `services/[id].tsx` | 280 | Provider info, about, contact, scheduling, booking, address modal |

**Fix:** Extract each major section into a separate component file under `src/components/` or a co-located `_components/` folder.

### 5.2 Reusable Components Not Extracted

| Pattern | Files Using It | Fix |
|---------|---------------|-----|
| 2-column product grid (`w-[48%]`) | `home/index.tsx`, `search.tsx` | Create `ProductGrid` component |
| Radio button selector | `checkout.tsx` (delivery + payment) | Create `RadioGroup` component |
| Bottom sheet modal | `addresses.tsx`, `services/[id].tsx`, `search.tsx`, `reels.tsx` | Create `BottomSheet` component |
| `GHS ${x.toFixed(2)}` | 15+ files | Create `Price` component |
| Section header with "See All" | `home/index.tsx` (6+ times) | Create `SectionHeader` component |

### 5.3 No Memo/useCallback on Expensive Renders

**Files needing optimization:**

| File | Issue |
|------|-------|
| `(home)/index.tsx` | `HERO_BANNERS` FlatList `renderItem` recreated every render |
| `reels.tsx` | `renderReel` function recreated every render |
| `cart.tsx` | Vendor grouping `.reduce()` runs in render body (lines 86-94) |
| `checkout.tsx` | Inline mutation handler callbacks |
| `addresses.tsx` | Address list mapping in render body |
| `tabs/_layout.tsx` | `CustomTabBar` not memo'd — re-renders on every tab change |

### 5.4 No Request Cancellation

**Problem:** Zero `AbortController`/`signal` usage. When screens unmount, in-flight requests continue.

**Fix:** Pass `signal` from React Query to fetch calls. React Query supports this natively with `useQuery`.

### 5.5 No Prefetching Strategy

**Problem:** `queryClient.prefetchQuery` is never used. Navigation always waits for network.

**Fix:** Prefetch product detail when hovering/tapping a product card. Prefetch categories on app launch.

---

## 6. 🟢 MEDIUM — Styling & Polish

### 6.1 Hardcoded Colors Instead of Theme Tokens

**Tailwind config defines:** `brand-*`, `surface-*`, `accent-*`, `foreground`, `muted-foreground`, `border`

**Screens mostly ignore them.** Replace these hardcoded hex values:

| Hardcoded | Used In (partial list) | Should Be |
|-----------|------------------------|-----------|
| `#004CFF` | Button.tsx, home, cart, product/[id] | `bg-brand-600` |
| `#0f172a` | tabs/_layout, GlobalPopup, home, search | `text-foreground` |
| `#cbd5e1` | ProductCard, cart, home (15+ places) | `text-muted-foreground` or `text-surface-300` |
| `#64748b` | ProductCard, EmptyState, cart | `text-muted-foreground` |
| `#475569` | ProductCard, cart, product/[id] | `text-surface-600` |
| `#94a3b8` | checkout, search, Input | `text-surface-400` |
| `#ef4444` | ProductCard (heart), product/[id], reels | `text-rose-500` |
| `#f59e0b` | ProductCard (star), product/[id] | `text-warning or text-amber-500` |
| `#1e293b` | product/[id], GlobalPopup | `text-surface-800` |
| `#e2e8f0` | product/[id] | `border-border` |

### 6.2 NativeWind Classes That Don't Work

| Class | File | Problem |
|-------|------|---------|
| `backdrop-blur-md` | `reels.tsx:135` | NativeWind doesn't support backdrop-filter |
| `bg-gradient-to-t` | `reels.tsx:115` | NativeWind doesn't support gradients |
| `h-14` | Multiple files | Not in Tailwind spacing scale or project config |
| `capitalize` | Multiple files | RN doesn't support `text-transform` |
| `tracking-tight`, `tracking-wider` | Multiple files | Needs explicit `letterSpacing` |
| `leading-relaxed`, `leading-tight`, `leading-snug` | Multiple files | Needs explicit `lineHeight` |
| `gap-x-*`, `gap-y-*` | Multiple files | RN only supports `gap` (not x/y) |

**Fix:** Replace with valid NativeWind classes or inline `style={{}}` objects.

### 6.3 Inline Styles Mixed With NativeWind

**Problem:** Every screen switches between `className` and `style={}` on the same element. This creates confusing precedence issues.

**Fix:** Pick one approach per component. Prefer NativeWind className for layout, inline style only for truly dynamic values (e.g., animated values, runtime colors).

### 6.4 Inconsistent Folder Naming

**Problem:** Route groups use `(name)` but some files use single `_layout.tsx` while others use `index.tsx` in subfolders:

```
(customer)/(tabs)/(home)/_layout.tsx    <- Stack inside tabs inside layout
(customer)/(tabs)/(shop)/_layout.tsx    <- same
(customer)/product/[id].tsx            <- flat file
(vendor)/(dashboard)/_layout.tsx       <- nested group
(dispatcher)/(tabs)/(earnings)/        <- 3-level nesting
```

**Fix:** Not critical but consider flattening where possible.

### 6.5 `EXPO_PUBLIC_API_URL` Points to LAN IP

**Files:** `apps/mobile/.env:1`

**Problem:** `http://172.20.10.3:3000/api` — breaks for anyone not on that specific network.

**Fix:** Default to `http://localhost:3000/api` and document that LAN IPs need to be configured per developer.

---

## 7. 🔵 LOW — Nice To Have

| Issue | Details |
|-------|---------|
| `register.dto.ts` — no `@IsBoolean()` on onboarding fields | Minor validation gap |
| `create-product.dto.ts` — `isPrimary?: boolean` missing `@IsBoolean()` | Minor validation gap |
| `ProductImage.order` — missing `@IsNumber()` | Minor validation gap |
| Missing `@IsOptional()` on some DTO fields | Minor |
| Escrow controller — per-method guards (inconsistent) | Move to class level |
| `wallet.service.ts:96` — uses `BETTER_AUTH_URL` as base for payment callback URL | Likely wrong config key |
| Hardcoded `currency: "GHS"` in `wallet.service.ts:60` | Should be configurable |
| Hardcoded `shippingFee = subtotal >= 5000 ? 0 : 500` in `orders.service.ts:47` | Should be config-driven |
| Hardcoded `tax = subtotal * 0.075` in `orders.service.ts:48` | Should be config-driven |
| Hardcoded `rating: 4.5` in `products.service.ts:194` | Remove hardcoded defaults |
| Hardcoded `fee = 2.0` fallback in `wallet.service.ts:546` | Should come from config |
| `wallet.service.ts:60` — `currency: "GHS"` hardcoded | Should come from config |

---

## 8. AI Sloppiness Score

**Estimated: ~35-40%**

### Breakdown

| Category | % | Description |
|----------|---|-------------|
| **AI monologue in prod code** | 5% | `wallet.controller.ts:45-46` — *"Dynamic require to avoid import clutter... I will just use the inline type"* |
| **`as any` / `: any` crutches** | 12% | 26 files use these escape hatches instead of proper types |
| **Inline test data left behind** | 8% | Mock shops, hero banners, hardcoded coupon codes, phone numbers |
| **Copy-pasted components** | 5% | 3 chat screens, 3 edit profiles — identical code |
| **Dead code** | 3% | Unused Zustand stores, non-functional raw-body middleware |
| **Incomplete implementations** | 2% | "In a real app we'd verify the pin here" — left unfinished |

### Telltale Signs Of AI Generation

1. **Overly verbose comments** explaining what the code does (AIs are trained to do this, humans rarely do)
2. **Inconsistent naming** — some files use `camelCase`, some `kebab-case`, some `PascalCase` depending on when they were generated
3. **Everything works but nothing is polished** — the last 20% (error states, loading, edge cases) is universally missing
4. **Pattern duplication** instead of abstraction — the AI solves each problem independently rather than extracting shared patterns
5. **Security defaults to "skip for now"** — webhook verification, PIN checks, rate limits all have "TODO" notes

---

## 9. Fix Order Recommendation

### Phase 1 — Security (2-3 days)
1. ~~Paystack webhook signature verification~~ + fix raw body parser path
2. ~~Wallet PIN verification on transfer/withdraw~~
3. ~~Coupon currentUses increment~~
4. ~~Stock race condition fix~~
5. Add rate limiting on coupon + wallet transfer
6. Add `@IsIn()` on register DTO role
7. Add auth guard on coupons controller
8. Restrict CORS in production

### Phase 2 — Error Handling (2-3 days)
1. Create `<ErrorBoundary>` component, wrap root layouts
2. Add loading/error/empty states to all 30+ screens (systematic — do them all)
3. Fix silent error swallows in auth controller
4. Fix empty catch block in products service

### Phase 3 — Types & Code Quality (3-5 days)
1. Remove `any` from auth-store.ts — type the `user` object
2. Create DTOs for all `body: any` endpoints
3. Remove all console.log statements
4. Replace hardcoded "GHS " with `formatPrice()` utility
5. Clean up inline test data
6. Install missing module dependencies
7. Fix 8 TS errors

### Phase 4 — Architecture (2-3 days)
1. Add pagination to 11 list endpoints
2. Fix N+1 queries (chat, admin, vendor-customers)
3. Add connection pool limit config
4. Add missing database indexes
5. Add missing cascade deletes
6. Consolidate duplicate chat/edit-profile screens

### Phase 5 — Polish (1-2 days)
1. Replace hardcoded hex colors with theme tokens
2. Remove invalid NativeWind classes
3. Add persist middleware to cart/favorites stores
4. Add AbortController signals
5. Add prefetching strategy
6. Extract oversized components from home/checkout/product screens

**Total estimate: ~2 weeks for a 2-person team**

---

## Appendix: File Index

### Backend Key Files
| Path | Purpose |
|------|---------|
| `apps/server/src/main.ts` | Bootstrap, CORS, ValidationPipe, Swagger |
| `apps/server/src/app.module.ts` | Module imports, rate limiting config |
| `apps/server/src/guards/auth.guard.ts` | JWT/session auth guard |
| `apps/server/src/filters/global-exception.filter.ts` | Global error handler |
| `apps/server/prisma/schema.prisma` | Database schema (47 models + 9 enums) |
| `apps/server/src/modules/` | 33 module directories |
| `apps/server/src/modules/vendor/vendor.service.ts` | Vendor/Products CRUD |
| `apps/server/src/modules/wallet/wallet.service.ts` | Wallet, PIN, transfers |
| `apps/server/src/modules/coupons/coupons.service.ts` | Coupon validation |
| `apps/server/src/modules/orders/orders.service.ts` | Order creation with stock |
| `apps/server/src/modules/payments/payments.service.ts` | Paystack integration + webhook |

### Frontend Key Files
| Path | Purpose |
|------|---------|
| `apps/mobile/app/(customer)/` | All customer screens (~33) |
| `apps/mobile/app/(vendor)/` | All vendor screens (~31) |
| `apps/mobile/src/lib/api/` | API client modules (~32) |
| `apps/mobile/src/lib/hooks/` | React Query hooks (~29) |
| `apps/mobile/src/lib/stores/` | Zustand stores (~12) |
| `apps/mobile/src/components/ui/` | Reusable UI components |
| `apps/mobile/app/_layout.tsx` | Root layout |
| `apps/mobile/tailwind.config.js` | Theme configuration |
