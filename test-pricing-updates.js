/**
 * Test script to verify pricing updates are working correctly
 * Run this script to check all pricing-related files and configurations
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Corpus Pricing Updates...\n');

// Test 1: Check pricing page client
console.log('📄 Testing PricingPageClient.tsx...');
const pricingPagePath = path.join(__dirname, 'src/app/pricing/PricingPageClient.tsx');
const pricingPageContent = fs.readFileSync(pricingPagePath, 'utf8');

if (pricingPageContent.includes('const monthlyPrice = 7') && 
    pricingPageContent.includes('const annualPrice = 60')) {
  console.log('✅ PricingPageClient.tsx - Prices updated correctly');
} else {
  console.log('❌ PricingPageClient.tsx - Prices not updated');
}

// Test 2: Check landing page
console.log('\n🏠 Testing LandingPageClient.tsx...');
const landingPagePath = path.join(__dirname, 'src/app/LandingPageClient.tsx');
const landingPageContent = fs.readFileSync(landingPagePath, 'utf8');

if (landingPageContent.includes('$7') && 
    landingPageContent.includes('$60') &&
    landingPageContent.includes('Save $24/year')) {
  console.log('✅ LandingPageClient.tsx - Prices and savings updated correctly');
} else {
  console.log('❌ LandingPageClient.tsx - Prices or savings not updated');
}

// Test 3: Check Stripe configuration
console.log('\n💳 Testing stripe.ts...');
const stripePath = path.join(__dirname, 'src/lib/stripe.ts');
const stripeContent = fs.readFileSync(stripePath, 'utf8');

if (stripeContent.includes('$7/month') && 
    stripeContent.includes('$60/year')) {
  console.log('✅ stripe.ts - Configuration updated correctly');
} else {
  console.log('❌ stripe.ts - Configuration not updated');
}

// Test 4: Check environment example
console.log('\n⚙️ Testing .env.example...');
const envExamplePath = path.join(__dirname, '.env.example');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

if (envExampleContent.includes('# $7/month') && 
    envExampleContent.includes('# $60/year')) {
  console.log('✅ .env.example - Comments updated correctly');
} else {
  console.log('❌ .env.example - Comments not updated');
}

// Test 5: Check pricing page metadata
console.log('\n📝 Testing pricing page metadata...');
const pricingPageMetaPath = path.join(__dirname, 'src/app/pricing/page.tsx');
const pricingPageMetaContent = fs.readFileSync(pricingPageMetaPath, 'utf8');

if (pricingPageMetaContent.includes('$7/month or $60/year')) {
  console.log('✅ pricing/page.tsx - Metadata updated correctly');
} else {
  console.log('❌ pricing/page.tsx - Metadata not updated');
}

// Test 6: Verify no old pricing remains
console.log('\n🔍 Checking for old pricing references...');
const allFiles = [
  pricingPageContent,
  landingPageContent,
  stripeContent,
  envExampleContent,
  pricingPageMetaContent
];

const oldPricingFound = allFiles.some(content => 
  content.includes('$6/month') || 
  content.includes('$30/year') ||
  content.includes('$2.50')
);

if (!oldPricingFound) {
  console.log('✅ No old pricing references found');
} else {
  console.log('❌ Old pricing references still exist');
}

console.log('\n🎉 Pricing update test completed!');
console.log('\n📋 Summary of changes:');
console.log('• Monthly Pro plan: $6 → $7/month');
console.log('• Annual Pro plan: $30 → $60/year');
console.log('• Annual savings: $6/month → $24/year');
console.log('• Effective monthly rate (annual): $2.50 → $5/month');

console.log('\n🚀 Next steps:');
console.log('1. Update Stripe dashboard with new prices');
console.log('2. Update environment variables with new price IDs');
console.log('3. Test subscription flow end-to-end');
console.log('4. Verify webhooks work with new prices');
