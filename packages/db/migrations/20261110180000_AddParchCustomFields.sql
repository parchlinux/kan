ALTER TABLE "card"
  ADD COLUMN "architecture" varchar(20),
  ADD COLUMN "desktopEnv" varchar(20),
  ADD COLUMN "isBlocked" boolean DEFAULT false;
