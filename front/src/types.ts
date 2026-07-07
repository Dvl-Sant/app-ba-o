export type UserRole = "admin" | "local" | "visitante";

export interface PublicUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export interface QueueItem {
  position: number;
  userId: string;
  name: string;
}

export interface BanoStateDTO {
  status: "free" | "occupied";
  lockedBy: { id: string; name: string } | null;
  expiresAt: number | null;
  extraMinutesUsed: number;
  extraMax: number;
  notifiedUserId: string | null;
  claimExpiresAt: number | null;
  panic: boolean;
  queue: QueueItem[];
}

export type UsageReason = "normal" | "forced" | "expired";

export interface HistoryEntry {
  id: string;
  userId: string | null;
  userName: string;
  lockedAt: number;
  unlockedAt: number;
  durationMs: number;
  extraMinutesUsed: number;
  reason: UsageReason;
}

export interface RankingEntry {
  userId: string | null;
  userName: string;
  count: number;
  totalMs: number;
}

export interface ChatMessage {
  id: string;
  userId: string | null;
  userName: string;
  body: string;
  createdAt: number;
}
