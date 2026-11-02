CREATE TYPE "public"."grip" AS ENUM('shakehand', 'penhold');--> statement-breakpoint
CREATE TYPE "public"."handedness" AS ENUM('right', 'left');--> statement-breakpoint
CREATE TYPE "public"."play_style" AS ENUM('offensive_looper', 'all_round', 'close_to_table_hitter', 'blocker', 'defender_chopper', 'penhold_attacker');--> statement-breakpoint
CREATE TYPE "public"."rubber_type" AS ENUM('inverted', 'short_pips', 'long_pips', 'anti');--> statement-breakpoint
CREATE TABLE "opponents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"handedness" "handedness",
	"grip" "grip",
	"play_style" "play_style",
	"fh_rubber_type" "rubber_type",
	"bh_rubber_type" "rubber_type",
	"traits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"rating" integer DEFAULT 1200 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"handedness" "handedness",
	"grip" "grip",
	"play_style" "play_style",
	"blade" text,
	"fh_rubber" text,
	"bh_rubber" text,
	"rating" integer DEFAULT 1200 NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opponents" ADD CONSTRAINT "opponents_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opponents_owner_id_idx" ON "opponents" USING btree ("owner_id");