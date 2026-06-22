import { Info } from "lucide-react";

interface PageInfoTooltipProps {
  text: string;
}

export function PageInfoTooltip({ text }: PageInfoTooltipProps) {
  return (
    <span className="page-info-tooltip" title={text} aria-label={text}>
      <Info size={16} />
    </span>
  );
}
