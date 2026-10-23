import type { Room } from "@repo/db/shared";
import { type MouseEvent, useCallback } from "react";
import RoomDetails from "#/components/room-details";
import { Button } from "#/components/ui/button";

interface RoomListProps {
  disabled: boolean;
  onArchive: (roomId: string) => void;
  rooms: readonly Room[];
}

export default function RoomList({
  disabled,
  onArchive,
  rooms,
}: RoomListProps) {
  const handleArchive = useCallback(
    (event: MouseEvent<HTMLButtonElement>) =>
      onArchive(event.currentTarget.value),
    [onArchive]
  );

  if (rooms.length === 0) {
    return <p className="text-muted-foreground text-sm">No rooms yet.</p>;
  }
  return (
    <ul className="m-0 list-none space-y-4 p-0">
      {rooms.map((room) => (
        <li
          className="flex items-center justify-between gap-4 border-border border-t pt-4"
          key={room.id}
        >
          <div className="flex flex-col gap-2">
            <div>
              <p className="m-0 font-semibold text-foreground">{room.name}</p>
              <p className="m-0 text-muted-foreground text-sm">
                Seats {room.capacity}
              </p>
            </div>
            <RoomDetails room={room} />
          </div>
          <Button
            disabled={disabled}
            onClick={handleArchive}
            size="sm"
            value={room.id}
            variant="outline"
          >
            Archive
          </Button>
        </li>
      ))}
    </ul>
  );
}
