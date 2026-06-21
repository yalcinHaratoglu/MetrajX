import { useCallback, useMemo, useState } from "react";

export function useTablePagination<T>(rows: T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  const resetPage = useCallback(() => setPage(1), []);

  return {
    page: safePage,
    setPage,
    resetPage,
    paginatedRows,
    totalPages,
    showPagination: rows.length > pageSize,
  };
}
