// ─── lib/data/migrations/MigrationEngine.ts ──────────────────────────────────
// Phase 70 — stamps version metadata on legacy objects and applies schema
// migrations as needed. Every stored object becomes a VersionedRecord.

import type { VersionStamp, SchemaDefinition } from "../schema/SchemaTypes";

const CURRENT_MIGRATION_VERSION = 1;

export type MigrationTransform = (obj: Record<string, unknown>) => Record<string, unknown>;

// Registry of migrations: schemaName → [ { fromVersion, transform } ]
const _migrations: Map<string, { fromVersion: string; transform: MigrationTransform }[]> = new Map();

export function registerMigration(
  schemaName:  string,
  fromVersion: string,
  transform:   MigrationTransform,
): void {
  const existing = _migrations.get(schemaName) ?? [];
  existing.push({ fromVersion, transform });
  _migrations.set(schemaName, existing);
}

// ── Version stamp ─────────────────────────────────────────────────────────────

export function stampVersion(
  obj:           Record<string, unknown>,
  schemaVersion: string,
): Record<string, unknown> & VersionStamp {
  const now = new Date().toISOString();
  return {
    ...obj,
    _schemaVersion:    schemaVersion,
    _createdAt:        (obj._createdAt as string) ?? now,
    _updatedAt:        now,
    _migrationVersion: CURRENT_MIGRATION_VERSION,
  };
}

export function isVersioned(obj: Record<string, unknown>): boolean {
  return "_schemaVersion" in obj && "_migrationVersion" in obj;
}

// ── Migrate a single object ───────────────────────────────────────────────────

export function migrateObject(
  obj:        Record<string, unknown>,
  schema:     SchemaDefinition,
): Record<string, unknown> & VersionStamp {
  let current = { ...obj };
  const currentVersion = (current._schemaVersion as string) ?? "legacy";

  if (!isVersioned(current)) {
    // Legacy object: stamp and apply any baseline migration
    current = stampVersion(current, schema.schemaVersion);
  }

  // Apply migrations in registration order (ascending)
  const migrations = _migrations.get(schema.name) ?? [];
  for (const m of migrations) {
    if ((current._schemaVersion as string) === m.fromVersion) {
      current = m.transform(current);
      current._schemaVersion = schema.schemaVersion;
      current._updatedAt     = new Date().toISOString();
    }
  }

  // Apply schema-level migrate if present
  if (schema.migrate && currentVersion !== schema.schemaVersion) {
    current = schema.migrate(current, currentVersion);
    current._schemaVersion = schema.schemaVersion;
  }

  return current as Record<string, unknown> & VersionStamp;
}

// ── Migrate an array (most common case) ──────────────────────────────────────

export function migrateArray(
  items:  Record<string, unknown>[],
  schema: SchemaDefinition,
): { items: (Record<string, unknown> & VersionStamp)[]; migrated: number } {
  let migrated = 0;
  const result = items.map(item => {
    const wasVersioned = isVersioned(item);
    const stamped = migrateObject(item, schema);
    if (!wasVersioned) migrated++;
    return stamped;
  });
  return { items: result, migrated };
}

// ── Migration status report ────────────────────────────────────────────────────

export interface MigrationStatus {
  schemaName:      string;
  targetVersion:   string;
  totalItems:      number;
  legacyItems:     number;
  currentVersion?: number;
}

export function getMigrationStatus(
  items:  Record<string, unknown>[],
  schema: SchemaDefinition,
): MigrationStatus {
  const legacy = items.filter(i => !isVersioned(i)).length;
  return {
    schemaName:    schema.name,
    targetVersion: schema.schemaVersion,
    totalItems:    items.length,
    legacyItems:   legacy,
    currentVersion: CURRENT_MIGRATION_VERSION,
  };
}
