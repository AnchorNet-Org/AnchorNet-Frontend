import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTheme } from "./useTheme";

describe("useTheme", () => {
  it("throws when used outside a ThemeProvider", () => {
    expect(() => renderHook(() => useTheme())).toThrow(
      "useTheme must be used within a ThemeProvider",
    );
  });
});
