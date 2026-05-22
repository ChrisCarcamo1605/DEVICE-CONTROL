


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "location_id" "uuid",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."defect_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."defect_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."device_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "serial_number" "text",
    "category_id" "uuid",
    "branch_id" "uuid" NOT NULL,
    "parent_device_id" "uuid",
    "assigned_by" "uuid",
    "value" numeric(10,2),
    "purchase_date" "date",
    "invoice_number" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "devices_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'in_repair'::"text", 'replaced'::"text", 'retired'::"text"])))
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knex_migrations" (
    "id" integer NOT NULL,
    "name" character varying(255),
    "batch" integer,
    "migration_time" timestamp with time zone
);


ALTER TABLE "public"."knex_migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."knex_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."knex_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."knex_migrations_id_seq" OWNED BY "public"."knex_migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."knex_migrations_lock" (
    "index" integer NOT NULL,
    "is_locked" integer
);


ALTER TABLE "public"."knex_migrations_lock" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."knex_migrations_lock_index_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."knex_migrations_lock_index_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."knex_migrations_lock_index_seq" OWNED BY "public"."knex_migrations_lock"."index";



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "department" "text" NOT NULL,
    "country" "text" DEFAULT 'Honduras'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid" NOT NULL,
    "ticket_id" "uuid",
    "it_manager_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "observations" "text",
    "diagnosis" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "maintenance_history_action_check" CHECK (("action" = ANY (ARRAY['diagnosis'::"text", 'repair'::"text", 'replace'::"text", 'new_purchase'::"text"])))
);


ALTER TABLE "public"."maintenance_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "branch_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "email" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['it_manager'::"text", 'branch_manager'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid",
    "it_manager_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "invoice_number" "text",
    "purchase_date" "date" NOT NULL,
    "new_device_id" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "purchases_type_check" CHECK (("type" = ANY (ARRAY['spare_part'::"text", 'new_device'::"text"])))
);


ALTER TABLE "public"."purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_tags" (
    "ticket_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."ticket_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid" NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "reported_by" "uuid" NOT NULL,
    "it_manager_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "problem_description" "text" NOT NULL,
    "report_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "collection_date" timestamp with time zone,
    "collection_done_at" timestamp with time zone,
    "return_date" timestamp with time zone,
    "return_done_at" timestamp with time zone,
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_diagnosis'::"text", 'waiting_parts'::"text", 'in_repair'::"text", 'finalized'::"text", 'cancelled'::"text", 'delivered'::"text"])))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."knex_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."knex_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."knex_migrations_lock" ALTER COLUMN "index" SET DEFAULT "nextval"('"public"."knex_migrations_lock_index_seq"'::"regclass");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."defect_tags"
    ADD CONSTRAINT "defect_tags_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."defect_tags"
    ADD CONSTRAINT "defect_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_categories"
    ADD CONSTRAINT "device_categories_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."device_categories"
    ADD CONSTRAINT "device_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_serial_number_unique" UNIQUE ("serial_number");



ALTER TABLE ONLY "public"."knex_migrations_lock"
    ADD CONSTRAINT "knex_migrations_lock_pkey" PRIMARY KEY ("index");



ALTER TABLE ONLY "public"."knex_migrations"
    ADD CONSTRAINT "knex_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_history"
    ADD CONSTRAINT "maintenance_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_pkey" PRIMARY KEY ("ticket_id", "tag_id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_location_id_foreign" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_assigned_by_foreign" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_branch_id_foreign" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_category_id_foreign" FOREIGN KEY ("category_id") REFERENCES "public"."device_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_parent_device_id_foreign" FOREIGN KEY ("parent_device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_history"
    ADD CONSTRAINT "maintenance_history_device_id_foreign" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."maintenance_history"
    ADD CONSTRAINT "maintenance_history_it_manager_id_foreign" FOREIGN KEY ("it_manager_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."maintenance_history"
    ADD CONSTRAINT "maintenance_history_ticket_id_foreign" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_branch_id_foreign" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_branch_id_foreign" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_it_manager_id_foreign" FOREIGN KEY ("it_manager_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_new_device_id_foreign" FOREIGN KEY ("new_device_id") REFERENCES "public"."devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_ticket_id_foreign" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_tag_id_foreign" FOREIGN KEY ("tag_id") REFERENCES "public"."defect_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_tags"
    ADD CONSTRAINT "ticket_tags_ticket_id_foreign" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_branch_id_foreign" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_device_id_foreign" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_it_manager_id_foreign" FOREIGN KEY ("it_manager_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_reported_by_foreign" FOREIGN KEY ("reported_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."defect_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knex_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."knex_migrations_lock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."defect_tags" TO "anon";
GRANT ALL ON TABLE "public"."defect_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."defect_tags" TO "service_role";



GRANT ALL ON TABLE "public"."device_categories" TO "anon";
GRANT ALL ON TABLE "public"."device_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."device_categories" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";



GRANT ALL ON TABLE "public"."knex_migrations" TO "anon";
GRANT ALL ON TABLE "public"."knex_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."knex_migrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."knex_migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."knex_migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."knex_migrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."knex_migrations_lock" TO "anon";
GRANT ALL ON TABLE "public"."knex_migrations_lock" TO "authenticated";
GRANT ALL ON TABLE "public"."knex_migrations_lock" TO "service_role";



GRANT ALL ON SEQUENCE "public"."knex_migrations_lock_index_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."knex_migrations_lock_index_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."knex_migrations_lock_index_seq" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_history" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_history" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_history" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchases" TO "anon";
GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_tags" TO "anon";
GRANT ALL ON TABLE "public"."ticket_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_tags" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































