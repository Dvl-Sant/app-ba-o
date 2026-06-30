import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { bathroomState, queueEntries, users } from "../db/schema.js";
import { HttpError } from "../errors.js";
import {
  CLAIM_WINDOW_MS,
  EXTRA_MAX,
  EXTRA_MINUTES_MS,
  LOCK_DURATION_MS,
} from "../config.js";

const toMs = (d: Date | null): number | null => (d ? d.getTime() : null);

export async function ensureBathroomState(): Promise<void> {
  await db
    .insert(bathroomState)
    .values({ id: 1 })
    .onConflictDoNothing({ target: bathroomState.id });
}

async function getRow() {
  const [row] = await db.select().from(bathroomState).where(eq(bathroomState.id, 1)).limit(1);
  if (!row) throw new Error("bathroom_state row missing");
  return row;
}

export interface QueueItemDTO {
  position: number;
  userId: string;
  name: string;
}

export interface PublicStateDTO {
  status: "free" | "occupied";
  lockedBy: { id: string; name: string } | null;
  expiresAt: number | null;
  extraMinutesUsed: number;
  extraMax: number;
  notifiedUserId: string | null;
  claimExpiresAt: number | null;
  queue: QueueItemDTO[];
}

export async function getPublicState(): Promise<PublicStateDTO> {
  await purge();
  const row = await getRow();

  let lockedBy: PublicStateDTO["lockedBy"] = null;
  if (row.lockedByUserId) {
    const [u] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, row.lockedByUserId)).limit(1);
    if (u) lockedBy = { id: u.id, name: u.name };
  }

  const qRows = await db
    .select({
      userId: queueEntries.userId,
      joinedAt: queueEntries.joinedAt,
      name: users.name,
    })
    .from(queueEntries)
    .innerJoin(users, eq(users.id, queueEntries.userId))
    .where(inArray(queueEntries.status, ["waiting", "notified"]))
    .orderBy(asc(queueEntries.joinedAt));

  const queue: QueueItemDTO[] = qRows.map((q, i) => ({
    position: i + 1,
    userId: q.userId,
    name: q.name,
  }));

  return {
    status: row.status,
    lockedBy,
    expiresAt: toMs(row.expiresAt),
    extraMinutesUsed: row.extraMinutesUsed ?? 0,
    extraMax: EXTRA_MAX,
    notifiedUserId: row.currentNotifiedUserId,
    claimExpiresAt: row.notifiedAt ? row.notifiedAt.getTime() + CLAIM_WINDOW_MS : null,
    queue,
  };
}

async function notifyNext(): Promise<void> {
  const [next] = await db
    .select()
    .from(queueEntries)
    .where(eq(queueEntries.status, "waiting"))
    .orderBy(asc(queueEntries.joinedAt))
    .limit(1);

  if (!next) {
    await db
      .update(bathroomState)
      .set({ currentNotifiedUserId: null, notifiedAt: null })
      .where(eq(bathroomState.id, 1));
    return;
  }
  const t = new Date();
  await db.update(queueEntries).set({ status: "notified", notifiedAt: t }).where(eq(queueEntries.id, next.id));
  await db
    .update(bathroomState)
    .set({ currentNotifiedUserId: next.userId, notifiedAt: t })
    .where(eq(bathroomState.id, 1));
}

export async function lock(userId: string): Promise<PublicStateDTO> {
  await purge();
  const row = await getRow();
  if (row.status === "occupied") {
    if (row.lockedByUserId === userId) return getPublicState();
    throw new HttpError(409, "already_locked");
  }
  if (row.currentNotifiedUserId && row.currentNotifiedUserId !== userId) {
    throw new HttpError(403, "not_your_turn");
  }
  const t = new Date();
  await db
    .update(bathroomState)
    .set({
      status: "occupied",
      lockedByUserId: userId,
      lockedAt: t,
      expiresAt: new Date(t.getTime() + LOCK_DURATION_MS),
      extraMinutesUsed: 0,
      currentNotifiedUserId: null,
      notifiedAt: null,
    })
    .where(eq(bathroomState.id, 1));
  await db
    .update(queueEntries)
    .set({ status: "served" })
    .where(and(eq(queueEntries.userId, userId), inArray(queueEntries.status, ["waiting", "notified"])));
  return getPublicState();
}

