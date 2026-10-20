CREATE TYPE "public"."ai_call_kind" AS ENUM('extract', 'explain', 'translate');--> statement-breakpoint
CREATE TYPE "public"."explanation_language" AS ENUM('en', 'fr');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('uploaded', 'extracted', 'explained', 'published');--> statement-breakpoint
CREATE TABLE "ai_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid,
	"kind" "ai_call_kind" NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_ms" integer,
	"success" boolean NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "explanations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"language" "explanation_language" NOT NULL,
	"fr_equivalents" text[] NOT NULL,
	"definition" text NOT NULL,
	"analogy_title" text NOT NULL,
	"analogy_body" text NOT NULL,
	"analogy_emoji" text,
	"example_question" text NOT NULL,
	"example_question_fr" text,
	"in_your_text_quote" text NOT NULL,
	"in_your_text_explanation" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "explanations_term_id_language_key" UNIQUE("term_id","language")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "post_status" DEFAULT 'uploaded' NOT NULL,
	"image_url" text NOT NULL,
	"image_pathname" text NOT NULL,
	"image_width" integer NOT NULL,
	"image_height" integer NOT NULL,
	"extracted_text" text,
	"text" text,
	"theme_key" text,
	"published_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_published_at_matches_status" CHECK (("posts"."status" = 'published') = ("posts"."published_at" IS NOT NULL)),
	CONSTRAINT "posts_published_has_text_and_theme" CHECK ("posts"."status" <> 'published' OR ("posts"."text" IS NOT NULL AND "posts"."theme_key" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"surface" text NOT NULL,
	"headword" text NOT NULL,
	"added_by_user" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "terms_post_id_position_key" UNIQUE("post_id","position"),
	CONSTRAINT "terms_position_positive" CHECK ("terms"."position" >= 1)
);
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_calls_created_at_idx" ON "ai_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_status_published_at_id_idx" ON "posts" USING btree ("status","published_at","id");--> statement-breakpoint
CREATE INDEX "posts_text_trgm_idx" ON "posts" USING gin ("text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "terms_post_id_idx" ON "terms" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "terms_headword_idx" ON "terms" USING btree ("headword");--> statement-breakpoint
CREATE INDEX "terms_headword_trgm_idx" ON "terms" USING gin ("headword" gin_trgm_ops);--> statement-breakpoint
CREATE VIEW "public"."post_ranks" AS (
  SELECT
    id AS post_id,
    ROW_NUMBER() OVER (ORDER BY published_at, id) AS rank,
    ((ROW_NUMBER() OVER (ORDER BY published_at, id) - 1) / 15) + 1 AS totw_number,
    ((ROW_NUMBER() OVER (ORDER BY published_at, id) - 1) % 15) + 1 AS totw_position
  FROM posts
  WHERE status = 'published'
);