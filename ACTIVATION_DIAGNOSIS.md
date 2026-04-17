# Dodo Subscription Activation — Diagnosis & Fixes

## Emails from Dodo Payments (Mar 16)

Use the **check-activations** API to verify Firebase status for these emails:

```
rafaelserver415@gmail.com
seye@seyekuyinu.com
chahelpaatur@gmail.com
recordscecily@gmail.com
hermeticwares@gmail.com
fabian@greenlakedigital.com
mr.mr.lukeaugusto@gmail.com
arvinder@ksenterprisesindia.com
adsmoskln@gmail.com
adsmoskin@gmail.com
fouadadwize@gmail.com
guy@overthetop.ae
pribinkbenny1565@gmail.com
daphne@metsanoma.com
quentin.pilletoz@gmail.com
zennvlahakis@gmail.com
tamjad388@gmail.com
patdavid000@gmail.com
```

**Note:** `tamjad388@gmail.com` and `patdavid000@gmail.com` had Failed / Requires payment method in Dodo — they may not have valid subscriptions.

---

## How to Check Activation Status

### Option 1: Admin API (live Firebase data)

```bash
# GET with comma-separated emails
curl "https://YOUR_APP.vercel.app/api/admin/check-activations?key=YOUR_ADMIN_SECRET&emails=email1@x.com,email2@x.com"

# POST with JSON body
curl -X POST "https://YOUR_APP.vercel.app/api/admin/check-activations" \
  -H "Content-Type: application/json" \
  -d '{"key":"YOUR_ADMIN_SECRET","emails":["email1@x.com","email2@x.com"]}'
```

### Option 2: Manual fix per email

```bash
# Check status
curl "https://YOUR_APP.vercel.app/api/admin/fix-subscription?email=user@example.com&secret=YOUR_ADMIN_SECRET"

# Fix (grant plan)
curl "https://YOUR_APP.vercel.app/api/admin/fix-subscription?email=user@example.com&plan=basic&secret=YOUR_ADMIN_SECRET"
```

---

## Root Causes of Activation Failures

### 1. User never signed up (most common)

**What happens:** Customer pays via Dodo checkout (guest or different session) but never creates a Firebase account with that email.

**Webhook flow:** `resolveUserId` looks up by email → not found → stores in `pendingSubscriptions`.

**Fix:** User must sign up with the same email they used for payment. When they log in and visit the app, `useSubscription` calls `/api/dodo/verify`, which applies the pending subscription.

**Manual fix:** If they already have an account with a different email, use `fix-subscription?email=PAYMENT_EMAIL&plan=basic` — but that requires the payment email to match a Firestore user. If they never signed up, you must ask them to create an account with the payment email first.

---

### 2. Email mismatch

**What happens:** User signed up with `user@gmail.com` but paid with `user@company.com` (or typo).

**Webhook flow:** Webhook receives `user@company.com` → `findUserByEmail` returns null → pending.

**Fix:** Either update their Firebase Auth email to match, or manually run `fix-subscription?email=user@company.com&plan=basic` — but that only works if a Firestore user doc exists for that email. Best approach: have them add the payment email to their account or use fix-subscription with the email that has the Firestore doc.

---

### 3. Webhook URL or deployment broken

**What happens:** Dodo sends webhooks to your `/api/dodo/webhook` URL. If the deployment was broken (500s, wrong URL), events were never processed.

**Check:** Dodo dashboard → Webhooks → delivery logs. Look for failed deliveries.

**Fix:** After rollback, webhooks should work again. For users who paid during the outage, use `fix-subscription` to manually grant the plan. You may need to infer plan from payment amount (e.g. $25 → basic, $40 → basic-plus, $60 → pro).

---

### 4. Plan unresolved

**What happens:** Webhook receives event but `planFromProductId(product_id)` returns null (unknown product ID), or metadata is missing.

**Webhook flow:** `resolvePlanAndPeriod` returns `plan: null` → stores in pending with `planHint`.

**Fix:** Ensure Dodo product IDs in `lib/dodo.ts` match your live products. For pending users, verify uses `planHint` or defaults to `pro`. Manual fix: `fix-subscription?email=...&plan=basic` (or appropriate plan).

---

### 5. Verify not called (user never visited app)

**What happens:** User paid, has Firebase account with matching email, but never opened the app after payment. Pending is stored; verify runs only when they visit and `useSubscription` triggers it.

**Fix:** User visits the app → verify runs → pending applied. No code change needed. If they already visited and it didn’t apply, check `pendingSubscriptions` — if the doc exists, verify may have failed (e.g. product ID not recognized). Use manual fix-subscription.

---

## Activation Flow Summary

```
Dodo payment.succeeded / subscription.active
        ↓
Webhook: resolveUserId (metadata.userId → subscription_id → email)
        ↓
User found? ──Yes──→ activateSubscription (Firestore users/{uid})
        │
        No
        ↓
storePending (pendingSubscriptions/{email})
        ↓
User signs up / logs in with same email
        ↓
useSubscription → /api/dodo/verify
        ↓
Verify finds pending → applies to user doc → deletes pending
```

---

## Quick Fix for Broken Activations

For each email that paid but isn’t activated:

1. Run check-activations to see: `existsInAuth`, `inPending`, `plan`, `issue`.
2. If `inPending` and `existsInAuth`: they have an account; verify should apply on next visit. If it didn’t, run `fix-subscription?email=X&plan=basic` (or correct plan).
3. If `inPending` and `!existsInAuth`: they never signed up. Ask them to create an account with the payment email, then run fix-subscription or have them visit the app.
4. If `!inPending` and `!activated`: webhook may have failed entirely. Run `fix-subscription?email=X&plan=basic` to grant manually.
