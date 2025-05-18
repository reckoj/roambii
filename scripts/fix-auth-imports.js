/**
 * Script to fix auth-context imports in all files
 * 
 * This script scans the codebase for imports from the old auth-context location
 * and updates them to use the new location in lib/context/auth-context
 * 
 * Usage: node scripts/fix-auth-imports.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all TypeScript and JavaScript files that import from the old auth-context
console.log('Searching for files with old auth-context imports...');

try {
  // Use grep to find files with the old import pattern
  const grepCommand = "grep -l \"from '@/lib/context/auth-context'\" --include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js' -r .";
  const files = execSync(grepCommand, { encoding: 'utf8' }).trim().split('\n');
  
  // Filter out empty lines
  const filesToUpdate = files.filter(file => file.trim() !== '');
  
  console.log(`Found ${filesToUpdate.length} files with old auth-context imports`);
  
  // Update each file
  let updatedCount = 0;
  
  filesToUpdate.forEach(file => {
    try {
      // Read the file content
      let content = fs.readFileSync(file, 'utf8');
      
      // Replace the import statements
      const oldContent = content;
      
      // Replace imports with the new path
      content = content.replace(/from ['"]@\/lib\/auth-context['"]/g, `from '@/lib/context/auth-context'`);
      
      // If content was changed, write the file
      if (content !== oldContent) {
        fs.writeFileSync(file, content);
        updatedCount++;
        console.log(`✅ Updated imports in ${file}`);
      }
    } catch (error) {
      console.error(`Error updating ${file}:`, error.message);
    }
  });
  
  console.log(`\n✅ Updated ${updatedCount} files with new auth-context imports`);
  
} catch (error) {
  console.error('Error:', error.message);
} 