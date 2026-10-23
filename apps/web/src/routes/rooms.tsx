import {
  EQUIPMENT_OPTIONS,
  type Equipment,
  ROOM_CAPACITY_MAX,
  ROOM_NAME_MAX_LENGTH,
  ROOM_PHOTO_URL_MAX_LENGTH,
} from "@repo/db/shared";
import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useCallback } from "react";
import FormError from "#/components/form-error";
import MemberPicker from "#/components/member-picker";
import PageError from "#/components/page-error";
import RoomList from "#/components/room-list";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useActingMember } from "#/hooks/use-acting-member";
import { useAction } from "#/hooks/use-action";
import { getTrpc } from "#/integrations/trpc/client";

export const Route = createFileRoute("/rooms")({
  loader: async () => {
    const trpc = getTrpc();
    const [members, rooms] = await Promise.all([
      trpc.members.list.query(),
      trpc.rooms.list.query(),
    ]);
    return { members, rooms };
  },
  component: RoomsPage,
  errorComponent: PageError,
});

function RoomsPage() {
  const { members, rooms } = Route.useLoaderData();
  const { actingMember, setActingMemberId } = useActingMember(members);
  const addRoom = useAction();
  const archiveRoom = useAction();
  const actorId = actingMember?.id ?? "";

  const handleAdd = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const ok = await addRoom.run(() =>
        getTrpc().rooms.add.mutate({
          actorId,
          room: {
            capacity: Number(data.get("capacity")),
            equipment: data.getAll("equipment").map(String) as Equipment[],
            name: String(data.get("name") ?? ""),
            photoUrl: String(data.get("photoUrl") ?? ""),
          },
        })
      );
      if (ok) {
        form.reset();
      }
    },
    [actorId, addRoom.run]
  );

  const handleArchive = useCallback(
    (roomId: string) =>
      archiveRoom.run(() =>
        getTrpc().rooms.archive.mutate({ actorId, roomId })
      ),
    [actorId, archiveRoom.run]
  );

  return (
    <main className="page-wrap px-4 py-12">
      <section className="flex max-w-3xl flex-col gap-4">
        <p className="island-kicker m-0">Teamdesk</p>
        <h1 className="display-title m-0 text-4xl text-foreground sm:text-5xl">
          Rooms
        </h1>
        <p className="m-0 text-base text-muted-foreground leading-8">
          The rooms the team can book. Only admins can add or archive them.
        </p>
        <MemberPicker
          members={members}
          onChange={setActingMemberId}
          value={actingMember?.id}
        />
      </section>

      <form className="island-shell mt-10 p-6 sm:p-8" onSubmit={handleAdd}>
        <p className="island-kicker mb-3">Add room</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label="Room name"
            maxLength={ROOM_NAME_MAX_LENGTH}
            name="name"
            placeholder="Room name"
            required
          />
          <Input
            aria-label="Capacity"
            max={ROOM_CAPACITY_MAX}
            min={1}
            name="capacity"
            placeholder="Capacity"
            required
            type="number"
          />
          <Button disabled={addRoom.pending} type="submit">
            {addRoom.pending ? "Adding…" : "Add room"}
          </Button>
        </div>
        <Input
          aria-label="Photo URL"
          className="mt-3"
          maxLength={ROOM_PHOTO_URL_MAX_LENGTH}
          name="photoUrl"
          placeholder="Photo URL (https://...)"
          type="text"
        />
        <fieldset className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-0 p-0">
          <legend className="sr-only">Equipment</legend>
          {EQUIPMENT_OPTIONS.map((item) => (
            <label className="flex items-center gap-2 text-sm" key={item}>
              <input name="equipment" type="checkbox" value={item} />
              {item}
            </label>
          ))}
        </fieldset>
        <FormError message={addRoom.error} />
      </form>

      <section className="mt-10">
        <FormError message={archiveRoom.error} />
        <RoomList
          disabled={archiveRoom.pending}
          onArchive={handleArchive}
          rooms={rooms}
        />
      </section>
    </main>
  );
}
