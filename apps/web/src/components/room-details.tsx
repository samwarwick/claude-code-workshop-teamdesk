import type { Room } from "@repo/db/shared";
import { useCallback, useState } from "react";
import { Badge } from "#/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";

interface RoomDetailsProps {
  room: Room;
}

export default function RoomDetails({ room }: RoomDetailsProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const handleError = useCallback(
    () => setFailedUrl(room.photoUrl),
    [room.photoUrl]
  );
  // An image that failed before hydration never fires onError, so check on mount.
  const handleRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth === 0) {
        setFailedUrl(room.photoUrl);
      }
    },
    [room.photoUrl]
  );
  const showPhoto = room.photoUrl !== null && failedUrl !== room.photoUrl;

  return (
    <div className="flex items-center gap-4">
      {showPhoto ? (
        <Dialog>
          <DialogTrigger
            aria-label={`Enlarge photo of ${room.name}`}
            className="shrink-0 cursor-zoom-in rounded-md"
            type="button"
          >
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError is the image load-failure fallback, not user interaction */}
            <img
              alt={room.name}
              className="h-16 w-24 rounded-md object-cover"
              height={64}
              loading="lazy"
              onError={handleError}
              ref={handleRef}
              src={room.photoUrl ?? undefined}
              width={96}
            />
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogTitle>{room.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Larger photo of {room.name}
            </DialogDescription>
            <img
              alt={room.name}
              className="max-h-[75vh] w-full rounded-md object-contain"
              height={600}
              src={room.photoUrl ?? undefined}
              width={900}
            />
          </DialogContent>
        </Dialog>
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
