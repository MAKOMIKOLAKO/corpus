import { parseFeed } from '../src/lib/rssParser';

async function testFeed(url: string) {
  console.log(`Testing feed: ${url}\n`);
  try {
    const feed = await parseFeed(url);
    console.log(`✅ Success!`);
    console.log(`Title: ${feed.title}`);
    console.log(`Description: ${feed.description}`);
    console.log(`Items: ${feed.items.length}`);
    if (feed.items.length > 0) {
      console.log(`\nFirst item:`);
      console.log(`  Title: ${feed.items[0].title}`);
      console.log(`  URL: ${feed.items[0].url}`);
      console.log(`  Author: ${feed.items[0].author}`);
      console.log(`  Published: ${feed.items[0].publishedDate}`);
    }
  } catch (error) {
    console.error(`❌ Failed to parse feed:`, error);
  }
}

// Test the Scientific American feed
testFeed('https://www.scientificamerican.com/feed');
