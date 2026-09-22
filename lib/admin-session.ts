export const ADMIN_COOKIE = "mate_admin_session";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "change-me";
}

export function sessionToken(): string {
  return `v1:${getAdminPassword()}`;
}
