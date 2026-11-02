CREATE TYPE "public"."event_type" AS ENUM('casual', 'league', 'tournament');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."point_ending" AS ENUM('serve_ace', 'serve_error', 'receive_error', 'third_ball_winner', 'third_ball_error', 'fh_winner', 'bh_winner', 'fh_unforced_error', 'bh_unforced_error', 'forced_error', 'net_or_edge', 'other');--> statement-breakpoint
CREATE TYPE "public"."rally_length_bucket" AS ENUM('short', 'medium', 'long');--> statement-breakpoint
CREATE TYPE "public"."side" AS ENUM('me', 'opponent');--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"opponent_id" uuid NOT NULL,
	"best_of" integer NOT NULL,
	"first_server" "side" NOT NULL,
	"status" "match_status" DEFAULT 'in_progress' NOT NULL,
	"winner" "side",
	"event_type" "event_type" NOT NULL,
	"location" text,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rating_before" integer,
	"rating_after" integer,
	"summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "matches_best_of_check" CHECK ("matches"."best_of" in (3, 5, 7))
);
--> statement-breakpoint
CREATE TABLE "points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"game_number" integer NOT NULL,
	"winner" "side" NOT NULL,
	"server" "side" NOT NULL,
	"ending" "point_ending",
	"actor" "side",
	"rally_length_bucket" "rally_length_bucket",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_opponent_id_opponents_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."opponents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "points_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_owner_opponent_played_at_idx" ON "matches" USING btree ("owner_id","opponent_id","played_at");--> statement-breakpoint
CREATE UNIQUE INDEX "points_match_id_seq_idx" ON "points" USING btree ("match_id","seq");