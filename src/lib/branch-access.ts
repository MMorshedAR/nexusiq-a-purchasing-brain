export function canManagePayroll(
  companyRole: string | null | undefined,
  branchRole: string | null | undefined,
): boolean {
  return companyRole === "owner" || branchRole === "admin";
}