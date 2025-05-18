/**
 * Migration script to help move components to the new directory structure
 * 
 * This script will:
 * 1. Move components to their appropriate directories
 * 2. Create index.ts files for exporting components
 * 3. Fix relative imports in moved files
 * 4. Log what has been done for review
 * 
 * Usage: node scripts/migrate-components.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration - Define component mappings here
const COMPONENT_MAPPINGS = [
  // Format: [sourceFile, targetDirectory, componentName]
  ['components/Cards.tsx', 'app/components/common', 'Cards'],
  ['components/NoResults.tsx', 'app/components/common', 'NoResults'],
  ['components/AuthButton.tsx', 'app/components/auth', 'AuthButton'],
  ['components/CustomInput.tsx', 'app/components/common', 'CustomInput'],
  // Add more mappings as needed
];

// Make sure directories exist
const DIRECTORIES = [
  'app/components/common',
  'app/components/agents',
  'app/components/auth',
  'app/components/booking',
  'app/components/chat',
  'app/components/home',
  'app/components/itinerary',
];

// Ensure all directories exist
DIRECTORIES.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Process each component
COMPONENT_MAPPINGS.forEach(([source, targetDir, componentName]) => {
  if (!fs.existsSync(source)) {
    console.log(`⚠️ Source file not found: ${source}`);
    return;
  }

  const targetFile = path.join(targetDir, path.basename(source));
  
  // Copy the file
  console.log(`Copying ${source} to ${targetFile}`);
  fs.copyFileSync(source, targetFile);
  
  // Fix imports in the moved file
  try {
    console.log(`Fixing imports in ${targetFile}`);
    execSync(`node scripts/fix-imports.js "${targetFile}"`);
  } catch (error) {
    console.error(`Error fixing imports in ${targetFile}:`, error.message);
  }
  
  // Update the index.ts file for this directory
  const indexFile = path.join(targetDir, 'index.ts');
  let indexContent = '';
  
  if (fs.existsSync(indexFile)) {
    indexContent = fs.readFileSync(indexFile, 'utf8');
  }
  
  // Add export if it doesn't exist
  const exportLine = `export { default as ${componentName} } from './${path.basename(source, '.tsx')}';`;
  if (!indexContent.includes(exportLine)) {
    indexContent += indexContent.endsWith('\n') ? '' : '\n';
    indexContent += exportLine + '\n';
    fs.writeFileSync(indexFile, indexContent);
    console.log(`Updated ${indexFile} with export for ${componentName}`);
  }
});

console.log('\n✅ Migration finished!');
console.log('\nNext steps:');
console.log('1. Update import paths in your components');
console.log('2. Verify the components work correctly');
console.log('3. Once confirmed, you can delete the original files if needed'); 