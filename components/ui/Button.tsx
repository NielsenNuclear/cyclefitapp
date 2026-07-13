"use client";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "dark";
export type ButtonSize    = "sm" | "md" | "lg";
export type ButtonShape   = "default" | "pill";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
  shape?:   ButtonShape;
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
  // High-contrast ink CTA — the onboarding "Continue" treatment. Kept distinct
  // from `primary` (brand purple) deliberately: folding StepContinueButton into
  // Button must preserve its existing look, not repaint it purple.
  dark:      "bg-ink text-white border-ink hover:bg-ink/90 hover:border-ink/90",
};

const SIZE_CLS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[11px] font-semibold gap-1.5 rounded-lg",
  md: "h-10 px-4 text-[13px] font-semibold gap-2 rounded-xl",
  lg: "h-12 px-5 text-[14px] font-semibold gap-2.5 rounded-xl",
};

// Pill shape uses padding-driven height (not a fixed h-*) and a full radius —
// matches the original onboarding CTA exactly, just token-driven now.
const PILL_SIZE_CLS: Record<ButtonSize, string> = {
  sm: "py-2 px-4 text-[12px] font-semibold gap-1.5 rounded-full",
  md: "py-3 px-5 text-[13px] font-semibold gap-2 rounded-full",
  lg: "py-3.5 px-6 text-[14px] font-semibold gap-2.5 rounded-full",
};

// Lifted-shadow hover treatment, scoped to pill shape only — this is the one
// place in the app with a bespoke "elevated CTA" shadow; it doesn't map to
// any of the five shadow tokens, so it stays a documented, ink-tinted
// arbitrary value rather than forcing a new global token for one button.
const PILL_SHAPE_CLS = "shadow-[0_4px_20px_rgba(28,27,24,0.12)] hover:shadow-[0_6px_28px_rgba(28,27,24,0.18)] hover:-translate-y-0.5";

export function Button({
  variant    = "primary",
  size       = "md",
  shape      = "default",
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
        ${shape === "pill" ? PILL_SIZE_CLS[size] : SIZE_CLS[size]}
        ${shape === "pill" ? PILL_SHAPE_CLS : ""}
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
