import { beforeEach, describe, expect, test } from "bun:test";
import { createTeam, type Team } from "./fixtures.ts";
import { createRoomsService, type RoomsService } from "./rooms.ts";

let team: Team;
let rooms: RoomsService;

beforeEach(async () => {
  team = await createTeam();
  rooms = createRoomsService(team.db);
});

describe("rooms service", () => {
  test("an admin adds a room", async () => {
    const result = await rooms.add(team.admin.id, {
      capacity: 6,
      name: "Quay",
    });

    expect(result.ok).toBe(true);
    expect((await rooms.list()).map((r) => r.name)).toContain("Quay");
  });

  test("an admin adds a room with equipment and a photo", async () => {
    const result = await rooms.add(team.admin.id, {
      capacity: 6,
      equipment: ["Projector", "Whiteboard"],
      name: "Quay",
      photoUrl: " https://example.com/quay.jpg ",
    });

    expect(result.ok).toBe(true);
    const quay = (await rooms.list()).find((r) => r.name === "Quay");
    expect(quay?.equipment).toEqual(["Projector", "Whiteboard"]);
    expect(quay?.photoUrl).toBe("https://example.com/quay.jpg");
  });

  test("invalid equipment or photo URLs are rejected", async () => {
    const base = { capacity: 6, name: "Quay" };
    const bad = [
      { ...base, equipment: ["Jacuzzi"] },
      { ...base, photoUrl: "http://example.com/a.jpg" },
      { ...base, photoUrl: "not a url" },
      { ...base, photoUrl: `https://example.com/${"a".repeat(500)}` },
    ];
    const results = await Promise.all(
      bad.map((input) =>
        rooms.add(
          team.admin.id,
          input as unknown as Parameters<RoomsService["add"]>[1]
        )
      )
    );
    expect(results.map((r) => r.ok)).toEqual([false, false, false, false]);
    expect((await rooms.list()).map((r) => r.name)).not.toContain("Quay");
  });

  test("duplicate equipment collapses", async () => {
    const result = await rooms.add(team.admin.id, {
      capacity: 6,
      equipment: ["Projector", "Projector", "Whiteboard"],
      name: "Quay",
    });

    expect(result.ok && result.room.equipment).toEqual([
      "Projector",
      "Whiteboard",
    ]);
  });

  test("an empty photo URL is stored as null", async () => {
    const result = await rooms.add(team.admin.id, {
      capacity: 6,
      name: "Quay",
      photoUrl: "  ",
    });

    expect(result.ok && result.room.photoUrl).toBeNull();
  });

  test("members cannot add rooms", async () => {
    const result = await rooms.add(team.ana.id, { capacity: 6, name: "Quay" });

    expect(result).toEqual({ error: "Only admins can add rooms.", ok: false });
  });

  test("duplicate names are refused", async () => {
    const result = await rooms.add(team.admin.id, {
      capacity: 6,
      name: "Harbour",
    });

    expect(result.ok).toBe(false);
  });

  test("archiving hides a room from the default list", async () => {
    const result = await rooms.archive(team.admin.id, team.bigRoom.id);

    expect(result.ok).toBe(true);
    expect((await rooms.list()).map((r) => r.name)).toEqual(["Bridge"]);
  });
});
