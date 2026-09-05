CREATE TABLE "academic_years" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "academic_years_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_years_date_order_check" CHECK ("academic_years"."ends_on" >= "academic_years"."starts_on"),
	CONSTRAINT "academic_years_status_check" CHECK ("academic_years"."status" in ('planned', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assessments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"term_id" bigint NOT NULL,
	"class_group_id" bigint NOT NULL,
	"subject_id" bigint NOT NULL,
	"title" text NOT NULL,
	"assessed_on" date NOT NULL,
	"maximum_score" numeric(7, 2) NOT NULL,
	"weight" numeric(7, 4) DEFAULT '1' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_maximum_score_check" CHECK ("assessments"."maximum_score" > 0),
	CONSTRAINT "assessments_weight_check" CHECK ("assessments"."weight" >= 0),
	CONSTRAINT "assessments_version_check" CHECK ("assessments"."version" > 0),
	CONSTRAINT "assessments_status_check" CHECK ("assessments"."status" in ('draft', 'submitted', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "class_groups" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "class_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"academic_year_id" bigint NOT NULL,
	"grade_level_id" bigint NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_groups_status_check" CHECK ("class_groups"."status" in ('active', 'inactive', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "enrollments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"student_id" bigint NOT NULL,
	"class_group_id" bigint NOT NULL,
	"academic_year_id" bigint NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_status_check" CHECK ("enrollments"."status" in ('active', 'transferred', 'withdrawn', 'completed')),
	CONSTRAINT "enrollments_date_order_check" CHECK ("enrollments"."ends_on" is null or "enrollments"."ends_on" >= "enrollments"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "grade_levels" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "grade_levels_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"name" text NOT NULL,
	"sequence" smallint NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grade_levels_sequence_check" CHECK ("grade_levels"."sequence" > 0),
	CONSTRAINT "grade_levels_status_check" CHECK ("grade_levels"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "schools_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schools_status_check" CHECK ("schools"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "scores_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"assessment_id" bigint NOT NULL,
	"enrollment_id" bigint NOT NULL,
	"status" text NOT NULL,
	"points" numeric(7, 2),
	"feedback" text,
	"version" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scores_status_points_check" CHECK (("scores"."status" = 'scored' and "scores"."points" is not null and "scores"."points" >= 0) or ("scores"."status" in ('missing', 'excused', 'incomplete') and "scores"."points" is null)),
	CONSTRAINT "scores_version_check" CHECK ("scores"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "students_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"student_number" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"preferred_name" text,
	"gender" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_status_check" CHECK ("students"."status" in ('active', 'inactive', 'withdrawn', 'graduated'))
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subjects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_status_check" CHECK ("subjects"."status" in ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "terms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"school_id" bigint NOT NULL,
	"academic_year_id" bigint NOT NULL,
	"name" text NOT NULL,
	"sequence" smallint NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "terms_sequence_check" CHECK ("terms"."sequence" > 0),
	CONSTRAINT "terms_date_order_check" CHECK ("terms"."ends_on" >= "terms"."starts_on"),
	CONSTRAINT "terms_status_check" CHECK ("terms"."status" in ('planned', 'open', 'locked', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "public"."class_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_grade_level_id_grade_levels_id_fk" FOREIGN KEY ("grade_level_id") REFERENCES "public"."grade_levels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "public"."class_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_levels" ADD CONSTRAINT "grade_levels_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_school_name_uidx" ON "academic_years" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "academic_years_school_id_idx" ON "academic_years" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "assessments_school_id_idx" ON "assessments" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessments_term_class_subject_title_uidx" ON "assessments" USING btree ("term_id","class_group_id","subject_id","title");--> statement-breakpoint
CREATE INDEX "assessments_term_class_subject_idx" ON "assessments" USING btree ("term_id","class_group_id","subject_id");--> statement-breakpoint
CREATE INDEX "assessments_class_group_id_idx" ON "assessments" USING btree ("class_group_id");--> statement-breakpoint
CREATE INDEX "assessments_subject_id_idx" ON "assessments" USING btree ("subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_groups_year_name_uidx" ON "class_groups" USING btree ("academic_year_id","name");--> statement-breakpoint
CREATE INDEX "class_groups_school_id_idx" ON "class_groups" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "class_groups_academic_year_id_idx" ON "class_groups" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "class_groups_grade_level_id_idx" ON "class_groups" USING btree ("grade_level_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_student_year_uidx" ON "enrollments" USING btree ("student_id","academic_year_id");--> statement-breakpoint
CREATE INDEX "enrollments_school_id_idx" ON "enrollments" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "enrollments_student_id_idx" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_class_group_id_idx" ON "enrollments" USING btree ("class_group_id");--> statement-breakpoint
CREATE INDEX "enrollments_academic_year_id_idx" ON "enrollments" USING btree ("academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_levels_school_name_uidx" ON "grade_levels" USING btree ("school_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_levels_school_sequence_uidx" ON "grade_levels" USING btree ("school_id","sequence");--> statement-breakpoint
CREATE INDEX "grade_levels_school_id_idx" ON "grade_levels" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_slug_uidx" ON "schools" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "scores_assessment_enrollment_uidx" ON "scores" USING btree ("assessment_id","enrollment_id");--> statement-breakpoint
CREATE INDEX "scores_school_id_idx" ON "scores" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "scores_assessment_id_idx" ON "scores" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "scores_enrollment_id_idx" ON "scores" USING btree ("enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_number_uidx" ON "students" USING btree ("school_id","student_number");--> statement-breakpoint
CREATE INDEX "students_school_id_id_idx" ON "students" USING btree ("school_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_school_code_uidx" ON "subjects" USING btree ("school_id","code");--> statement-breakpoint
CREATE INDEX "subjects_school_id_idx" ON "subjects" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_year_sequence_uidx" ON "terms" USING btree ("academic_year_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_year_name_uidx" ON "terms" USING btree ("academic_year_id","name");--> statement-breakpoint
CREATE INDEX "terms_school_id_idx" ON "terms" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "terms_academic_year_id_idx" ON "terms" USING btree ("academic_year_id");
