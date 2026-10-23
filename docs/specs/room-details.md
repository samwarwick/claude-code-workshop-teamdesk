# Room details: equipment and photo

Status: draft. Target: buildable in about 20 minutes.

## Goal

Members picking a room can see what it has (equipment) and what it looks like (a photo). Admins set both when adding a room.

## Decisions (from the interview)

- **Photo:** an optional image URL pasted by an admin. We store the string only. No upload, no R2, no new bindings.
- **Equipment:** a fixed set of tags defined in `packages/db/src/shared.ts`. Admins pick them with checkboxes.
- **Where shown:** the room list, and wherever a room is picked for booking. Each room shows a thumbnail and equipment badges.
- **Who edits:** admins only, enforced in the service.

## Equipment options

`EQUIPMENT_OPTIONS` in `shared.ts`, plus a derived `Equipment` type:

- Projector
- Screen / TV
- Whiteboard
- Video conferencing
- Speakerphone
- Standing desk
- Wheelchair accessible

## Changes

### Schema and migration (`packages/db`)

Add two columns to `rooms` in `schema.ts`:

- `photo_url` text, nullable.
- `equipment` text, not null, default `'[]'`. A JSON array of equipment strings.

Then run `bun run generate` in `packages/db`, commit all of `migrations/` including `meta/`, and run `db:apply`. Add equipment and a photo URL to a couple of rows in `seed.sql`.

### Shared types (`shared.ts`)

- Add `EQUIPMENT_OPTIONS`, `Equipment` and `ROOM_PHOTO_URL_MAX_LENGTH` (suggest 500).
- Extend `Room` with `equipment: Equipment[]` and `photoUrl: string | null`.

### DB layer (`packages/db/src/rooms.ts`)

This file uses raw `sql` templates, not the drizzle query builder. Keep that style.

- Add the two columns to every `select` and `returning` list and to `RoomRecord`.
- `mapRoom` parses the equipment JSON and maps `photo_url` to `photoUrl`.
- `insertRoom` takes `equipment` and `photoUrl`. Stay unvalidated, per the repo rules.

### Service (`packages/services/src/rooms.ts`)

Extend `addRoomInput`:

- `equipment`: array of `z.enum(EQUIPMENT_OPTIONS)`, de-duplicated, default `[]`.
- `photoUrl`: optional. Trim, must parse as a URL with an `https:` scheme, max `ROOM_PHOTO_URL_MAX_LENGTH`. Empty string becomes `null`.

Admin check and the `{ ok, error }` result style stay as they are. `rooms.ts` is the one service that does not throw `ServiceError`, so this change does not convert it.

### tRPC router

`apps/web/src/server/trpc/routers/rooms.ts` stays a single service call. The input schema comes from the extended `addRoomInput`.

### UI (`apps/web`)

- `routes/rooms.tsx`: add a checkbox group for equipment and a "Photo URL" text input to the add-room form.
- `components/room-list.tsx`: show a small thumbnail (`object-cover`, fixed size, `loading="lazy"`, `alt` set to the room name) and a badge per equipment item. With no photo, show a neutral placeholder. With no equipment, show no badges.
- Booking room picker (`routes/bookings.tsx` and `components/bookings/`): show the same thumbnail and badges next to each room option, reusing a shared small component rather than duplicating markup.
- Use `components/ui/` primitives as they are (e.g. the existing badge, if present).
- Browser code imports only from `@repo/db/shared`.

## Out of scope

- Editing a room's details after creation. The app has no edit flow for rooms today (only add and archive), so equipment and photo are set at creation. See Phase 2.
- Bringing the rooms code in line with the repo conventions. See Phase 2.
- Filtering or searching rooms by equipment.
- Uploading images or any file storage.
- Custom equipment, quantities, and per-equipment descriptions.
- Image proxying or checking that the URL actually serves an image. A broken image just falls back to the placeholder via `onError`.

## Phase 2 (follow-up, not part of the phase 1 implementation)

Do not address these while building phase 1. Phase 1 must keep the existing raw SQL and `{ ok, error }` result style in the rooms code.

1. **Edit room details.** Add an edit flow so an admin can change a room's equipment and photo URL (and ideally name and capacity) after creation. This needs a service `update` method (admin only, same validation as `addRoomInput`), a db update function, a router mutation and an edit form in the UI. Also let an admin clear the photo.
2. **Align rooms with the repo conventions.** Rewrite `packages/db/src/rooms.ts` to use the drizzle query builder instead of raw `sql` templates. Convert `packages/services/src/rooms.ts` to throw `ServiceError` subclasses (`ForbiddenError`, `ValidationError`, `ConflictError`, `NotFoundError`) instead of returning `{ ok, error }`, using `requireAdmin`. Update the router, the UI callers and the tests to match. Best done before or together with item 1, so the new update method is written in the target style.

## Tests

- `packages/db/src/rooms.test.ts`: round-trip equipment and photo URL through insert and list. Rooms without them return `[]` and `null`.
- `packages/services/src/rooms.test.ts`:
  - An admin can add a room with equipment and a photo.
  - A non-admin is refused.
  - Unknown equipment, a non-https URL and an over-long URL are rejected.
  - Duplicate equipment entries collapse to one.
  - An empty photo URL is stored as `null`.
- Run `bun test` and `bun run check`.

## Done when

- Migration is committed and applies cleanly on a fresh `bun run dev`.
- An admin can add a room with a photo URL and equipment ticked, and it shows on the rooms page and in the booking picker.
- Existing rooms (no photo, no equipment) still render correctly.
- Tests and `bun run check` pass.
