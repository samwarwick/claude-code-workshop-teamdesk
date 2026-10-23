import type { Room } from "@repo/db/shared";
import { useCallback, useState } from "react";
import { Badge } from "#/components/ui/badge";

interface RoomDetailsProps {
  room: Room;
}

export default function RoomDetails({ room }: RoomDetailsProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const handleError = useCallback(
    () => setFailedUrl(room.photoUrl),
    [room.photoUrl]
  );
  const showPhoto = room.photoUrl !== null && failedUrl !== room.photoUrl;

  return (
    <div className="flex items-center gap-4">
      {showPhoto ? (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError is the image load-failure fallback, not user interaction
        <img
          alt={room.name}
          className="h-16 w-24 shrink-0 rounded-md object-cover"
          height={64}
          loading="lazy"
          onError={handleError}
          src={room.photoUrl ?? undefined}
          width={96}
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-16 w-24 shrink-0 rounded-md bg-muted"
        />
      )}
      {room.equipment.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {room.equipment.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
