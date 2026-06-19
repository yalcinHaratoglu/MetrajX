import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
