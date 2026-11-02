CREATE TYPE "public"."ai_feature" AS ENUM('scouting_report', 'match_summary');--> statement-breakpoint
CREATE TABLE "ai_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"feature" "ai_feature" NOT NULL,
	"model" text NOT NULL,
	"total_tokens" integer,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scouting_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"opponent_id" uuid NOT NULL,
	"stats_snapshot" jsonb NOT NULL,
	"report" jsonb NOT NULL,
	"model" text NOT NULL,
	"match_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scouting_reports" ADD CONSTRAINT "scouting_reports_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scouting_reports" ADD CONSTRAINT "scouting_reports_opponent_id_opponents_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."opponents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_calls_owner_created_idx" ON "ai_calls" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "scouting_reports_owner_opponent_created_idx" ON "scouting_reports" USING btree ("owner_id","opponent_id","created_at");