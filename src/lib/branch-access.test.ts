import { describe, expect, it } from "vitest";
import { canManagePayroll } from "./branch-access";

describe("payroll access", () => {
  it("allows a company Owner to access payroll", () => {
    expect(canManagePayroll("owner", null)).toBe(true);
  });

  it("allows an assigned branch admin to access payroll", () => {
    expect(canManagePayroll("viewer", "admin")).toBe(true);
  });

  it("does not grant payroll access to company admins or branch managers", () => {
    expect(canManagePayroll("admin", null)).toBe(false);
    expect(canManagePayroll("viewer", "manager")).toBe(false);
  });
});