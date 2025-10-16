// src/lib/role.ts
export type UserRole = "ADMIN" | "STAFF" | (string & {}); // tolerate unknowns
export type MinimalUser = { id: bigint | string; role?: UserRole | null } | null | undefined;

export function isAdmin(user: MinimalUser): boolean {
  return (user?.role ?? "STAFF") === "ADMIN";
}
