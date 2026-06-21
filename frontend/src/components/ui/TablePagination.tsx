import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({ page, pageSize, totalItems, onPageChange }: TablePaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  if (totalItems <= pageSize) return null;

  return (
    <div className="table-pagination">
      <span className="table-pagination-info">
        {t("common.pagination.range", { start, end, total: totalItems })}
      </span>
      <div className="table-pagination-controls">
        <button
          type="button"
          className="table-pagination-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label={t("common.pagination.previous")}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="table-pagination-page">
          {t("common.pagination.page", { page: safePage, total: totalPages })}
        </span>
        <button
          type="button"
          className="table-pagination-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label={t("common.pagination.next")}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
