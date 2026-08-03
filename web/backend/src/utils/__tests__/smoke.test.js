import { describe, it, expect } from "vitest";

describe("vitest wiring", () => {
  it("runs ESM tests in the backend package", () => {
    expect(1 + 1).toBe(2);
  });
});
