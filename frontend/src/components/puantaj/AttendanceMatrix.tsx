import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { parseDateKey, toDateKey } from "../metraj/calendarUtils";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { TablePagination } from "../ui/TablePagination";
import { useSiteData } from "../../hooks/useSiteData";
import { useTablePagination } from "../../hooks/useTablePagination";
import {
  puantajService,
  type AttendanceMatrixData,
  type Subcontractor,
  type EmploymentType,
} from "../../services/puantajService";
import { toast } from "../../lib/toast";

const PAGE_SIZE = 15;

const emptyMatrix: AttendanceMatrixData = {
  date_from: "",
  date_to: "",
  dates: [],
  workers: [],
};

type Props = {
  siteId: number;
  dateFrom: string;
  dateTo: string;
  subcontractors: Subcontractor[];
  canManage: boolean;
  onChanged?: () => void;
};

export function AttendanceMatrix({
  siteId,
  dateFrom,
  dateTo,
  subcontractors,
  canManage,
  onChanged,
}: Props) {
  const { t } = useTranslation();
  const today = toDateKey(new Date());
  const [subcontractorId, setSubcontractorId] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [search, setSearch] = useState("");
  const [busyCell, setBusyCell] = useState<string | null>(null);

  const fetchKey = `${siteId}|${dateFrom}|${dateTo}|${subcontractorId}|${employmentType}|${search}`;

  const fetcher = useCallback(async (): Promise<AttendanceMatrixData> => {
    return puantajService.getAttendanceMatrix({
      site_id: siteId,
      date_from: dateFrom,
      date_to: dateTo,
      subcontractor_id: subcontractorId ? Number(subcontractorId) : undefined,
      employment_type: employmentType ? (employmentType as EmploymentType) : undefined,
      search: search.trim() || undefined,
    });
  }, [siteId, dateFrom, dateTo, subcontractorId, employmentType, search]);

  const { data, loading, setData } = useSiteData(fetchKey, fetcher, emptyMatrix);
  const rows = data.workers;
  const dates = data.dates;

  const { page, setPage, paginatedRows, showPagination } = useTablePagination(rows, PAGE_SIZE);

  const subOptions = useMemo(
    () => [
      { value: "", label: t("puantaj.attendance.allSubcontractors") },
      ...subcontractors
        .filter((s) => s.is_active)
        .map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [subcontractors, t],
  );

  const employmentOptions = useMemo(
    () => [
      { value: "", label: t("puantaj.attendance.allWorkers") },
      { value: "subcontractor", label: t("puantaj.worker.employment.subcontractor") },
      { value: "direct", label: t("puantaj.worker.employment.direct") },
    ],
    [t],
  );

  const toggleDay = async (workerId: number, date: string, present: boolean) => {
    if (!canManage || date > today) return;
    const cellKey = `${workerId}-${date}`;
    setBusyCell(cellKey);
    try {
      await puantajService.toggleAttendance({
        site_id: siteId,
        worker_id: workerId,
        date,
        present,
      });
      setData((prev) => ({
        ...prev,
        workers: prev.workers.map((row) => {
          if (row.id !== workerId) return row;
          const nextDays = { ...row.days, [date]: present };
          return {
            ...row,
            days: nextDays,
            total_days: Object.values(nextDays).filter(Boolean).length,
          };
        }),
      }));
      onChanged?.();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusyCell(null);
    }
  };

  const exportXlsx = async () => {
    try {
      await puantajService.exportAttendanceXlsx({
        site_id: siteId,
        date_from: dateFrom,
        date_to: dateTo,
        subcontractor_id: subcontractorId ? Number(subcontractorId) : undefined,
        employment_type: employmentType ? (employmentType as EmploymentType) : undefined,
        search: search.trim() || undefined,
      });
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <div className="attendance-matrix-panel">
      <div className="attendance-matrix-filters">
        <Select
          label={t("puantaj.attendance.workerType")}
          value={employmentType}
          onChange={(v) => {
            setEmploymentType(v);
            if (v === "direct") setSubcontractorId("");
            setPage(1);
          }}
          options={employmentOptions}
        />
        {employmentType !== "direct" && (
          <Select
            label={t("puantaj.attendance.subcontractor")}
            value={subcontractorId}
            onChange={(v) => {
              setSubcontractorId(v);
              setPage(1);
            }}
            options={subOptions}
          />
        )}
        <Input
          label={t("puantaj.attendance.search")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("puantaj.attendance.searchPlaceholder")}
        />
        <div className="attendance-matrix-export">
          <Button type="button" variant="ghost" onClick={() => void exportXlsx()}>
            <Download size={16} />
            {t("puantaj.attendance.export")}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-muted">{t("puantaj.attendance.empty")}</p>
      ) : (
        <>
          <div className="attendance-matrix-scroll surface-card">
            <table className="data-table attendance-matrix-table">
              <thead>
                <tr>
                  <th className="attendance-sticky-col">{t("puantaj.attendance.worker")}</th>
                  <th className="attendance-sticky-col-2">{t("puantaj.attendance.employer")}</th>
                  {dates.map((d) => (
                    <th key={d} className="attendance-day-col">
                      {parseDateKey(d).getDate()}
                    </th>
                  ))}
                  <th className="attendance-total-col">{t("puantaj.attendance.totalDays")}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => (
                  <tr key={row.id}>
                    <td className="attendance-sticky-col">{row.full_name}</td>
                    <td className="attendance-sticky-col-2">{row.subcontractor_name}</td>
                    {dates.map((d) => {
                      const present = Boolean(row.days[d]);
                      const future = d > today;
                      const cellKey = `${row.id}-${d}`;
                      return (
                        <td key={d} className="attendance-day-col">
                          <button
                            type="button"
                            className={`attendance-cell${present ? " is-present" : ""}${future ? " is-disabled" : ""}`}
                            disabled={!canManage || future || busyCell === cellKey}
                            onClick={() => void toggleDay(row.id, d, !present)}
                          >
                            {present ? "✓" : ""}
                          </button>
                        </td>
                      );
                    })}
                    <td className="attendance-total-col">{row.total_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showPagination && (
            <TablePagination page={page} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
