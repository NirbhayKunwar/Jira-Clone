ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "team_owner_id" INTEGER;

CREATE INDEX IF NOT EXISTS "users_team_owner_id_idx" ON "users"("team_owner_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_team_owner_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_team_owner_id_fkey"
      FOREIGN KEY ("team_owner_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
