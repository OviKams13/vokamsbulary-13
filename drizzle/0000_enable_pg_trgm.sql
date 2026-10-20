-- Custom migration: trigram matching for fuzzy search (ERD §1, §5.4).
-- Runs before the schema migration, whose GIN indexes use gin_trgm_ops.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
