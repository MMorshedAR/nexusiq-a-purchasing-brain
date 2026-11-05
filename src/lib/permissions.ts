export function canManageWorkspaceSettings(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}