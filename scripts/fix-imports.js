/**
 * Script to fix relative imports in moved files
 * 
 * When files are moved to new locations, their relative imports need to be updated.
 * This script will scan a file and convert relative imports to absolute imports.
 * 
 * Usage: node scripts/fix-imports.js <file-path>
 */

const fs = require('fs');
const path = require('path');

// The file to fix
const targetFile = process.argv[2];

if (!targetFile) {
  console.error('Please provide a file path to fix');
  console.error('Usage: node scripts/fix-imports.js <file-path>');
  process.exit(1);
}

if (!fs.existsSync(targetFile)) {
  console.error(`File not found: ${targetFile}`);
  process.exit(1);
}

// Read the file content
let fileContent = fs.readFileSync(targetFile, 'utf8');

// Define the import patterns to find and replace
const RELATIVE_IMPORT_PATTERNS = [
  // Common relative import patterns in moved files
  { from: './firebase/firebase-config', to: '@/lib/firebase/firebase-config' },
  { from: './firebase/models', to: '@/lib/firebase/models' },
  { from: './user-persistence', to: '@/lib/user-persistence' },
  { from: './auth-service', to: '@/lib/services' },
  { from: './agent-service', to: '@/lib/services' },
  { from: './booking-service', to: '@/lib/services' },
  { from: './package-service', to: '@/lib/services' },
  { from: './chat-service', to: '@/lib/services' },
  { from: './storage-service', to: '@/lib/services' },
  { from: '../firebase/firebase-config', to: '@/lib/firebase/firebase-config' },
  { from: '../firebase/models', to: '@/lib/firebase/models' },
  { from: '../user-persistence', to: '@/lib/user-persistence' },
  { from: '../auth-service', to: '@/lib/services' },
  { from: '../agent-service', to: '@/lib/services' },
  { from: '../booking-service', to: '@/lib/services' },
  { from: '../package-service', to: '@/lib/services' },
  { from: '../chat-service', to: '@/lib/services' },
  { from: '../storage-service', to: '@/lib/services' },
  // Add more patterns as needed
];

// Count of replacements made
let replacementCount = 0;

// Check each pattern for a match and replace
RELATIVE_IMPORT_PATTERNS.forEach(pattern => {
  const importRegex = new RegExp(`(import\\s+[^;]+\\s+from\\s+['"])${pattern.from}(['"])`, 'g');
  const exportRegex = new RegExp(`(export\\s+[^;]+\\s+from\\s+['"])${pattern.from}(['"])`, 'g');
  
  // Count matches
  const importMatches = (fileContent.match(importRegex) || []).length;
  const exportMatches = (fileContent.match(exportRegex) || []).length;
  
  if (importMatches > 0 || exportMatches > 0) {
    replacementCount += importMatches + exportMatches;
    console.log(`Found ${importMatches + exportMatches} occurrences of "${pattern.from}"`);
    
    // Replace the patterns
    fileContent = fileContent.replace(importRegex, `$1${pattern.to}$2`);
    fileContent = fileContent.replace(exportRegex, `$1${pattern.to}$2`);
  }
});

// Write the updated content back to the file if changes were made
if (replacementCount > 0) {
  fs.writeFileSync(targetFile, fileContent);
  console.log(`\n✅ Updated ${replacementCount} relative imports in ${targetFile}`);
} else {
  console.log(`\nNo relative imports to fix in ${targetFile}`);
}

// Advice for next steps
console.log('\nNext steps:');
console.log('1. Verify that the file builds without import errors');
console.log('2. Run this script on other moved files if needed');
console.log('3. Check for any remaining import issues manually'); 