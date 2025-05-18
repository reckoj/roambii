/**
 * Script to help update import paths to the new structure
 * 
 * This script will search for import statements in files and update them
 * to use the new directory structure.
 * 
 * Usage: node scripts/update-imports.js [directory]
 */

const fs = require('fs');
const path = require('path');

// The directory to scan (defaults to current directory if not provided)
const scanDir = process.argv[2] || '.';

// Import path mappings - old path to new path
const IMPORT_MAPPINGS = [
  // Components
  ['@/components/RecommendedAgents', '@/app/components/agents/RecommendedAgents'],
  ['@/components/Cards', '@/app/components/common/Cards'],
  ['@/components/NoResults', '@/app/components/common/NoResults'],
  ['@/components/AuthButton', '@/app/components/auth/AuthButton'],
  
  // Screens
  ['@/app/login', '@/app/screens/auth/LoginScreen'],
  ['@/app/register', '@/app/screens/auth/RegisterScreen'],
  ['@/app/pre-login', '@/app/screens/auth/PreLoginScreen'],
  ['@/app/forgot-password', '@/app/screens/auth/ForgotPasswordScreen'],
  ['@/app/bookings', '@/app/screens/booking/BookingsScreen'],
  ['@/app/booking-details', '@/app/screens/booking/BookingDetailsScreen'],
  ['@/app/userBookings', '@/app/screens/booking/UserBookingsScreen'],
  ['@/app/edit-agent-profile', '@/app/screens/agent/EditAgentProfileScreen'],
  ['@/app/agent-profile-setup', '@/app/screens/agent/AgentProfileSetupScreen'],
  ['@/app/search', '@/app/screens/search/SearchScreen'],
  ['@/app/wishlist', '@/app/screens/user/WishlistScreen'],
  
  // Services
  ['@/lib/auth-service', '@/lib/services'],
  ['@/lib/agent-service', '@/lib/services'],
  ['@/lib/booking-service', '@/lib/services'],
  ['@/lib/package-service', '@/lib/services'],
  ['@/lib/user-service', '@/lib/services'],
  ['@/lib/chat-service', '@/lib/services'],
  
  // Context
  ['@/lib/auth-context', '@/lib/context/auth-context'],
  ['@/lib/global-provider', '@/lib/context/global-provider'],
  
  // Add more mappings as needed
];

// Function to recursively scan directories for files with these extensions
function scanDirectory(directory) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  let results = [];

  const items = fs.readdirSync(directory);
  
  for (const item of items) {
    const fullPath = path.join(directory, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (item !== 'node_modules' && item !== '.git') {
        results = results.concat(scanDirectory(fullPath));
      }
    } else if (extensions.includes(path.extname(item))) {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Function to update imports in a file
function updateImportsInFile(filePath) {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const [oldPath, newPath] of IMPORT_MAPPINGS) {
    // Check for both import statements and re-exports
    const importRegex = new RegExp(`import (.*) from ['"]${oldPath}['"]`, 'g');
    const exportRegex = new RegExp(`export (.*) from ['"]${oldPath}['"]`, 'g');
    
    if (importRegex.test(fileContent) || exportRegex.test(fileContent)) {
      fileContent = fileContent.replace(importRegex, `import $1 from '${newPath}'`);
      fileContent = fileContent.replace(exportRegex, `export $1 from '${newPath}'`);
      modified = true;
    }
  }
  
  if (modified) {
    console.log(`Updated imports in: ${filePath}`);
    fs.writeFileSync(filePath, fileContent);
    return 1;
  }
  
  return 0;
}

// Main execution
console.log(`Scanning directory: ${scanDir}`);
const files = scanDirectory(scanDir);
console.log(`Found ${files.length} files to check`);

let updatedCount = 0;
for (const file of files) {
  updatedCount += updateImportsInFile(file);
}

console.log(`\n✅ Updated imports in ${updatedCount} files`);
console.log('\nNext steps:');
console.log('1. Verify that your application still works correctly');
console.log('2. Fix any remaining import issues manually'); 