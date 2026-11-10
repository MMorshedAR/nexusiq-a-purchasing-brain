import { describe, expect, it } from "vitest";
import { calculateNetSalaryCents, salaryPeriodForMonth } from "./management";

describe("salary calculations", () => {
  it("adds allowances and bonuses, then subtracts deductions using exact cents", () => {
    expect(calculateNetSalaryCents("12500.10", "1500.25", "99.99", "100.34")).toBe(1400000);
  });

  it("stores a selected payroll month as its first day", () => {
    expect(salaryPeriodForMonth("2026-11")).toBe("2026-11-01");
  });
});