# Client Facing Flow

## Entry Point

- URL: `http://localhost:3000/client`
- Alternate URL: `http://localhost:3000/`

## Primary Journey

1. Customer enters name and picks services.
2. Customer chooses tip mode:
   - `%` tip (example: `15%`)
   - Flat tip (example: `$10`)
3. Optional retail add-on (example: shampoo) can be included in the same checkout.
4. Client submits bundled checkout to `POST /checkout/bundle`.
5. Server writes one order record and splits tip to involved barbers.

## Related Endpoints

- `GET /barbers`: available barber list
- `POST /checkout/bundle`: one bundled checkout with service/product mix + tip
- `POST /ticket/create`: create booking ticket
- `POST /action`: multipart form upload (`name` + `profilePicture`) saved via `Bun.write()`
- `GET /tickets/pending`: pending queue count

## Demo Notes

- Use realistic service bundles (haircut + beard trim) to validate assignment behavior.
- Keep one admin tab open to confirm telemetry updates during client actions.
