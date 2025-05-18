/**
 * Script to update service imports to use the new namespaced pattern
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all TypeScript and JavaScript files that import from services
console.log('Searching for files with service imports...');

try {
  // Find files that import from lib/services
  const findCommand = "grep -l \"from '@/lib/services'\" --include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js' -r .";
  const files = execSync(findCommand, { encoding: 'utf8' }).trim().split('\n');
  
  // Filter out empty lines
  const filesToUpdate = files.filter(file => file.trim() !== '');
  
  console.log(`Found ${filesToUpdate.length} files with service imports`);
  
  // Update each file
  let updatedCount = 0;
  
  filesToUpdate.forEach(file => {
    try {
      // Read the file content
      let content = fs.readFileSync(file, 'utf8');
      let updated = false;
      
      // Check for import { userService.func1, userService.func2 } from '@/lib/services' pattern
      // where any functions might need to be namespaced
      
      // Example import pattern: import { getAllAgents, userService.someOtherFunc } from '@/lib/services';
      const importMatches = content.match(/import\s+{([^}]+)}\s+from\s+['"]@\/lib\/services['"]/g);
      
      if (importMatches && importMatches.length > 0) {
        console.log(`Checking imports in ${file}...`);
        
        // Process each import statement
        importMatches.forEach(importStatement => {
          // Extract the list of imported functions
          const functionsMatch = importStatement.match(/import\s+{([^}]+)}\s+from/);
          
          if (functionsMatch && functionsMatch[1]) {
            const importedFunctions = functionsMatch[1].split(',').map(f => f.trim());
            
            // Check if any functions need to be namespaced
            const namespacedImports = [];
            const directImports = [];
            
            importedFunctions.forEach(func => {
              // Skip already namespaced imports
              if (func.includes('.')) {
                directImports.push(func);
                return;
              }
              
              // List of common functions we've explicitly re-exported
              const directlyExportedFunctions = [
                'loginUser', 'registerUser', 'resetPassword', 'logoutUser',
                'getAllAgents',
                'createBooking', 'getBookingById',
                'getPackageById', 'getAllPackages'
              ];
              
              if (directlyExportedFunctions.includes(func)) {
                directImports.push(func);
              } else {
                // Determine which service namespace to use
                // This is a simplified approach - in a real project you would need a more comprehensive mapping
                let namespace = '';
                
                if (func.toLowerCase().includes('agent')) namespace = 'agentService';
                else if (func.toLowerCase().includes('auth') || func.toLowerCase().includes('user')) namespace = 'authService';
                else if (func.toLowerCase().includes('booking')) namespace = 'bookingService';
                else if (func.toLowerCase().includes('package')) namespace = 'packageService';
                else if (func.toLowerCase().includes('chat')) namespace = 'chatService';
                else if (func.toLowerCase().includes('storage') || func.toLowerCase().includes('upload')) namespace = 'storageService';
                else if (func.toLowerCase().includes('review')) namespace = 'reviewService';
                else if (func.toLowerCase().includes('itinerary')) namespace = 'itineraryService';
                else namespace = 'userService'; // Default fallback
                
                namespacedImports.push(`${namespace}.${func}`);
              }
            });
            
            // If we have namespaced imports, update the import statement
            if (namespacedImports.length > 0) {
              const allImports = [...directImports, ...namespacedImports].join(', ');
              const newImport = `import { ${allImports} } from '@/lib/services'`;
              content = content.replace(importStatement, newImport);
              updated = true;
            }
          }
        });
      }
      
      // If content was updated, write the file
      if (updated) {
        fs.writeFileSync(file, content);
        updatedCount++;
        console.log(`✅ Updated service imports in ${file}`);
      }
    } catch (error) {
      console.error(`Error updating ${file}:`, error.message);
    }
  });
  
  console.log(`\n✅ Updated ${updatedCount} files with new service import patterns`);
  
} catch (error) {
  console.error('Error:', error.message);
} 