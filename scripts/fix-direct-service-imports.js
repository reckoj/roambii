/**
 * Script to update direct service imports to use the centralized services
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define service imports to check
const SERVICE_IMPORTS = [
  {
    oldPattern: /from ['"]@\/lib\/auth-service['"]/g,
    newPattern: `from '@/lib/services'`,
    namespace: 'authService'
  },
  {
    oldPattern: /from ['"]@\/lib\/agent-service['"]/g,
    newPattern: `from '@/lib/services'`,
    namespace: 'agentService'
  },
  {
    oldPattern: /from ['"]@\/lib\/booking-service['"]/g,
    newPattern: `from '@/lib/services'`,
    namespace: 'bookingService'
  },
  {
    oldPattern: /from ['"]@\/lib\/package-service['"]/g,
    newPattern: `from '@/lib/services'`,
    namespace: 'packageService'
  },
  {
    oldPattern: /from ['"]@\/lib\/user-service['"]/g,
    newPattern: `from '@/lib/services'`,
    namespace: 'userService'
  },
  {
    oldPattern: /from ['"]@\/lib\/chat-service['"]/g,
    newPattern: `from '@/lib/services'`,
    namespace: 'chatService'
  },
  {
    oldPattern: /from ['"]@\/lib\/storage-service['"]/g,
    newPattern: `from '@/lib/services'`,
    namespace: 'storageService'
  },
  {
    oldPattern: /from ['"]@\/lib\/review-service['"]/g,
    newPattern: `from '@/lib/services'`,
    namespace: 'reviewService'
  },
  {
    oldPattern: /from ['"]@\/lib\/itinerary-service['"]/g,
    newPattern: `from '@/lib/services'`,
    namespace: 'itineraryService'
  }
];

// Find all TypeScript and JavaScript files
console.log('Searching for files with direct service imports...');

try {
  // Define pattern to search for all service imports
  const grepPatterns = SERVICE_IMPORTS.map(si => 
    si.oldPattern.toString().replace(/\\\//g, '/').replace(/\\\\/g, '\\').replace(/^\/(.*)\/(g|i|m|s|u|y)*$/, '$1')
  ).join('\\|');

  // Use grep to find files with direct service imports
  const grepCommand = `grep -l "${grepPatterns}" --include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js' -r .`;
  const files = execSync(grepCommand, { encoding: 'utf8' }).trim().split('\n');
  
  // Filter out empty lines
  const filesToUpdate = files.filter(file => file.trim() !== '');
  
  console.log(`Found ${filesToUpdate.length} files with direct service imports`);
  
  // Update each file
  let updatedCount = 0;
  
  filesToUpdate.forEach(file => {
    try {
      // Skip lib/services/index.ts
      if (file.endsWith('lib/services/index.ts')) {
        return;
      }

      // Read the file content
      let content = fs.readFileSync(file, 'utf8');
      let updated = false;
      
      // Check each service import pattern
      SERVICE_IMPORTS.forEach(service => {
        if (service.oldPattern.test(content)) {
          // Find import statements matching this pattern
          const importRegex = new RegExp(`import\\s+{([^}]+)}\\s+from\\s+${service.oldPattern.toString().slice(1, -2)}`, 'g');
          const importMatches = [...content.matchAll(importRegex)];
          
          if (importMatches.length > 0) {
            console.log(`Updating imports in ${file} for ${service.namespace}...`);
            
            // Process each import match
            importMatches.forEach(match => {
              const importedItems = match[1].split(',').map(item => item.trim());
              const namespacedItems = importedItems.map(item => `${service.namespace}.${item}`);
              
              // Create new import statement
              const newImport = `import { ${namespacedItems.join(', ')} } from ${service.newPattern.slice(0, -1)}`;
              
              // Replace in content
              content = content.replace(match[0], newImport);
              updated = true;
            });
          }
        }
      });
      
      // If updates were made, write the file
      if (updated) {
        fs.writeFileSync(file, content);
        updatedCount++;
        console.log(`✅ Updated direct service imports in ${file}`);
      }
    } catch (error) {
      console.error(`Error updating ${file}:`, error.message);
    }
  });
  
  console.log(`\n✅ Updated ${updatedCount} files with centralized service imports`);
  
} catch (error) {
  console.error('Error:', error.message);
} 