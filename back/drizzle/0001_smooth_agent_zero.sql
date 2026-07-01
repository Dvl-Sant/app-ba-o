CREATE TYPE "public"."usage_reason" AS ENUM('normal', 'forced', 'expired');--> statement-breakpoint
CREATE TABLE "usage_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_name" varchar(100) NOT NULL,
	"locked_at" timestamp with time zone NOT NULL,
	"unlocked_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"extra_minutes_used" integer DEFAULT 0 NOT NULL,
	"reason" "usage_reason" DEFAULT 'normal' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_log" ADD CONSTRAINT "usage_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;