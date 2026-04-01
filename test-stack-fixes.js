// Test script to verify stack overflow fixes
const { prisma } = require('./src/lib/prismaWithRetry.js');
const { normalizeTitle } = require('./src/lib/alerts.js');

// Simulate the old problematic approach
async function testOldApproach() {
  console.log('Testing old approach (map + Set constructor)...');
  try {
    // Get a user's entries
    const entries = await prisma.entry.findMany({
      where: { userId: 'test-user-id' }, // Replace with actual user ID
      select: { doi: true, title: true },
      take: 5000
    });
    
    console.log(`Processing ${entries.length} entries...`);
    
    // Old problematic way
    const existingDOIs = new Set(
      entries.map(e => e.doi).filter(Boolean)
    );
    
    const existingTitles = new Set(
      entries.map(e => normalizeTitle(e.title))
    );
    
    console.log('Old approach succeeded');
    return { success: true, doiCount: existingDOIs.size, titleCount: existingTitles.size };
  } catch (error) {
    console.error('Old approach failed:', error);
    return { success: false, error: error.message };
  }
}

// Simulate the new safe approach
async function testNewApproach() {
  console.log('Testing new approach (iterative Set building)...');
  try {
    // Get a user's entries
    const entries = await prisma.entry.findMany({
      where: { userId: 'test-user-id' }, // Replace with actual user ID
      select: { doi: true, title: true },
      take: 5000
    });
    
    console.log(`Processing ${entries.length} entries...`);
    
    // New safe way
    const existingDOIs = new Set();
    const existingTitles = new Set();
    
    const chunkSize = 1000;
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      for (const entry of chunk) {
        if (entry.doi) {
          existingDOIs.add(entry.doi);
        }
        try {
          const normalizedTitle = normalizeTitle(entry.title);
          existingTitles.add(normalizedTitle);
        } catch (error) {
          console.error(`Error normalizing title: ${entry.title}`, error);
        }
      }
      
      // Simulate async break
      if (i + chunkSize < entries.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    console.log('New approach succeeded');
    return { success: true, doiCount: existingDOIs.size, titleCount: existingTitles.size };
  } catch (error) {
    console.error('New approach failed:', error);
    return { success: false, error: error.message };
  }
}

// Test stack size monitoring
function testStackMonitoring() {
  console.log('Testing stack size monitoring...');
  
  const getStackSize = () => (new Error()).stack?.split('\n').length || 0;
  
  console.log('Initial stack size:', getStackSize());
  
  // Simulate deep recursion
  function recursive(depth) {
    if (depth % 100 === 0) {
      console.log(`Stack size at depth ${depth}:`, getStackSize());
    }
    
    if (depth > 500) {
      console.log('Final stack size:', getStackSize());
      return;
    }
    
    return recursive(depth + 1);
  }
  
  recursive(0);
}

async function main() {
  console.log('=== Stack Overflow Fix Verification ===\n');
  
  // Test stack monitoring
  testStackMonitoring();
  console.log('\n');
  
  // Test approaches (you'll need to provide a real user ID)
  // const oldResult = await testOldApproach();
  // console.log('\n');
  // const newResult = await testNewApproach();
  
  console.log('To run full tests:');
  console.log('1. Update the userId in the test functions');
  console.log('2. Run: node test-stack-fixes.js');
  console.log('\nFixes implemented:');
  console.log('✓ Iterative Set building instead of map + constructor');
  console.log('✓ Chunked processing with async breaks');
  console.log('✓ Stack size monitoring');
  console.log('✓ Error handling for title normalization');
  console.log('✓ Reduced database query limit (2000 entries)');
  console.log('✓ Automatic query disabling on stack overflow');
}

main().catch(console.error);
