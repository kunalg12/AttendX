import { Client } from 'pg';
import 'dotenv/config';

const sql = `
-- Create courses table with UUID for foreign keys
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

-- Create unique index for join_code
CREATE UNIQUE INDEX IF NOT EXISTS "courses_join_code_key" ON "public"."courses" ("join_code");

-- Create course_classes join table
CREATE TABLE IF NOT EXISTS "public"."course_classes" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,

    CONSTRAINT "course_classes_pkey" PRIMARY KEY ("id")
);

-- Create unique index for course_classes
CREATE UNIQUE INDEX IF NOT EXISTS "course_classes_course_id_class_id_key" ON "public"."course_classes" ("course_id", "class_id");

-- Ensure profiles is visible
SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';
`;

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres:kunalgattendx@db.pdjfmbjiggekhhumjtyc.supabase.co:6543/postgres?pgbouncer=true",
    });

    try {
        await client.connect();
        console.log('Connected to database');

        console.log('Running SQL...');
        const res = await client.query(sql);

        // The last command in SQL is the SELECT
        console.log('Public tables found:', res[res.length - 1].rows);

        console.log('SQL execution finished');
    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

main();
