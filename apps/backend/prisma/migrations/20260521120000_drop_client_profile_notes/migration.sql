-- Remove retired client profile notes field
ALTER TABLE "ClientProfile" DROP COLUMN IF EXISTS "notes";
