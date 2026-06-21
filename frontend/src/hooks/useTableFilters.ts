import { useMemo, useState } from "react";

export type ColumnFilter<T> = {
  key: string;
  getValue: (row: T) => string;
};

export function useTableFilters<T>(rows: T[], columns: ColumnFilter<T>[]) {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      columns.every((col) => {
        const selected = filters[col.key]?.trim();
        if (!selected) return true;
        return col.getValue(row) === selected;
      }),
    );
  }, [rows, filters, columns]);

  return { filters, setFilter, filteredRows, clearFilters: () => setFilters({}) };
}
