import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface MetrajPanelHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export function MetrajPanelHeader({
  icon: Icon,
  title,
  description,
  actions,
  trailing,
  className = "",
}: MetrajPanelHeaderProps) {
  return (
    <div className={`metraj-panel-header ${className}`.trim()}>
      <span className="metraj-panel-header-icon" aria-hidden>
        <Icon size={20} />
      </span>
      <span className="metraj-panel-header-text">
        <span className="metraj-panel-header-title">{title}</span>
        {description && <span className="metraj-panel-header-desc">{description}</span>}
      </span>
      {actions && <div className="metraj-panel-header-actions">{actions}</div>}
      {trailing}
    </div>
  );
}
