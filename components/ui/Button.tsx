"use client";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
  loading?: boolean;
  icon?:    React.ReactNode;
  iconEnd?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLS: Record<ButtonVariant, string> = {
  primary:   "bg-brand text-white border-brand hover:bg-brand-dark hover:border-brand-dark active:bg-brand-dark shadow-subtle",
  secondary: "bg-surface-subtle text-ink border-border hover:bg-surface-hover hover:border-border-strong",
  ghost:     "bg-transparent text-ink-muted border-transparent hover:bg-surface-subtle hover:text-ink",
  danger:    "bg-danger-bg text-danger border-danger-border hover:bg-danger-border hover:text-surface",
  success:   "bg-success-bg text-success-text border-success-border hover:bg-success-border hover:text-surface",
};

const SIZE_CLS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[11px] font-semibold gap-1.5 rounded-lg",
  md: "h-10 px-4 text-[13px] font-semibold gap-2 rounded-xl",
  lg: "h-12 px-5 text-[14px] font-semibold gap-2.5 rounded-xl",
};

export function Button({
  variant    = "primary",
  size       = "md",
  loading    = false,
  icon,
  iconEnd,
  fullWidth  = false,
  children,
  className  = "",
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center border font-sans
        transition-colors duration-normal
        focus-ring
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? "w-full" : ""}
        ${SIZE_CLS[size]}
        ${VARIANT_CLS[variant]}
        ${className}
      `}
    >
      {loading ? (
        <span
          className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0"
          aria-hidden="true"
        />
      ) : icon ? (
        <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {iconEnd && !loading && (
        <span className="flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">{iconEnd}</span>
      )}
    </button>
  );
}
