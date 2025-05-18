/**
 * Script to fix component imports in all files
 * 
 * This script scans the codebase for imports from the old components locations
 * and updates them to use the new organized structure
 * 
 * Usage: node scripts/fix-component-imports.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define component mappings - old path to new path
const COMPONENT_MAPPINGS = [
  {
    oldPattern: /from ['"]@\/components\/RecommendedAgents['"]/g,
    newImport: `from '@/app/components/agents/RecommendedAgents'`
  },
  {
    oldPattern: /from ['"]@\/app\/components\/RecommendedAgents['"]/g,
    newImport: `from '@/app/components/agents/RecommendedAgents'`
  },
  // Add more component mappings as needed
];

// Find all TypeScript and JavaScript files
console.log('Searching for files with component imports to fix...');

try {
  // Use find to get all relevant files
  const findCommand = "find . -type f \\( -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' \\) -not -path '*/node_modules/*' -not -path '*/.git/*'";
  const files = execSync(findCommand, { encoding: 'utf8' }).trim().split('\n');
  
  // Filter out empty lines
  const filesToCheck = files.filter(file => file.trim() !== '');
  
  console.log(`Found ${filesToCheck.length} files to check for component imports`);
  
  // Update each file
  let updatedCount = 0;
  let updatedFiles = 0;
  
  filesToCheck.forEach(file => {
    try {
      // Read the file content
      let content = fs.readFileSync(file, 'utf8');
      
      // Store original content to check if updates were made
      const oldContent = content;
      
      // Check and replace each component import pattern
      COMPONENT_MAPPINGS.forEach(mapping => {
        if (mapping.oldPattern.test(content)) {
          content = content.replace(mapping.oldPattern, mapping.newImport);
          updatedCount++;
        }
      });
      
      // If content was changed, write the file
      if (content !== oldContent) {
        fs.writeFileSync(file, content);
        updatedFiles++;
        console.log(`✅ Updated imports in ${file}`);
      }
    } catch (error) {
      console.error(`Error updating ${file}:`, error.message);
    }
  });
  
  console.log(`\n✅ Updated ${updatedCount} import statements in ${updatedFiles} files`);
  
} catch (error) {
  console.error('Error:', error.message);
} 