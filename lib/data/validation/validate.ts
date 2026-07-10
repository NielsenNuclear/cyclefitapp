// ─── lib/data/validation/validate.ts ─────────────────────────────────────────
// Phase 70 — core validation engine.

import type { ObjectSchema, ValidationResult, ValidationIssue, FieldSchema } from "../schema/SchemaTypes";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;

function validateField(
  field:  string,
  value:  unknown,
  schema: FieldSchema,
  issues: ValidationIssue[],
): void {
  // Required
  if (schema.required && (value === null || value === undefined || value === "")) {
    issues.push({ field, message: "Field is required.", value, severity: "error" });
    return;
  }
  if (value === null || value === undefined) return;   // optional, absent — OK

  // Type check
  switch (schema.type) {
    case "string":
      if (typeof value !== "string") {
        issues.push({ field, message: `Expected string, got ${typeof value}.`, value, severity: "error" });
        return;
      }
      if (schema.minLength !== undefined && value.length < schema.minLength)
        issues.push({ field, message: `String too short (min ${schema.minLength}).`, value, severity: "error" });
      if (schema.maxLength !== undefined && value.length > schema.maxLength)
        issues.push({ field, message: `String too long (max ${schema.maxLength}).`, value, severity: "warning" });
      break;

    case "number":
      if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
        issues.push({ field, message: `Expected finite number, got ${value}.`, value, severity: "error" });
        return;
      }
      if (schema.min !== undefined && value < schema.min)
        issues.push({ field, message: `Value ${value} below minimum ${schema.min}.`, value, severity: "error" });
      if (schema.max !== undefined && value > schema.max)
        issues.push({ field, message: `Value ${value} above maximum ${schema.max}.`, value, severity: "error" });
      break;

    case "boolean":
      if (typeof value !== "boolean")
        issues.push({ field, message: `Expected boolean, got ${typeof value}.`, value, severity: "error" });
      break;

    case "array":
      if (!Array.isArray(value))
        issues.push({ field, message: `Expected array, got ${typeof value}.`, value, severity: "error" });
      break;

    case "isoDate":
      if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
        issues.push({ field, message: `Expected ISO date string, got "${value}".`, value, severity: "error" });
        return;
      }
      if (isNaN(Date.parse(value)))
        issues.push({ field, message: `"${value}" is not a valid date.`, value, severity: "error" });
      break;

    case "object":
      if (typeof value !== "object" || Array.isArray(value))
        issues.push({ field, message: `Expected object.`, value, severity: "error" });
      break;
  }

  // Enum
  if (schema.enum !== undefined && !schema.enum.includes(value as string)) {
    issues.push({
      field,
      message: `Value "${value}" is not one of: ${schema.enum.join(", ")}.`,
      value,
      severity: "error",
    });
  }
}

export function validateObject(
  obj:    Record<string, unknown>,
  schema: ObjectSchema,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const [field, fieldSchema] of Object.entries(schema)) {
    validateField(field, obj[field], fieldSchema, issues);
  }

  return {
    valid:  issues.every(i => i.severity !== "error"),
    issues,
  };
}

export function validateArray(
  arr:    unknown[],
  schema: ObjectSchema,
): { totalItems: number; validItems: number; issues: ValidationIssue[] } {
  let validItems = 0;
  const allIssues: ValidationIssue[] = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      allIssues.push({ field: `[${i}]`, message: "Array item is not an object.", severity: "error" });
      continue;
    }
    const result = validateObject(item as Record<string, unknown>, schema);
    if (result.valid) {
      validItems++;
    } else {
      allIssues.push(...result.issues.map(iss => ({ ...iss, field: `[${i}].${iss.field}` })));
    }
  }

  return { totalItems: arr.length, validItems, issues: allIssues };
}
