import { describe, expect, it } from "vitest";
import { plans } from "./plans";

describe("NexusIQ plan prices", () => {
  it("keeps the published Starter, Growth, and Enterprise monthly prices", () => {
    expect(plans.map(({ name, price }) => [name, price])).toEqual([
      ["Starter", 1000],
      ["Growth", 5000],
      ["Enterprise", 20000],
    ]);
  });
});