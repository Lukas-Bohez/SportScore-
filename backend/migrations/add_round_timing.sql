-- Migration: Add round timing and status fields to activities
-- Date: 2026-01-19
-- Description: Adds fields to track round progression, timing, and status

-- Add new columns to activities table
ALTER TABLE activities ADD COLUMN time_limit_per_round INTEGER NULL;
ALTER TABLE activities ADD COLUMN round_status TEXT CHECK(round_status IN ('not_started', 'active', 'paused', 'completed')) DEFAULT 'not_started';
ALTER TABLE activities ADD COLUMN round_start_time TIMESTAMP NULL;
ALTER TABLE activities ADD COLUMN round_end_time TIMESTAMP NULL;

-- Rename old time_limit column if it exists (SQLite doesn't support direct rename, so we'll handle this in Python)
-- The old 'time_limit' will be migrated to 'time_limit_per_round' in the Python migration script

-- Update existing activities to have proper default values
UPDATE activities SET round_status = 'not_started' WHERE round_status IS NULL;
UPDATE activities SET current_round = 1 WHERE current_round IS NULL;
UPDATE activities SET total_rounds = 1 WHERE total_rounds IS NULL;
