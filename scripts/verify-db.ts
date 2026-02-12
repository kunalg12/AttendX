import { Client } from 'pg';
import 'dotenv/config';

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres:kunalgattendx@db.pdjfmbjiggekhhumjtyc.supabase.co:6543/postgres?pgbouncer=true",
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const tables = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'storage', 'graphql', 'realtime');
    `);

        console.log('Found tables:', tables.rows);

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        await client.end();
    }
}

main();
