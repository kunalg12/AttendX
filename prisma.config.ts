import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbUrl = process.env["DATABASE_URL"] ?? "postgresql://postgres:attendx1236%40%23@db.pdjfmbjiggekhhumjtyc.supabase.co:5432/postgres";
console.log("Loaded DB URL:", dbUrl ? dbUrl.replace(/:[^:]*@/, ":****@") : "undefined");

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: dbUrl,
    },
});
