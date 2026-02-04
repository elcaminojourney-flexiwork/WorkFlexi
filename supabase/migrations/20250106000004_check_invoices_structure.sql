-- Simple query to check invoices table structure
-- Run this to verify all columns exist

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'invoices' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

