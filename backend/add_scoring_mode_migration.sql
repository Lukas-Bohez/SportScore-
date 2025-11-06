-- Migration to add scoring_mode column to games table
-- Run this to update existing database

ALTER TABLE games 
ADD COLUMN scoring_mode ENUM('team', 'player') DEFAULT 'team' 
COMMENT 'team = alleen team punten, player = individuele speler punten die optellen naar team totaal'
AFTER status;

-- Update existing records to use team mode by default
UPDATE games SET scoring_mode = 'team' WHERE scoring_mode IS NULL;