export async function unlock(userId: string, isAdmin: boolean): Promise<PublicStateDTO> {
  await purge();
  const row = await getRow();
  if (row.status !== "occupied") throw new HttpError(409, "not_occupied");
  if (row.lockedByUserId !== userId && !isAdmin) throw new HttpError(403, "not_owner");
  await db
    .update(bathroomState)
    .set({
      status: "free",
      lockedByUserId: null,
      lockedAt: null,
      expiresAt: null,
      extraMinutesUsed: 0,
    })
    .where(eq(bathroomState.id, 1));
  await notifyNext();
  return getPublicState();
}

export async function extendLock(userId: string): Promise<PublicStateDTO> {
  await purge();
  const row = await getRow();
  if (row.status !== "occupied") throw new HttpError(409, "not_occupied");
  if (row.lockedByUserId !== userId) throw new HttpError(403, "not_owner");
  if ((row.extraMinutesUsed ?? 0) >= EXTRA_MAX) throw new HttpError(409, "extra_max_reached");
  const base = row.expiresAt ? row.expiresAt.getTime() : Date.now();
  await db
    .update(bathroomState)
    .set({
      expiresAt: new Date(base + EXTRA_MINUTES_MS),
      extraMinutesUsed: (row.extraMinutesUsed ?? 0) + 1,
    })
    .where(eq(bathroomState.id, 1));
  return getPublicState();
}

export async function joinQueue(userId: string): Promise<PublicStateDTO> {
  await purge();
  const row = await getRow();
  if (row.status !== "occupied") throw new HttpError(409, "bathroom_free_lock_instead");
  if (row.lockedByUserId === userId) throw new HttpError(403, "you_are_inside");
  if (row.currentNotifiedUserId === userId) throw new HttpError(403, "your_turn_lock_instead");

  const [existing] = await db
    .select({ id: queueEntries.id })
    .from(queueEntries)
    .where(and(eq(queueEntries.userId, userId), inArray(queueEntries.status, ["waiting", "notified"])))
    .limit(1);
  if (existing) throw new HttpError(409, "already_in_queue");

  await db.insert(queueEntries).values({ userId, status: "waiting", joinedAt: new Date() });
  return getPublicState();
}

export async function leaveQueue(userId: string): Promise<PublicStateDTO> {
  await purge();
  const row = await getRow();
  const wasNotified = row.currentNotifiedUserId === userId;
  await db
    .delete(queueEntries)
    .where(and(eq(queueEntries.userId, userId), inArray(queueEntries.status, ["waiting", "notified"])));
  if (wasNotified) await notifyNext();
  return getPublicState();
}

export async function purge(): Promise<void> {
  const t = Date.now();
  const row = await getRow();

  if (row.status === "occupied" && row.expiresAt && row.expiresAt.getTime() < t) {
    await db
      .update(bathroomState)
      .set({
        status: "free",
        lockedByUserId: null,
        lockedAt: null,
        expiresAt: null,
        extraMinutesUsed: 0,
      })
      .where(eq(bathroomState.id, 1));
    await notifyNext();
  }

  const after = await getRow();
  if (
    after.status === "free" &&
    after.currentNotifiedUserId &&
    after.notifiedAt &&
    after.notifiedAt.getTime() + CLAIM_WINDOW_MS < t
  ) {
    await db
      .update(queueEntries)
      .set({ status: "skipped" })
      .where(
        and(
          eq(queueEntries.userId, after.currentNotifiedUserId),
          eq(queueEntries.status, "notified"),
        ),
      );
    await notifyNext();
  }

  const cutoff = new Date(t - 60 * 60 * 1000);
  await db.delete(queueEntries).where(
    and(inArray(queueEntries.status, ["served", "skipped"]), lt(queueEntries.joinedAt, cutoff)),
  );
}
