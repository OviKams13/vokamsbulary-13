CREATE TYPE "public"."review_color" AS ENUM('green', 'orange', 'red');--> statement-breakpoint
ALTER TABLE "explanations" ADD COLUMN "definition_marks" smallint[] DEFAULT '{}'::smallint[] NOT NULL;--> statement-breakpoint
ALTER TABLE "explanations" ADD COLUMN "definition_marks_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "review_color" "review_color";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "review_changed_at" timestamp with time zone;