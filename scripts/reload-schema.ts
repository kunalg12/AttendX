import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Attempting to reload Supabase schema cache...');

    try {
        // Force PostgREST to reload its schema cache
        await prisma.$executeRawUnsafe("NOTIFY pgrst, 'reload config';");
        console.log('Successfully sent reload signal to pgrst.');

        // Verify tables exist
        console.log('Verifying tables via Prisma...');
        const coursesCount = await prisma.course.count();
        console.log(`Found ${coursesCount} courses.`);

        const classesCount = await prisma.class.count();
        console.log(`Found ${classesCount} classes.`);

    } catch (e) {
        console.error('Error executing schema reload or verification:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
