CREATE TABLE "accounts" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sheet_authors" (
	"id" text PRIMARY KEY NOT NULL,
	"sheet_id" text NOT NULL,
	"name" text NOT NULL,
	"affiliation" text,
	"orcid" text,
	"email" text,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sheets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"keywords" text,
	"license" text,
	"license_other" text,
	"contact_email" text,
	"paper_url" text,
	"code_url" text,
	"viz_source_type" text NOT NULL,
	"file_type" text,
	"file_path" text,
	"viz_url" text,
	"data_sources" text,
	"data_collection_method" text,
	"data_temporal_coverage" text,
	"data_transformations" text,
	"data_license" text,
	"data_limitations" text,
	"chart_types" text,
	"tools_used" text,
	"encoding_description" text,
	"design_rationale" text,
	"ai_involvement" text DEFAULT 'none' NOT NULL,
	"ai_description" text,
	"ai_human_review" text,
	"limitations" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"password_hash" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationTokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationTokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_authors" ADD CONSTRAINT "sheet_authors_sheet_id_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheets" ADD CONSTRAINT "sheets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;