CREATE TYPE "public"."bano_status" AS ENUM('free', 'occupied');--> statement-breakpoint
CREATE TYPE "public"."queue_status" AS ENUM('waiting', 'notified', 'served', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TABLE "bathroom_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"status" "bano_status" DEFAULT 'free' NOT NULL,
	"locked_by_user_id" uuid,
	"locked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"extra_minutes_used" integer DEFAULT 0 NOT NULL,
	"current_notified_user_id" uuid,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "queue_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "queue_status" DEFAULT 'waiting' NOT NULL,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "bathroom_state" ADD CONSTRAINT "bathroom_state_locked_by_user_id_users_id_fk" FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bathroom_state" ADD CONSTRAINT "bathroom_state_current_notified_user_id_users_id_fk" FOREIGN KEY ("current_notified_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;