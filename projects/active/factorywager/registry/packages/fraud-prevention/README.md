# @factorywager/fraud-prevention

Account history (audit trail), cross-lookup references (phone/email/device hashes), and fraud signals for FactoryWager.

## Features

- **Account history** – Append-only audit log per user: login, pref_change, payment_attempt, payment_success, etc. Cross-reference with our data for fraud review.
- **Reference lookups** – Store hashed identifiers (phone, email, device_id) linked to `userId`. Never store raw phone numbers; use SHA-256 hashes for cross-lookup.
- **Phone numbers** – Normalize to E.164-like digits, hash with `hashPhone(phone)`, register with `registerReference({ userId, referenceType: 'phone_hash', valueHash })`. Look up all accounts sharing a phone with `lookupByPhoneHash(hash)`.
- **Cross-lookup** – Find references linked to more than one account (e.g. same phone on multiple accounts) via `getCrossLookups({ referenceType, minAccounts })`.

## Usage

```ts
import {
  FraudPreventionEngine,
  hashPhone,
  hashReferenceValue,
} from '@factorywager/fraud-prevention';

const engine = new FraudPreventionEngine('./data/fraud-prevention.db');

// Record an event (audit trail)
engine.recordEvent({
  userId: '@alice',
  eventType: 'payment_attempt',
  gateway: 'venmo',
  amountCents: 5000,
  success: true,
  ipHash: 'abc...',
  deviceHash: 'def...',
});

// Register a phone (hash first; never store raw)
const phoneHash = await hashPhone('+1 504 555 1234');
engine.registerReference({ userId: '@alice', referenceType: 'phone_hash', valueHash: phoneHash });

// Cross-lookup: same phone on multiple accounts?
const userIds = engine.lookupByPhoneHash(phoneHash);
const crossLookups = engine.getCrossLookups({ referenceType: 'phone_hash', minAccounts: 2 });

// Account history for a user
const entries = engine.getAccountHistory({ userId: '@alice', limit: 100 });
```

## Dev dashboard APIs

When the dev-dashboard runs with this package installed, it exposes:

- `GET /api/fraud/history?userId=@x&limit=100&eventType=payment_attempt&since=<unix_sec>` – Account history.
- `GET /api/fraud/cross-lookup?type=phone_hash&minAccounts=2` – References linked to multiple accounts.
- `GET /api/fraud/references?userId=@x` – All references (phone/email/device) for a user.
- `POST /api/fraud/event` – Body: `{ userId, eventType, metadata?, ipHash?, deviceHash?, gateway?, amountCents?, success? }`.
- `POST /api/fraud/register` – Body: `{ userId, referenceType, valueHash }` or `{ userId, referenceType: 'phone_hash', phone }` (server hashes phone).

## Schema

- **account_history** – userId, event_type, timestamp, metadata, ip_hash, device_hash, gateway, amount_cents, success.
- **reference_lookups** – reference_type (phone_hash | email_hash | device_id), value_hash (SHA-256 hex), userId, created_at. Unique (type, value_hash, userId).
