CREATE TYPE "public"."reel_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
ALTER TYPE "public"."ai_call_kind" ADD VALUE 'reel';--> statement-breakpoint
CREATE TABLE "reels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"status" "reel_status" DEFAULT 'pending' NOT NULL,
	"svgs" jsonb,
	"gist" text,
	"model" text,
	"screens" jsonb,
	"audio_url" text,
	"audio_pathname" text,
	"voice_en" text,
	"voice_fr" text,
	"tts_chars" integer,
	"total_ms" integer,
	"locked_until" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reels_term_id_key" UNIQUE("term_id"),
	CONSTRAINT "reels_ready_is_complete" CHECK ("reels"."status" <> 'ready' OR ("reels"."screens" IS NOT NULL AND "reels"."audio_url" IS NOT NULL AND "reels"."audio_pathname" IS NOT NULL AND "reels"."svgs" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "tts_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid,
	"term_id" uuid,
	"voice_en" text NOT NULL,
	"voice_fr" text NOT NULL,
	"characters" integer NOT NULL,
	"lines" smallint NOT NULL,
	"duration_ms" integer,
	"success" boolean NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tts_calls" ADD CONSTRAINT "tts_calls_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tts_calls" ADD CONSTRAINT "tts_calls_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reels_post_id_idx" ON "reels" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "tts_calls_created_at_idx" ON "tts_calls" USING btree ("created_at");