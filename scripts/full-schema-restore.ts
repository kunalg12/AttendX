import { Client } from 'pg';
import 'dotenv/config';

const sql = `
-- Enums (using types in PG)
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('student', 'teacher');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- profiles
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_email_key" ON "public"."profiles" ("email");

-- courses
CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "semester" TEXT,
    "subject" TEXT,
    "join_code" TEXT NOT NULL,
    "teacher_id" UUID NOT NULL,
    "teacher_name" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "courses_join_code_key" ON "public"."courses" ("join_code");

-- classes
CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "join_code" TEXT NOT NULL,
    "teacher_id" UUID NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "classes_join_code_key" ON "public"."classes" ("join_code");

-- course_classes
CREATE TABLE IF NOT EXISTS "public"."course_classes" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    CONSTRAINT "course_classes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "course_classes_course_id_class_id_key" ON "public"."course_classes" ("course_id", "class_id");

-- course_enrollments
CREATE TABLE IF NOT EXISTS "public"."course_enrollments" (
    "id" TEXT NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "course_enrollments_student_id_course_id_key" ON "public"."course_enrollments" ("student_id", "course_id");

-- class_enrollments
CREATE TABLE IF NOT EXISTS "public"."class_enrollments" (
    "id" TEXT NOT NULL,
    "student_id" UUID NOT NULL,
    "class_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "class_enrollments_student_id_class_id_key" ON "public"."class_enrollments" ("student_id", "class_id");

-- attendance
CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "student_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location_address" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_class_id_student_id_date_key" ON "public"."attendance" ("class_id", "student_id", "date");

-- attendance_codes
CREATE TABLE IF NOT EXISTS "public"."attendance_codes" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiry_time" TIMESTAMP WITH TIME ZONE NOT NULL,
    "teacher_latitude" DOUBLE PRECISION,
    "teacher_longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT "attendance_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_codes_code_key" ON "public"."attendance_codes" ("code");

-- Foreign Keys
ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_id_fkey";
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."courses" DROP CONSTRAINT IF EXISTS "courses_teacher_id_fkey";
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."classes" DROP CONSTRAINT IF EXISTS "classes_teacher_id_fkey";
ALTER TABLE "public"."classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."course_classes" DROP CONSTRAINT IF EXISTS "course_classes_course_id_fkey";
ALTER TABLE "public"."course_classes" ADD CONSTRAINT "course_classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."course_classes" DROP CONSTRAINT IF EXISTS "course_classes_class_id_fkey";
ALTER TABLE "public"."course_classes" ADD CONSTRAINT "course_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."course_enrollments" DROP CONSTRAINT IF EXISTS "course_enrollments_student_id_fkey";
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."course_enrollments" DROP CONSTRAINT IF EXISTS "course_enrollments_course_id_fkey";
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."class_enrollments" DROP CONSTRAINT IF EXISTS "class_enrollments_student_id_fkey";
ALTER TABLE "public"."class_enrollments" ADD CONSTRAINT "class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."class_enrollments" DROP CONSTRAINT IF EXISTS "class_enrollments_class_id_fkey";
ALTER TABLE "public"."class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."attendance" DROP CONSTRAINT IF EXISTS "attendance_class_id_fkey";
ALTER TABLE "public"."attendance" ADD CONSTRAINT "attendance_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."attendance" DROP CONSTRAINT IF EXISTS "attendance_student_id_fkey";
ALTER TABLE "public"."attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."attendance_codes" DROP CONSTRAINT IF EXISTS "attendance_codes_class_id_fkey";
ALTER TABLE "public"."attendance_codes" ADD CONSTRAINT "attendance_codes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`;

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres:kunalgattendx@db.pdjfmbjiggekhhumjtyc.supabase.co:6543/postgres?pgbouncer=true",
    });

    try {
        await client.connect();
        console.log('Connected to database');
        await client.query(sql);
        console.log('Full Schema Restoration Successful');
    } catch (err) {
        console.error('Restoration Error:', err);
    } finally {
        await client.end();
    }
}

main();
