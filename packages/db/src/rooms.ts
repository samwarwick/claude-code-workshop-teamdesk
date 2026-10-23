// Rooms were the first table, written as hand-rolled SQL against the raw D1
// API before the app moved to drizzle. They were ported to drizzle's `sql`
// template so they run on the same `Database`, but never rewritten.
import { sql } from "drizzle-orm";
import type { Database } from "./schema.ts";
import type { Equipment, Room } from "./shared.ts";

interface RoomRecord {
  archived: number;
  capacity: number;
  equipment: string;
  id: number;
  name: string;
  photo_url: string | null;
}

function mapRoom(r: RoomRecord): Room {
  return {
    archived: r.archived === 1,
    capacity: r.capacity,
    equipment: JSON.parse(r.equipment) as Equipment[],
    id: String(r.id),
    name: r.name,
    photoUrl: r.photo_url,
  };
}

export async function listRooms(
  db: Database,
  opts: { includeArchived?: boolean } = {}
): Promise<Room[]> {
  const records = await db.all<RoomRecord>(
    opts.includeArchived
      ? sql`select id, name, capacity, archived, equipment, photo_url from rooms order by name`
      : sql`select id, name, capacity, archived, equipment, photo_url from rooms where archived = 0 order by name`
  );
  return records.map(mapRoom);
}

export async function getRoom(db: Database, id: string): Promise<Room | null> {
  const records = await db.all<RoomRecord>(
    sql`select id, name, capacity, archived, equipment, photo_url from rooms where id = ${Number(id)}`
  );
  return records.length > 0 ? mapRoom(records[0] as RoomRecord) : null;
}

export async function insertRoom(
  db: Database,
  name: string,
  capacity: number,
  details: { equipment?: Equipment[]; photoUrl?: string | null } = {}
): Promise<Room> {
  const records = await db.all<RoomRecord>(
    sql`insert into rooms (name, capacity, equipment, photo_url) values (${name}, ${capacity}, ${JSON.stringify(details.equipment ?? [])}, ${details.photoUrl ?? null}) returning id, name, capacity, archived, equipment, photo_url`
  );
  return mapRoom(records[0] as RoomRecord);
}

export async function setRoomArchived(
  db: Database,
  id: string,
  archived: boolean
): Promise<void> {
  await db.run(
    sql`update rooms set archived = ${archived ? 1 : 0} where id = ${Number(id)}`
  );
}
