import { Filter, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

const FILTER_SEARCH_THRESHOLD = 7;
const FILTER_LIST_VISIBLE_ROWS = 7;

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
  onRowClick?: (row: T) => void;
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, minWidth: 140 });

  const showSearch = options.length > FILTER_SEARCH_THRESHOLD;
  const normalizedQuery = query.trim().toLocaleLowerCase("tr");
  const filteredOptions = useMemo(() => {
    if (!showSearch || !normalizedQuery) return options;
    return options.filter((opt) => opt.toLocaleLowerCase("tr").includes(normalizedQuery));
  }, [options, normalizedQuery, showSearch]);

  const closeMenu = useCallback(() => {
    setQuery("");
    setOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    if (open) closeMenu();
    else setOpen(true);
  }, [open, closeMenu]);

  const updateMenuPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      left: rect.left,
      minWidth: Math.max(rect.width, 140),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPos();
    const onLayoutChange = () => updateMenuPos();
    window.addEventListener("scroll", onLayoutChange, true);
    window.addEventListener("resize", onLayoutChange);
    return () => {
      window.removeEventListener("scroll", onLayoutChange, true);
      window.removeEventListener("resize", onLayoutChange);
    };
  }, [open, updateMenuPos]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open || !showSearch) return;
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, showSearch]);

  const active = Boolean(value);

  const menu = open
    ? createPortal(
      <div
        ref={menuRef}
        className="column-filter-menu"
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          minWidth: menuPos.minWidth,
        }}
      >
        <button
          type="button"
          className={`column-filter-menu-item${!value ? " selected" : ""}`}
          onClick={() => {
            onChange("");
            closeMenu();
          }}
        >
          {allLabel}
        </button>

        {showSearch && (
          <div className="column-filter-menu-search">
            <Search size={14} aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("metraj.filter")}
              aria-label={t("metraj.filter")}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <div
          className={`column-filter-menu-list${showSearch ? " is-scrollable" : ""}`}
          style={
            showSearch
              ? { height: `calc(${FILTER_LIST_VISIBLE_ROWS} * 2.25rem)` }
              : undefined
          }
        >
          {filteredOptions.length === 0 ? (
            <p className="column-filter-menu-empty">{t("metraj.filterNoResults")}</p>
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`column-filter-menu-item${value === opt ? " selected" : ""}`}
                onClick={() => {
                  onChange(opt);
                  closeMenu();
                }}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <div className="column-header-filter" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className={`column-header-filter-btn${active ? " column-header-filter-btn-active" : ""}`}
        onClick={toggleMenu}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{label}</span>
        <Filter size={13} />
      </button>
      {menu}
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
  onRowClick,
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
            <tr
              key={row.id}
              className={onRowClick ? "data-table-row-clickable" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
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
