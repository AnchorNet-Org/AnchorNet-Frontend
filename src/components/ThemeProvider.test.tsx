import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "@/hooks/useTheme";
import * as themeLib from "@/lib/theme";

const STORAGE_KEY = "anchornet:theme";

interface MockMediaQueryList {
  matches: boolean;
  listeners: Set<(event: MediaQueryListEvent) => void>;
}

let mediaQuery: MockMediaQueryList;

function mockMediaQuery(prefersDark: boolean) {
  mediaQuery = { matches: prefersDark, listeners: new Set() };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      get matches() {
        return mediaQuery.matches;
      },
      media: "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(
        (_event: string, listener: (event: MediaQueryListEvent) => void) =>
          mediaQuery.listeners.add(listener),
      ),
      removeEventListener: vi.fn(
        (_event: string, listener: (event: MediaQueryListEvent) => void) =>
          mediaQuery.listeners.delete(listener),
      ),
    })),
  });
}

function emitSystemThemeChange(prefersDark: boolean) {
  mediaQuery.matches = prefersDark;
  const event = { matches: prefersDark } as MediaQueryListEvent;
  mediaQuery.listeners.forEach((listener) => listener(event));
}

function ThemeStatus() {
  const { theme, isOverridden, toggleTheme, resetToSystem } = useTheme();
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <span data-testid="override">{String(isOverridden)}</span>
      <button onClick={toggleTheme}>toggle</button>
      <button onClick={resetToSystem}>reset</button>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
    mockMediaQuery(false);
  });

  afterEach(() => vi.restoreAllMocks());

  it("uses a stored override instead of the system preference after mount", () => {
    localStorage.setItem(STORAGE_KEY, "dark");
    mockMediaQuery(false);

    render(
      <ThemeProvider>
        <ThemeStatus />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("override")).toHaveTextContent("true");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("uses the system preference when no override is stored", () => {
    mockMediaQuery(true);

    render(
      <ThemeProvider>
        <ThemeStatus />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("override")).toHaveTextContent("false");
  });

  it("falls back to light when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: undefined,
    });

    render(
      <ThemeProvider>
        <ThemeStatus />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("toggles, persists, and applies an explicit theme", () => {
    const saveTheme = vi.spyOn(themeLib, "saveTheme");
    const applyTheme = vi.spyOn(themeLib, "applyTheme");

    render(
      <ThemeProvider>
        <ThemeStatus />
      </ThemeProvider>,
    );
    applyTheme.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("override")).toHaveTextContent("true");
    expect(saveTheme).toHaveBeenCalledWith("dark");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(applyTheme).toHaveBeenCalledWith("dark");

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(saveTheme).toHaveBeenLastCalledWith("light");
  });

  it("clears an override and returns to the system preference", () => {
    localStorage.setItem(STORAGE_KEY, "dark");
    mockMediaQuery(false);
    const clearTheme = vi.spyOn(themeLib, "clearTheme");
    const applyTheme = vi.spyOn(themeLib, "applyTheme");

    render(
      <ThemeProvider>
        <ThemeStatus />
      </ThemeProvider>,
    );
    applyTheme.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "reset" }));

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("override")).toHaveTextContent("false");
    expect(clearTheme).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(applyTheme).toHaveBeenCalledWith("light");
  });

  it("follows system preference changes only without an override", () => {
    render(
      <ThemeProvider>
        <ThemeStatus />
      </ThemeProvider>,
    );

    act(() => emitSystemThemeChange(true));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");

    act(() => emitSystemThemeChange(true));
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });
});
