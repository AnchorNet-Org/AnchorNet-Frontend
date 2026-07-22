import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SiteHeader } from "./SiteHeader";
import { WalletProvider } from "./WalletProvider";
import { ThemeProvider } from "./ThemeProvider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

function mockMediaQuery(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? prefersDark : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

/** Renders SiteHeader inside all required providers. */
function renderHeader() {
  return render(
    <WalletProvider>
      <ThemeProvider>
        <SiteHeader />
      </ThemeProvider>
    </WalletProvider>,
  );
}

const STORAGE_KEY = "anchornet:theme";

beforeEach(() => {
  mockUsePathname.mockReturnValue("/");
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("dark");
  mockMediaQuery(false); // default: system is light
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("dark");
});

// ---------------------------------------------------------------------------
// Existing navigation tests (regression guard)
// ---------------------------------------------------------------------------

describe("SiteHeader navigation", () => {
  it("renders the primary navigation links", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "AnchorNet" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Anchors" })).toHaveAttribute(
      "href",
      "/anchors",
    );
    expect(screen.getByRole("link", { name: "Settlements" })).toHaveAttribute(
      "href",
      "/settlements",
    );
  });

  it("renders the wallet connect button", () => {
    renderHeader();
    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Active route aria-current marking
// ---------------------------------------------------------------------------

describe("SiteHeader active route marking", () => {
  it("marks 'Home' link with aria-current='page' when on '/'", () => {
    mockUsePathname.mockReturnValue("/");
    renderHeader();

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Anchors" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByRole("link", { name: "Settlements" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks 'Dashboard' link with aria-current='page' when on '/dashboard'", () => {
    mockUsePathname.mockReturnValue("/dashboard");
    renderHeader();

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks 'Anchors' link with aria-current='page' when on '/anchors'", () => {
    mockUsePathname.mockReturnValue("/anchors");
    renderHeader();

    expect(screen.getByRole("link", { name: "Anchors" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks 'Anchors' link as current for detail routes like '/anchors/anc_123'", () => {
    mockUsePathname.mockReturnValue("/anchors/anc_123");
    renderHeader();

    expect(screen.getByRole("link", { name: "Anchors" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks 'Settlements' link with aria-current='page' when on '/settlements'", () => {
    mockUsePathname.mockReturnValue("/settlements");
    renderHeader();

    expect(screen.getByRole("link", { name: "Settlements" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks 'Settlements' link as current for detail routes like '/settlements/stl_456'", () => {
    mockUsePathname.mockReturnValue("/settlements/stl_456");
    renderHeader();

    expect(screen.getByRole("link", { name: "Settlements" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("does not mark any link as current for an unrecognized route", () => {
    mockUsePathname.mockReturnValue("/unknown");
    renderHeader();

    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Anchors" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByRole("link", { name: "Settlements" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("handles null pathname gracefully", () => {
    mockUsePathname.mockReturnValue(null);
    renderHeader();

    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Anchors" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByRole("link", { name: "Settlements" }),
    ).not.toHaveAttribute("aria-current");
  });
});

// ---------------------------------------------------------------------------
// Theme toggle button rendering
// ---------------------------------------------------------------------------

describe("SiteHeader theme toggle – button presence", () => {
  it("renders a theme toggle button", () => {
    renderHeader();
    // The toggle is accessible via its aria-label.
    expect(
      screen.getByRole("button", { name: /switch to (light|dark) mode/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Switch to dark mode' label when system theme is light (no stored override)", async () => {
    mockMediaQuery(false); // system: light
    renderHeader();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /switch to dark mode/i }),
      ).toBeInTheDocument(),
    );
  });

  it("shows 'Switch to light mode' label when system theme is dark (no stored override)", async () => {
    mockMediaQuery(true); // system: dark
    renderHeader();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /switch to light mode/i }),
      ).toBeInTheDocument(),
    );
  });
});

// ---------------------------------------------------------------------------
// Theme toggle – toggling behaviour
// ---------------------------------------------------------------------------

describe("SiteHeader theme toggle – toggling", () => {
  it("switches from light to dark when clicked", async () => {
    mockMediaQuery(false);
    renderHeader();

    // Wait for hydration
    const toggleBtn = await screen.findByRole("button", {
      name: /switch to dark mode/i,
    });
    fireEvent.click(toggleBtn);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /switch to light mode/i }),
      ).toBeInTheDocument(),
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("switches from dark to light when clicked", async () => {
    mockMediaQuery(true); // start dark
    renderHeader();

    const toggleBtn = await screen.findByRole("button", {
      name: /switch to light mode/i,
    });
    fireEvent.click(toggleBtn);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /switch to dark mode/i }),
      ).toBeInTheDocument(),
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("toggles back to dark after two clicks (light → dark → light is wrong; two clicks = light)", async () => {
    mockMediaQuery(false); // start light
    renderHeader();

    const toggleBtn = await screen.findByRole("button", {
      name: /switch to dark mode/i,
    });

    // first click: light → dark
    fireEvent.click(toggleBtn);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /switch to light mode/i }),
      ).toBeInTheDocument(),
    );

    // second click: dark → light
    fireEvent.click(screen.getByRole("button", { name: /switch to light mode/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /switch to dark mode/i }),
      ).toBeInTheDocument(),
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Theme toggle – localStorage persistence
// ---------------------------------------------------------------------------

describe("SiteHeader theme toggle – persistence", () => {
  it("persists 'dark' to localStorage after toggling from light", async () => {
    mockMediaQuery(false);
    renderHeader();

    const toggleBtn = await screen.findByRole("button", {
      name: /switch to dark mode/i,
    });
    fireEvent.click(toggleBtn);

    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEY)).toBe("dark"),
    );
  });

  it("persists 'light' to localStorage after toggling from dark", async () => {
    mockMediaQuery(true);
    renderHeader();

    const toggleBtn = await screen.findByRole("button", {
      name: /switch to light mode/i,
    });
    fireEvent.click(toggleBtn);

    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEY)).toBe("light"),
    );
  });

  it("survives a simulated page reload: persisted 'dark' is restored", async () => {
    // Pre-seed localStorage as if the user had previously chosen dark.
    localStorage.setItem(STORAGE_KEY, "dark");
    mockMediaQuery(false); // system is light, but stored override is dark

    renderHeader();

    // After mount the ThemeProvider should have read the stored override.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /switch to light mode/i }),
      ).toBeInTheDocument(),
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("survives a simulated page reload: persisted 'light' overrides dark system", async () => {
    localStorage.setItem(STORAGE_KEY, "light");
    mockMediaQuery(true); // system is dark, but stored override is light

    renderHeader();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /switch to dark mode/i }),
      ).toBeInTheDocument(),
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("defaults to system preference (dark) when no override is stored", async () => {
    mockMediaQuery(true); // system: dark, no stored override
    renderHeader();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /switch to light mode/i }),
      ).toBeInTheDocument(),
    );
  });

  it("defaults to system preference (light) when no override is stored", async () => {
    mockMediaQuery(false); // system: light, no stored override
    renderHeader();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /switch to dark mode/i }),
      ).toBeInTheDocument(),
    );
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe("SiteHeader theme toggle – accessibility", () => {
  it("toggle button has a meaningful aria-label", async () => {
    renderHeader();
    const btn = await screen.findByRole("button", {
      name: /switch to (light|dark) mode/i,
    });
    expect(btn).toHaveAttribute("aria-label");
    expect(btn.getAttribute("aria-label")).toMatch(/switch to (light|dark) mode/i);
  });

  it("aria-label updates after toggling", async () => {
    mockMediaQuery(false);
    renderHeader();

    const toggleBtn = await screen.findByRole("button", {
      name: /switch to dark mode/i,
    });
    expect(toggleBtn.getAttribute("aria-label")).toBe("Switch to dark mode");

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      const updated = screen.getByRole("button", { name: /switch to light mode/i });
      expect(updated.getAttribute("aria-label")).toBe("Switch to light mode");
    });
  });
});
