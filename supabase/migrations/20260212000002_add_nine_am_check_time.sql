-- Add configurable 9am check time to nurseries (defaults to 09:00).

ALTER TABLE nurseries
  ADD COLUMN nine_am_check_time TIME NOT NULL DEFAULT '09:00';
