import type { ReactNode } from "react";

type PageHeaderVariant = "page" | "section" | "detail";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Sağ taraf: butonlar, menüler vb. */
  actions?: ReactNode;
  /** Başlık üstü: geri linki, breadcrumb vb. */
  before?: ReactNode;
  variant?: PageHeaderVariant;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  before,
  variant = "page",
  className = "",
}: PageHeaderProps) {
  const isSection = variant === "section";
  const isDetail = variant === "detail";
  const TitleTag = isSection ? "h2" : "h1";

  const titleClassName = isSection
    ? "detail-section-title"
    : isDetail
      ? "detail-title"
      : "section-title";

  return (
    <div className={`page-header page-header--${variant} ${className}`.trim()}>
      <div className="page-header-main">
        {before}
        <TitleTag className={titleClassName}>{title}</TitleTag>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
