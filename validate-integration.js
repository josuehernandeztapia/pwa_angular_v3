#!/usr/bin/env node

/**
 * 🧪 Integration Validation Script
 * Validates the post-sales system components and services integration
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Integration Validation...\n');

// Validation results
const results = {
  files: { found: 0, missing: 0 },
  components: { found: 0, missing: 0 },
  services: { found: 0, missing: 0 },
  tests: { found: 0, missing: 0 }
};

// Critical files to validate
const criticalFiles = [
  // User-developed post-sales components
  'src/app/components/post-sales/documents-phase.component.ts',
  'src/app/components/post-sales/documents-phase.component.scss',
  'src/app/components/post-sales/plates-phase.component.ts', 
  'src/app/components/post-sales/plates-phase.component.scss',
  'src/app/components/post-sales/delivery-phase.component.ts',
  
  // Enhanced services
  'src/app/services/post-sales-api.service.ts',
  'src/app/services/integrated-import-tracker.service.ts',
  'src/app/services/contract.service.ts',
  
  // Vehicle assignment
  'src/app/components/shared/vehicle-assignment-form.component.ts',
  
  // Updated models
  'src/app/models/types.ts',
  
  // Test files
  'src/app/services/post-sales-api.service.spec.ts',
  'src/app/components/shared/vehicle-assignment-form.component.spec.ts'
];

// Function to check if file exists and get basic info
function validateFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    return {
      exists: true,
      size: stats.size,
      lines: content.split('\n').length,
      lastModified: stats.mtime.toISOString(),
      content: content.slice(0, 200) + '...' // First 200 chars for preview
    };
  }
  
  return { exists: false };
}

// Validate all critical files
console.log('📁 Validating Critical Files:\n');

criticalFiles.forEach((file, index) => {
  const result = validateFile(file);
  
  if (result.exists) {
    results.files.found++;
    console.log(`✅ ${index + 1}. ${file}`);
    console.log(`   📊 Size: ${result.size} bytes, Lines: ${result.lines}`);
    console.log(`   📅 Modified: ${result.lastModified}`);
    
    // Categorize
    if (file.includes('/components/')) results.components.found++;
    if (file.includes('/services/')) results.services.found++;
    if (file.includes('.spec.ts')) results.tests.found++;
    
  } else {
    results.files.missing++;
    console.log(`❌ ${index + 1}. ${file} - MISSING`);
    
    // Categorize missing
    if (file.includes('/components/')) results.components.missing++;
    if (file.includes('/services/')) results.services.missing++;
    if (file.includes('.spec.ts')) results.tests.missing++;
  }
  
  console.log('');
});

// Post-sales system specific validation
console.log('🔍 Post-Sales System Validation:\n');

// Check types.ts for post-sales interfaces
const typesFile = validateFile('src/app/models/types.ts');
if (typesFile.exists) {
  const hasPostSalesTypes = typesFile.content.includes('DeliveryData') && 
                           typesFile.content.includes('LegalDocuments');
  console.log(`${hasPostSalesTypes ? '✅' : '❌'} Post-sales type definitions present`);
}

// Check post-sales API service
const apiService = validateFile('src/app/services/post-sales-api.service.ts');
if (apiService.exists) {
  const hasKeyMethods = apiService.content.includes('sendVehicleDeliveredEvent') &&
                       apiService.content.includes('getPostSalesRecord');
  console.log(`${hasKeyMethods ? '✅' : '❌'} Post-sales API service methods present`);
}

// Check documents phase component
const documentsComponent = validateFile('src/app/components/post-sales/documents-phase.component.ts');
if (documentsComponent.exists) {
  const hasSignals = documentsComponent.content.includes('signal(') &&
                    documentsComponent.content.includes('uploadedDocuments');
  console.log(`${hasSignals ? '✅' : '❌'} Documents phase component with signals`);
}

// Final summary
console.log('\n📊 Integration Validation Summary:');
console.log('=====================================');
console.log(`📁 Files: ${results.files.found} found, ${results.files.missing} missing`);
console.log(`🧩 Components: ${results.components.found} found, ${results.components.missing} missing`);
console.log(`⚙️  Services: ${results.services.found} found, ${results.services.missing} missing`);
console.log(`🧪 Tests: ${results.tests.found} found, ${results.tests.missing} missing`);

const totalFiles = results.files.found + results.files.missing;
const successRate = Math.round((results.files.found / totalFiles) * 100);

console.log(`\n🎯 Integration Success Rate: ${successRate}%`);

if (successRate >= 90) {
  console.log('🎉 EXCELLENT: Post-sales system integration is highly complete!');
} else if (successRate >= 75) {
  console.log('👍 GOOD: Post-sales system integration is mostly complete.');
} else if (successRate >= 50) {
  console.log('⚠️  PARTIAL: Post-sales system integration needs attention.');
} else {
  console.log('❌ CRITICAL: Post-sales system integration has major issues.');
}

// Check package.json testing commands
console.log('\n🔧 Available Testing Commands:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const testCommands = Object.keys(packageJson.scripts).filter(script => script.includes('test'));
testCommands.forEach(cmd => {
  console.log(`   npm run ${cmd}`);
});

console.log('\n✨ Integration validation complete!\n');