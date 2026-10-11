import { describe, it, expect } from "vitest";
import { formatBDT, slugify, stockStatus } from "./format";

describe("format", () => {
  it("formats taka with symbol", () => expect(formatBDT(125000)).toBe("৳1,25,000"));
  it("slugifies", () => expect(slugify("Rahman Traders Ltd.")).toBe("rahman-traders-ltd"));
  it("out of stock at zero", () => expect(stockStatus(0, 10)).toBe("out"));
  it("low at reorder point", () => expect(stockStatus(10, 10)).toBe("low"));
  it("ok above reorder point", () => expect(stockStatus(11, 10)).toBe("ok"));
});
