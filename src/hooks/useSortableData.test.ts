import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSortableData } from "./useSortableData";

interface Row {
  id: number;
  amount: number;
  label: string;
}

const rows: Row[] = [
  { id: 1, amount: 30, label: "b" },
  { id: 2, amount: 10, label: "a" },
  { id: 3, amount: 20, label: "c" },
];

function getValue(row: Row, key: "amount" | "label") {
  return row[key];
}

describe("useSortableData", () => {
  it("returns items in their original order by default", () => {
    const { result } = renderHook(() => useSortableData(rows, getValue));
    expect(result.current.sorted.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(result.current.sort).toBeNull();
  });

  it("sorts ascending on the first request for a column", () => {
    const { result } = renderHook(() => useSortableData(rows, getValue));
    act(() => result.current.requestSort("amount"));
    expect(result.current.sorted.map((r) => r.amount)).toEqual([10, 20, 30]);
    expect(result.current.sort).toEqual({ key: "amount", direction: "asc" });
  });

  it("toggles to descending on a second request for the same column", () => {
    const { result } = renderHook(() => useSortableData(rows, getValue));
    act(() => result.current.requestSort("amount"));
    act(() => result.current.requestSort("amount"));
    expect(result.current.sorted.map((r) => r.amount)).toEqual([30, 20, 10]);
    expect(result.current.sort).toEqual({ key: "amount", direction: "desc" });
  });

  it("clears sorting on a third request for the same column", () => {
    const { result } = renderHook(() => useSortableData(rows, getValue));
    act(() => result.current.requestSort("amount"));
    act(() => result.current.requestSort("amount"));
    act(() => result.current.requestSort("amount"));
    expect(result.current.sorted.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(result.current.sort).toBeNull();
  });

  it("switching to a different column resets to ascending", () => {
    const { result } = renderHook(() => useSortableData(rows, getValue));
    act(() => result.current.requestSort("amount"));
    act(() => result.current.requestSort("amount"));
    act(() => result.current.requestSort("label"));
    expect(result.current.sorted.map((r) => r.label)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(result.current.sort).toEqual({ key: "label", direction: "asc" });
  });

  it("does not mutate the original items array", () => {
    const original = [...rows];
    const { result } = renderHook(() => useSortableData(rows, getValue));
    act(() => result.current.requestSort("amount"));
    expect(rows).toEqual(original);
  });
  it("clearSort resets to unsorted from ascending", () => {
    const { result } = renderHook(() => useSortableData(rows, getValue));
    act(() => result.current.requestSort("amount"));
    expect(result.current.sort).toEqual({ key: "amount", direction: "asc" });

    act(() => result.current.clearSort());
    expect(result.current.sort).toBeNull();
    expect(result.current.sorted.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("clearSort resets to unsorted from descending", () => {
    const { result } = renderHook(() => useSortableData(rows, getValue));
    act(() => result.current.requestSort("amount"));
    act(() => result.current.requestSort("amount"));
    expect(result.current.sort).toEqual({ key: "amount", direction: "desc" });

    act(() => result.current.clearSort());
    expect(result.current.sort).toBeNull();
    expect(result.current.sorted.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("clearSort is a no-op when already unsorted", () => {
    const { result } = renderHook(() => useSortableData(rows, getValue));
    expect(result.current.sort).toBeNull();

    act(() => result.current.clearSort());
    expect(result.current.sort).toBeNull();
    expect(result.current.sorted.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('persists sort across items replacement', () => {
    const { result, rerender } = renderHook(
      ({ data }) => useSortableData(data, getValue),
      { initialProps: { data: rows } }
    );
    // set sort to ascending amount
    act(() => result.current.requestSort('amount'));
    expect(result.current.sort).toEqual({ key: 'amount', direction: 'asc' });
    // create a new array with same items but different order
    const newRows = [rows[2], rows[0], rows[1]];
    rerender({ data: newRows });
    // expect sorting still applied to new data
    expect(result.current.sorted.map((r) => r.amount)).toEqual([10, 20, 30]);
    expect(result.current.sort).toEqual({ key: 'amount', direction: 'asc' });
  });
});
