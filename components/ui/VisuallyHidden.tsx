import { createElement, type ElementType, type ReactNode } from "react";

// ── VisuallyHidden ────────────────────────────────────────────────────────
// Renders content for screen readers only — visually hidden but present in
// the accessibility tree. Use for context a sighted user gets from layout
// (e.g. an icon-only button's label) that assistive tech needs spelled out.

interface VisuallyHiddenProps {
  children:   ReactNode;
  as?:        ElementType;
  className?: string;
}

export function VisuallyHidden({ children, as = "span", className = "" }: VisuallyHiddenProps) {
  return createElement(as, { className: `sr-only ${className}` }, children);
}
