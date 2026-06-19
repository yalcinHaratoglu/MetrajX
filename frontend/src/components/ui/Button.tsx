import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost" | "icon";
}

const variantClass = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  icon: "btn-icon",
} as const;

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={`${variantClass[variant]} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
