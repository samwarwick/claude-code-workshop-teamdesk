# Room details (equipment + photo): implementation plan

Source spec: `docs/specs/room-details.md`. Spec's own "Phase 2" (edit flow, convention clean-up) is out of scope here and untouched. Rooms code keeps its raw `sql` templates and `{ ok, error }` results.

## Context

Members choosing a room can't see what it has or what it looks like. Add an optional photo URL and a fixed set of equipment tags, set by admins at creation, and show them on the rooms page and the booking picker.

Findings from the code that shape the plan:
- `insertRoom(db, name, capacity)` is called positionally by `packages/services/src/fixtures.ts`, `packages/db/src/rooms.test.ts` and `packages/db/src/bookings.test.ts`. Add `equipment`/`photoUrl` as an optional fourth `details` object so those callers keep working.
- The booking room picker (`routes/bookings.tsx`) is a native `<select>`; `<option>` can't hold a thumbnail or badges. Show the shared room-details component for the **selected** room directly under the select (it updates on change). `components/bookings/` holds only `BookingForm`/`BookingList`.
- `components/ui/badge.tsx` exists; use it as is.
- Service `addRoomInput` is reused by the tRPC router, so the router needs no change (verify only).

## Branch

Do all of this work on a new branch off `main`, `feature/room-details`, not on `main` itself. Create it before Phase 1. Note the working tree already has an uncommitted `apps/web/wrangler.jsonc` change and untracked `.claude/` and `docs/`; stage only this feature's files so those don't get swept in. Commit at the end of each phase.

## Phase 1: Data layer (`packages/db`, `packages/services`)

Ends with a working, tested backend; UI untouched and still compiling.

1. `packages/db/src/shared.ts`: add `EQUIPMENT_OPTIONS` (7 tags from the spec, `as const`), `Equipment` type, `ROOM_PHOTO_URL_MAX_LENGTH = 500`; extend `Room` with `equipment: Equipment[]` and `photoUrl: string | null`.
2. `packages/db/src/schema.ts`: add `photo_url` (text, nullable) and `equipment` (text, not null, default `'[]'`) to `rooms`.
3. In `packages/db`: `bun run generate`, then review the SQL and commit all of `migrations/` including `meta/`; `bun run db:apply`.
4. `packages/db/src/rooms.ts`: add columns to `RoomRecord` and every select/returning list; `mapRoom` does `JSON.parse` on equipment and maps `photo_url` to `photoUrl`; `insertRoom(db, name, capacity, details = {})` stores `JSON.stringify(equipment ?? [])` and `photoUrl ?? null`. No validation here.
5. `packages/services/src/rooms.ts`: extend `addRoomInput` with `equipment` (`z.array(z.enum(EQUIPMENT_OPTIONS))`, de-duplicated via transform, default `[]`) and `photoUrl` (trim; `""` becomes `null`; must parse with `new URL` and `protocol === "https:"`; max length). Pass to `insertRoom`. Keep admin check and `{ ok, error }`.
6. `packages/db/seed.sql`: update the three existing rooms (the seed `INSERT` currently sets only id, name, capacity, archived) with equipment and a photo URL.
   - Photos: source free stock meeting-room photos (e.g. Unsplash), check each licence allows hotlinking, and use direct `https://` image links. Harbour (seats 10): large boardroom. Bridge (seats 2): small two-person room. Quay (seats 6): mid-size room. Links can't be verified long term; a broken one falls back to the placeholder.
   - Equipment: Harbour gets Projector, Video conferencing, Whiteboard; Bridge gets Screen / TV, Speakerphone; Quay gets a sensible mix (e.g. Screen / TV, Whiteboard, Wheelchair accessible).
   - Repo-hosted images are not an option: relative paths and `data:` URIs fail the `https:`-only rule.
7. Tests:
   - `packages/db/src/rooms.test.ts`: round-trip equipment and photo; rooms without them return `[]` / `null`.
   - `packages/services/src/rooms.test.ts`: admin adds with equipment + photo; non-admin refused; unknown equipment, `http:`/non-URL and over-long URL rejected; duplicate equipment collapses; empty photo URL stored as `null`.

Gate: `bun test` and `bun run check` pass.

## Phase 2: Rooms page UI (`apps/web`)

1. New `apps/web/src/components/room-details.tsx` (shared, imports only `@repo/db/shared`): thumbnail (`object-cover`, fixed size, `loading="lazy"`, `alt` = room name, `onError` and null photo fall back to a neutral placeholder) plus a `Badge` per equipment item, none when empty. Props: `room`.
2. `components/room-list.tsx`: render `RoomDetails` in each row; keep the Archive button and layout.
3. `routes/rooms.tsx`: add a checkbox group (from `EQUIPMENT_OPTIONS`) and a "Photo URL" `Input` (`maxLength={ROOM_PHOTO_URL_MAX_LENGTH}`) to the add form; send `equipment: data.getAll("equipment")` and `photoUrl` in the mutation. Existing form error display shows service validation messages.
4. Confirm `routers/rooms.ts` needs no edit (input schema derives from `addRoomInput`).

Gate: `bun run check`; add a room with photo + tags in `bun run dev` and see it listed.

## Phase 3: Booking picker + final verification

1. `routes/bookings.tsx`: below the room `NativeSelect`, render `<RoomDetails room={room} />` for the selected room (reuse, no duplicated markup).
2. Manual end-to-end in `bun run dev` (fresh DB so the migration is exercised): admin adds a room with https photo and equipment; it shows on `/rooms` and on `/bookings` when selected; legacy/seed rooms with neither render placeholder and no badges; non-admin and bad URL show errors; broken image URL falls back to the placeholder.
3. Final `bun test` and `bun run check`.

## Critical files

`packages/db/src/{shared,schema,rooms}.ts`, `packages/db/migrations/**`, `packages/db/seed.sql`, `packages/services/src/rooms.ts`, `apps/web/src/components/{room-list,room-details}.tsx`, `apps/web/src/routes/{rooms,bookings}.tsx`, plus the two rooms test files.

## Delivery

Per request, this plan is also saved to `docs/plans/room-details-plan.md` once plan mode ends (plan mode only permits writing this file).
