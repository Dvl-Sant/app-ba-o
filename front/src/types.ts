export type UserRole = "admin" | "member";

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
  queue: QueueItem[];
}
