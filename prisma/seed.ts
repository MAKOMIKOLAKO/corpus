import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    const entry1 = await prisma.entry.create({
        data: {
            title: 'Attention Is All You Need',
            authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Lukasz Kaiser', 'Illia Polosukhin'],
            year: 2017,
            contentType: 'PAPER',
            url: 'https://arxiv.org/abs/1706.03762',
            source: 'MANUAL',
            abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
            readingStatus: 'READ',
            userKeywords: ['Machine Learning', 'NLP', 'Transformers'],
            autoKeywords: ['neural networks', 'attention mechanism', 'sequence transduction'],
            notes: [
                { text: 'A truly foundational paper for modern LLMs.', createdAt: new Date().toISOString() }
            ],
        },
    });

    const entry2 = await prisma.entry.create({
        data: {
            title: 'Building a Second Brain: A Proven Method to Organize Your Digital Life and Unlock Your Creative Potential',
            authors: ['Tiago Forte'],
            year: 2022,
            contentType: 'BOOK',
            source: 'MANUAL',
            abstract: 'A revolutionary approach to enhancing productivity, creating innovative ideas, and living a less stressful life.',
            readingStatus: 'READING',
            userKeywords: ['Productivity', 'Knowledge Management', 'PKM'],
            autoKeywords: ['organization', 'digital life', 'creativity'],
            notes: [],
        },
    });

    const entry3 = await prisma.entry.create({
        data: {
            title: 'How to build an AI app with Next.js and OpenAI',
            authors: ['Vercel'],
            year: 2024,
            contentType: 'ARTICLE',
            url: 'https://vercel.com/blog/how-to-build-an-ai-app-with-nextjs-and-openai',
            source: 'MANUAL',
            abstract: 'Learn how to build, deploy, and scale an AI application using Next.js App Router and the OpenAI API.',
            readingStatus: 'UNREAD',
            userKeywords: ['Next.js', 'AI', 'Tutorial'],
            autoKeywords: ['deployment', 'scaling', 'app router'],
            notes: [],
        },
    });

    console.log('Seeding finished.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
