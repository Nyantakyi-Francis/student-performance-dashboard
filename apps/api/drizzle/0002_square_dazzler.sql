CREATE TABLE "account_tokens" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "account_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"kind" text NOT NULL,
	"role" text NOT NULL,
	"student_ids" jsonb NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "account_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "grading_policies" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "grading_policies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"version" bigint NOT NULL,
	"pass_mark" numeric(5, 2) NOT NULL,
	"excellent_mark" numeric(5, 2) NOT NULL,
	"good_mark" numeric(5, 2) NOT NULL,
	"minimum_scores" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grading_policy_thresholds" CHECK ("grading_policies"."pass_mark" >= 0 and "grading_policies"."pass_mark" < "grading_policies"."good_mark" and "grading_policies"."good_mark" < "grading_policies"."excellent_mark" and "grading_policies"."excellent_mark" <= 100 and "grading_policies"."minimum_scores" > 0)
);
--> statement-breakpoint
ALTER TABLE "grading_policies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "import_previews" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "import_previews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"membership_id" bigint NOT NULL,
	"assessment_id" bigint NOT NULL,
	"assessment_version" bigint NOT NULL,
	"rows" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"committed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "import_previews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "publications" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "publications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"assessment_id" bigint NOT NULL,
	"assessment_version" bigint NOT NULL,
	"policy_id" bigint NOT NULL,
	"snapshot" jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "publications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recovery_requests" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recovery_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"membership_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recovery_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "student_links" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "student_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"membership_id" bigint NOT NULL,
	"student_id" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_role_check";--> statement-breakpoint
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_policies" ADD CONSTRAINT "grading_policies_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_previews" ADD CONSTRAINT "import_previews_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_previews" ADD CONSTRAINT "import_previews_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_previews" ADD CONSTRAINT "import_previews_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_policy_id_grading_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."grading_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_requests" ADD CONSTRAINT "recovery_requests_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_requests" ADD CONSTRAINT "recovery_requests_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_links" ADD CONSTRAINT "student_links_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_links" ADD CONSTRAINT "student_links_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_links" ADD CONSTRAINT "student_links_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_tokens_hash_uidx" ON "account_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "account_tokens_school_idx" ON "account_tokens" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grading_policies_school_version_uidx" ON "grading_policies" USING btree ("school_id","version");--> statement-breakpoint
CREATE INDEX "import_previews_school_idx" ON "import_previews" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "publications_assessment_version_uidx" ON "publications" USING btree ("assessment_id","assessment_version");--> statement-breakpoint
CREATE INDEX "publications_school_idx" ON "publications" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_requests_membership_uidx" ON "recovery_requests" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_links_member_student_uidx" ON "student_links" USING btree ("membership_id","student_id");--> statement-breakpoint
CREATE INDEX "student_links_school_idx" ON "student_links" USING btree ("school_id");--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_check" CHECK ("memberships"."role" in ('administrator', 'teacher', 'student', 'guardian'));
--> statement-breakpoint
REVOKE ALL ON TABLE account_tokens, grading_policies, import_previews, publications, recovery_requests, student_links FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['account_tokens','grading_policies','import_previews','publications','recovery_requests','student_links'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
    END IF;
  END LOOP;
END $$;
