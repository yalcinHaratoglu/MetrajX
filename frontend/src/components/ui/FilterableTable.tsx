import { Filter } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type FilterableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  getFilterValue: (row: T) => string;
};

interface FilterableTableProps<T> {
  rows: T[];
  filterSourceRows: T[];
  columns: FilterableColumn<T>[];
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  allFilterLabel: string;
  emptyMessage?: ReactNode;
  actionsColumn?: (row: T) => ReactNode;
  actionsHeader?: string;
}

function ColumnHeaderFilter({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const active = Boolean(value);

  return (
    <div className="column-header-filter" ref={ref}>
      <button
        type="button"
        className={`column-header-filter-btn${active ? " column-header-filter-btn-active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        <Filter size={13} />
      </button>
      {open && (
        <ul className="column-filter-menu">
          <li>
            <button
              type="button"
              className={!value ? "selected" : ""}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {allLabel}
            </button>
          </li>
          {options.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                className={value === opt ? "selected" : ""}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FilterableTable<T extends { id: number | string }>({
  rows,
  filterSourceRows,
  columns,
  filters,
  onFilterChange,
  allFilterLabel,
  emptyMessage,
  actionsColumn,
  actionsHeader,
}: FilterableTableProps<T>) {
  const filterOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of columns) {
      const values = new Set<string>();
      for (const row of filterSourceRows) {
        const v = col.getFilterValue(row).trim();
        if (v) values.add(v);
      }
      map[col.key] = Array.from(values).sort((a, b) => a.localeCompare(b, "tr"));
    }
    return map;
  }, [columns, filterSourceRows]);

  if (rows.length === 0 && emptyMessage) {
    return <>{emptyMessage}</>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table data-table-filterable">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>
                <ColumnHeaderFilter
                  label={col.header}
                  value={filters[col.key] ?? ""}
                  options={filterOptions[col.key] ?? []}
                  onChange={(v) => onFilterChange(col.key, v)}
                  allLabel={allFilterLabel}
                />
              </th>
            ))}
            {actionsColumn && <th>{actionsHeader ?? ""}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key}>{col.render(row)}</td>
              ))}
              {actionsColumn && <td className="table-actions-cell">{actionsColumn(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
