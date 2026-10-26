ALTER TYPE "public"."ai_call_kind" ADD VALUE 'examples';--> statement-breakpoint
CREATE TABLE "term_examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"language" "explanation_language" NOT NULL,
	"sentences" text[] NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "term_examples_term_id_language_key" UNIQUE("term_id","language"),
	CONSTRAINT "term_examples_five_sentences" CHECK (cardinality("term_examples"."sentences") = 5)
);
--> statement-breakpoint
ALTER TABLE "term_examples" ADD CONSTRAINT "term_examples_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;