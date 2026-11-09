ALTER TABLE "list" ADD COLUMN IF NOT EXISTS "maxCards" integer;
--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN IF NOT EXISTS "priority" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN IF NOT EXISTS "storyPoints" integer;
