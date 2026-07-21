import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnchorForm } from "./AnchorForm";

describe("AnchorForm", () => {
  it("blocks submission and shows an error when the id is blank", () => {
    const onSubmit = vi.fn();
    render(<AnchorForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText("Register"));

    expect(screen.getByText("Anchor id is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an id with disallowed characters", () => {
    const onSubmit = vi.fn();
    render(<AnchorForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("Anchor id (account or domain)"), {
      target: { value: "bad id!" },
    });
    fireEvent.click(screen.getByText("Register"));

    expect(
      screen.getByText("Use only letters, numbers, dots, dashes or underscores."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the trimmed id and optional name, then resets the form", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<AnchorForm onSubmit={onSubmit} />);

    const idInput = screen.getByPlaceholderText("Anchor id (account or domain)");
    const nameInput = screen.getByPlaceholderText("Display name (optional)");
    fireEvent.change(idInput, { target: { value: " anchor.example.org " } });
    fireEvent.change(nameInput, { target: { value: " Example Anchor " } });
    fireEvent.click(screen.getByText("Register"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        id: "anchor.example.org",
        name: "Example Anchor",
      });
      expect(idInput).toHaveValue("");
      expect(nameInput).toHaveValue("");
    });
  });

  it("disables the submit button while pending", () => {
    render(<AnchorForm onSubmit={() => {}} pending />);
    expect(screen.getByText("Register")).toBeDisabled();
  });

  it("clears field values, errors, and focuses the id field after reset", () => {
    const onSubmit = vi.fn();
    render(<AnchorForm onSubmit={onSubmit} />);

    const idInput = screen.getByPlaceholderText("Anchor id (account or domain)");
    const nameInput = screen.getByPlaceholderText("Display name (optional)");

    // Fill in an invalid id and a name, then attempt to submit to trigger errors.
    fireEvent.change(idInput, { target: { value: "bad id!" } });
    fireEvent.change(nameInput, { target: { value: "Some Name" } });
    fireEvent.click(screen.getByText("Register"));

    // Confirm the error is visible and onSubmit was not called.
    expect(
      screen.getByText("Use only letters, numbers, dots, dashes or underscores."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    // Click Reset.
    fireEvent.click(screen.getByText("Reset"));

    // All field values must be cleared.
    expect(idInput).toHaveValue("");
    expect(nameInput).toHaveValue("");

    // All error messages must be gone.
    expect(
      screen.queryByText("Use only letters, numbers, dots, dashes or underscores."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Anchor id is required."),
    ).not.toBeInTheDocument();

    // The id input must receive focus.
    expect(idInput).toHaveFocus();

    // Reset must not have triggered a network request.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when Reset is clicked", () => {
    const onSubmit = vi.fn();
    render(<AnchorForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("Anchor id (account or domain)"), {
      target: { value: "valid-anchor" },
    });
    fireEvent.click(screen.getByText("Reset"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("displays an externally-supplied serverError", () => {
    render(<AnchorForm onSubmit={vi.fn()} serverError="Duplicate ID" />);
    expect(screen.getByText("Duplicate ID")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Anchor id (account or domain)")).toHaveAttribute("aria-invalid", "true");
  });

  it("does not reset the form when onSubmit returns false", async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(<AnchorForm onSubmit={onSubmit} />);

    const idInput = screen.getByPlaceholderText("Anchor id (account or domain)");
    fireEvent.change(idInput, { target: { value: "valid-anchor" } });
    fireEvent.click(screen.getByText("Register"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      expect(idInput).toHaveValue("valid-anchor");
    });
  });
});
