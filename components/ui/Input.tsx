"use client";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

// ── TextInput ──────────────────────────────────────────────────────────────

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?:     string;
  error?:     string;
  hint?:      string;
  prefix?:    React.ReactNode;
  suffix?:    React.ReactNode;
}

export function TextInput({
  label, error, hint, prefix, suffix,
  className = "", id, ...props
}: TextInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block type-micro text-ink-muted mb-1.5">
          {label}
        </label>
      )}
      <div className={`
        flex items-center
        rounded-xl border bg-surface
        transition-colors duration-normal
        ${error ? "border-danger-border" : "border-border focus-within:border-brand"}
        focus-within:bg-white
      `}>
        {prefix && (
          <span className="pl-3 text-ink-muted flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">
            {prefix}
          </span>
        )}
        <input
          {...props}
          id={inputId}
          className={`
            flex-1 px-3 py-2.5 text-[13px] text-ink
            bg-transparent outline-none border-none
            placeholder:text-ink-faint
            ${className}
          `}
        />
        {suffix && (
          <span className="pr-3 text-ink-muted flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4">
            {suffix}
          </span>
        )}
      </div>
      {(error || hint) && (
        <p className={`mt-1.5 text-[11px] ${error ? "text-danger" : "text-ink-muted"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

// ── Textarea ───────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?:  string;
}

export function Textarea({ label, error, hint, className = "", id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block type-micro text-ink-muted mb-1.5">
          {label}
        </label>
      )}
      <textarea
        {...props}
        id={inputId}
        className={`
          w-full px-3 py-2.5 text-[13px] text-ink
          bg-surface rounded-xl border
          outline-none
          placeholder:text-ink-faint
          transition-colors duration-normal
          resize-none
          ${error ? "border-danger-border" : "border-border focus:border-brand"}
          focus:bg-white
          ${className}
        `}
      />
      {(error || hint) && (
        <p className={`mt-1.5 text-[11px] ${error ? "text-danger" : "text-ink-muted"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
