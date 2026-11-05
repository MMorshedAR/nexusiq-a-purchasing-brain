import { describe, expect, it } from "vitest";
import { canManageWorkspaceSettings } from "./permissions";

describe("company settings permissions", () => {
  it.each(["owner", "admin"])("%s can manage company settings", (role) => {
    expect(canManageWorkspaceSettings(role)).toBe(true);
  });

  it.each(["manager", "analyst", "viewer", null, undefined])("%s cannot manage company settings", (role) => {
    expect(canManageWorkspaceSettings(role)).toBe(false);
  });
});