import type { ReactNode } from "react";

type CardVariant = "default" | "narrow" | "wide";

const variantClass: Record<CardVariant, string> = {
  default: "card",
  narrow: "card-narrow",
  wide: "card-wide",
};

export function Card({
  children,
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
}) {
  return <div className={`${variantClass[variant]} ${className}`.trim()}>{children}</div>;
}
