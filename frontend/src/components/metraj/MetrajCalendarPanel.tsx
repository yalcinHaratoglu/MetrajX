import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronDown } from "lucide-react";
import { MetrajPanelHeader } from "./MetrajPanelHeader";
import { MetrajCalendar } from "./MetrajCalendar";
import { metrajService, type MetrajOperation } from "../../services/metrajService";

interface MetrajCalendarPanelProps {
  title?: string;
  description?: string;
  /** Harici veri; verilmezse siteIds ile yüklenir. */
  operations?: MetrajOperation[];
  events?: import("../../services/calendarService").CalendarEvent[];
  siteIds?: number[];
  loading?: boolean;
  emptyMessage?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  selectToday?: boolean;
  /** true: sadece görüntüleme (dashboard, metraj listesi). */
  readonly?: boolean;
  /** true: aynı güne ikinci işlem eklenemez (kalem detayı). */
  oneOpPerDay?: boolean;
  showItemDescription?: boolean;
  onSelectOperation?: (op: MetrajOperation) => void;
  onAddForDate?: (date: string) => void;
  className?: string;
  onVisibleMonthChange?: (year: number, month: number) => void;
}

export function MetrajCalendarPanel({
  title,
  description,
  operations,
  events,
  siteIds,
  loading = false,
  emptyMessage,
  collapsible = false,
  defaultOpen = true,
  selectToday = false,
  readonly = false,
  oneOpPerDay = false,
  showItemDescription = true,
  onSelectOperation,
  onAddForDate,
  className = "",
  onVisibleMonthChange,
}: MetrajCalendarPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [fetchedOps, setFetchedOps] = useState<MetrajOperation[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [loadedSiteKey, setLoadedSiteKey] = useState<string | null>(null);

  const siteIdsKey = siteIds?.join(",") ?? "";
  const resolvedTitle = title ?? t("metraj.calendar.title");
  const resolvedOps = operations ?? fetchedOps;
  const needsFetch =
    operations === undefined &&
    siteIds !== undefined &&
    siteIds.length > 0 &&
    loadedSiteKey !== siteIdsKey;
  const isLoading = loading || fetchLoading || (open && needsFetch);
  const showEmpty = !isLoading && siteIds !== undefined && siteIds.length === 0;

  useEffect(() => {
    if (!open || siteIds === undefined || !needsFetch) return;

    let cancelled = false;

    void (async () => {
      setFetchLoading(true);
      try {
        const ops = await metrajService.calendarForSites(siteIds);
        if (!cancelled) {
          setFetchedOps(ops);
          setLoadedSiteKey(siteIdsKey);
        }
      } catch {
        if (!cancelled) {
          setFetchedOps([]);
          setLoadedSiteKey(siteIdsKey);
        }
      } finally {
        setFetchLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, siteIdsKey, needsFetch]);

  const body = showEmpty ? (
    <p className="text-sm text-muted">{emptyMessage ?? t("sites.selector.empty")}</p>
  ) : isLoading ? (
    <p className="text-sm text-muted">{t("common.loading")}</p>
  ) : (
    <MetrajCalendar
      operations={resolvedOps}
      events={events}
      readonly={readonly}
      oneOpPerDay={oneOpPerDay}
      showItemDescription={showItemDescription}
      onSelectOperation={onSelectOperation}
      onAddForDate={readonly ? undefined : onAddForDate}
      selectToday={selectToday}
      onVisibleMonthChange={onVisibleMonthChange}
    />
  );

  if (collapsible) {
    return (
      <section className={`surface-card metraj-calendar-panel metraj-calendar-panel-collapsible ${className}`.trim()}>
        <button
          type="button"
          className="metraj-calendar-panel-toggle metraj-panel-header-btn"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <MetrajPanelHeader
            icon={CalendarDays}
            title={resolvedTitle}
            description={description}
            trailing={
              <ChevronDown
                size={18}
                className={`metraj-calendar-panel-chevron${open ? " is-open" : ""}`}
                aria-hidden
              />
            }
          />
        </button>

        {open && <div className="metraj-calendar-panel-body">{body}</div>}
      </section>
    );
  }

  return (
    <section className={`surface-card metraj-calendar-panel ${className}`.trim()}>
      <div className="metraj-calendar-panel-head">
        <h2 className="detail-section-title">{resolvedTitle}</h2>
        {description && <p className="text-sm text-muted metraj-calendar-panel-desc">{description}</p>}
      </div>
      <div className="metraj-calendar-panel-body metraj-calendar-panel-body-static">{body}</div>
    </section>
  );
}
