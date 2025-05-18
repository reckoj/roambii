/**
 * Script to fix all auth-context imports throughout the codebase
 * 
 * This script searches for all files importing from the old auth-context location
 * and updates them to the new location in lib/context/auth-context
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Searching for files with old auth-context imports...');

try {
  // Find all files that import from the old auth-context location
  const findCommand = "grep -l \"from '@/lib/context/auth-context'\" --include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js' -r .";
  
  const files = execSync(findCommand, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file.trim() !== '');
  
  console.log(`Found ${files.length} files with old auth-context imports`);
  
  // Process each file
  let updatedCount = 0;
  
  files.forEach(file => {
    try {
      console.log(`Checking file: ${file}`);
      
      // Skip files in node_modules or .git
      if (file.includes('node_modules/') || file.includes('.git/')) {
        return;
      }
      
      // Read file content
      const content = fs.readFileSync(file, 'utf8');
      
      // Replace the import
      const updatedContent = content.replace(
        /from ['"]@\/lib\/auth-context['"]/g, 
        `from '@/lib/context/auth-context'`
      );
      
      // If content was changed, write it back
      if (content !== updatedContent) {
        fs.writeFileSync(file, updatedContent);
        console.log(`✅ Updated imports in ${file}`);
        updatedCount++;
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error.message);
    }
  });
  
  console.log(`\n✅ Updated ${updatedCount} files with new auth-context imports`);
  
  // Also check for useAuth imports which might not be caught by the above
  const useAuthCommand = "grep -l \"useAuth\" --include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js' -r .";
  
  const useAuthFiles = execSync(useAuthCommand, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file.trim() !== '');
  
  console.log(`\nFound ${useAuthFiles.length} files with useAuth imports`);
  
  // Process each useAuth file
  let useAuthUpdatedCount = 0;
  
  useAuthFiles.forEach(file => {
    try {
      // Skip already processed files, node_modules, etc.
      if (file.includes('node_modules/') || file.includes('.git/')) {
        return;
      }
      
      // Read file content
      const content = fs.readFileSync(file, 'utf8');
      
      // Check if there's an import for useAuth that's not from the new location
      if (content.includes('useAuth') && 
          !content.includes(`from '@/lib/context/auth-context'`) &&
          content.includes(`from '@/lib/context/auth-context'`)) {
        
        // Replace the import
        const updatedContent = content.replace(
          /from ['"]@\/lib\/auth-context['"]/g, 
          `from '@/lib/context/auth-context'`
        );
        
        // If content was changed, write it back
        if (content !== updatedContent) {
          fs.writeFileSync(file, updatedContent);
          console.log(`✅ Updated useAuth imports in ${file}`);
          useAuthUpdatedCount++;
        }
      }
    } catch (error) {
      console.error(`Error processing useAuth file ${file}:`, error.message);
    }
  });
  
  console.log(`\n✅ Updated ${useAuthUpdatedCount} additional files with useAuth imports`);
  console.log(`\nTotal files updated: ${updatedCount + useAuthUpdatedCount}`);
  
} catch (error) {
  console.error('Error:', error.message);
} 