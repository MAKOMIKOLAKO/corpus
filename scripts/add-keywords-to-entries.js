#!/usr/bin/env node

/**
 * Script to add keywords to existing entries that don't have them
 * This script processes all entries in the database and generates AI keywords
 * for entries that have empty autoKeywords arrays
 */

const { PrismaClient } = require('@prisma/client');
const { GoogleGenAI } = require('@google/genai');

const prisma = new PrismaClient();

// Configuration
const BATCH_SIZE = 10; // Process entries in batches to avoid overwhelming the AI API
const MAX_RETRIES = 3; // Maximum retries for failed API calls

async function generateKeywords(text) {
    if (!text || text.length < 50) return [];

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || '',
    });

    try {
        const completion = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Extract 5 to 8 concise, specific keywords from the following text. Return only a JSON array of strings, no explanation.\n\nText: ${text.substring(0, 1500)}`,
            config: {
                responseMimeType: 'application/json',
            }
        });

        const resultText = completion.text || '[]';
        const parsedKeywords = JSON.parse(resultText);
        return Array.isArray(parsedKeywords) ? parsedKeywords.slice(0, 8) : [];
    } catch (error) {
        console.error('Error generating keywords:', error.message);
        return [];
    }
}

async function processEntry(entry, retryCount = 0) {
    try {
        console.log(`Processing entry: "${entry.title.substring(0, 50)}..." (ID: ${entry.id})`);

        // Combine title and abstract for keyword generation
        const textForAnalysis = `${entry.title || ''}. ${entry.abstract || ''}`;

        if (!textForAnalysis.trim()) {
            console.log(`  ⚠️  No text available for keyword generation, skipping...`);
            return { success: false, reason: 'No text available' };
        }

        // Generate keywords
        const keywords = await generateKeywords(textForAnalysis);

        if (keywords.length === 0) {
            console.log(`  ⚠️  No keywords generated, skipping...`);
            return { success: false, reason: 'No keywords generated' };
        }

        // Update the entry with generated keywords
        await prisma.entry.update({
            where: { id: entry.id },
            data: { autoKeywords: keywords }
        });

        console.log(`  ✅ Added ${keywords.length} keywords: ${keywords.join(', ')}`);
        return { success: true, keywordsCount: keywords.length };

    } catch (error) {
        console.error(`  ❌ Error processing entry ${entry.id}:`, error.message);

        // Retry logic
        if (retryCount < MAX_RETRIES) {
            console.log(`  🔄 Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
            return processEntry(entry, retryCount + 1);
        }

        return { success: false, reason: error.message };
    }
}

async function main() {
    console.log('🚀 Starting keyword migration script...\n');

    // Check for required environment variables
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY environment variable is required');
        process.exit(1);
    }

    // Check database connection
    try {
        await prisma.$connect();
        console.log('✅ Connected to database');
    } catch (error) {
        console.error('❌ Failed to connect to database:', error.message);
        process.exit(1);
    }

    try {
        // Find all entries that have empty autoKeywords arrays
        console.log('📋 Finding entries without keywords...');

        const allEntries = await prisma.entry.findMany({
            select: {
                id: true,
                title: true,
                abstract: true,
                autoKeywords: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Filter entries that have empty or null autoKeywords
        const entriesWithoutKeywords = allEntries.filter(entry =>
            !entry.autoKeywords ||
            entry.autoKeywords.length === 0 ||
            (Array.isArray(entry.autoKeywords) && entry.autoKeywords.every(k => !k.trim()))
        );

        console.log(`📊 Found ${entriesWithoutKeywords.length} entries without keywords\n`);

        if (entriesWithoutKeywords.length === 0) {
            console.log('🎉 All entries already have keywords!');
            return;
        }

        // Process entries in batches
        let processedCount = 0;
        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < entriesWithoutKeywords.length; i += BATCH_SIZE) {
            const batch = entriesWithoutKeywords.slice(i, i + BATCH_SIZE);
            console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entriesWithoutKeywords.length / BATCH_SIZE)} (${batch.length} entries)...`);

            for (const entry of batch) {
                processedCount++;
                const result = await processEntry(entry);

                if (result.success) {
                    successCount++;
                } else if (result.reason === 'No text available' || result.reason === 'No keywords generated') {
                    skippedCount++;
                } else {
                    failedCount++;
                }

                // Add delay between entries to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Add longer delay between batches
            if (i + BATCH_SIZE < entriesWithoutKeywords.length) {
                console.log('⏳ Waiting 5 seconds before next batch...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        // Final summary
        console.log('\n' + '='.repeat(60));
        console.log('📈 MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total entries processed: ${processedCount}`);
        console.log(`✅ Successfully updated: ${successCount}`);
        console.log(`⚠️  Skipped (no text): ${skippedCount}`);
        console.log(`❌ Failed: ${failedCount}`);
        console.log(`📊 Success rate: ${((successCount / processedCount) * 100).toFixed(1)}%`);

        if (failedCount > 0) {
            console.log('\n⚠️  Some entries failed to update. You may need to run the script again.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⚠️  Script interrupted by user');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⚠️  Script terminated');
    await prisma.$disconnect();
    process.exit(0);
});

// Run the script
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = { main, processEntry, generateKeywords };
