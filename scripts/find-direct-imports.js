/**
 * Script to find direct imports from the old auth-context location
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Direct grep for import statements
try {
  // Modified grep pattern to escape properly
  const grepCommand = 'grep -l "from \'@/lib/auth-context\'" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -r ./app ./lib ./components || true';
  
  let files = execSync(grepCommand, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file.trim() !== '');
  
  // Also check for double-quoted imports
  const grepCommand2 = 'grep -l "from \\"@/lib/auth-context\\"" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -r ./app ./lib ./components || true';
  
  const files2 = execSync(grepCommand2, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file.trim() !== '');
  
  // Combine and remove duplicates
  files = [...new Set([...files, ...files2])];
  
  if (files.length > 0) {
    console.log(`Found ${files.length} files with direct imports from the old auth-context location:`);
    
    files.forEach(file => {
      console.log(`- ${file}`);
      
      // Fix the imports
      try {
        const content = fs.readFileSync(file, 'utf8');
        const updatedContent = content.replace(
          /from ['"]@\/lib\/auth-context['"]/g, 
          `from '@/lib/context/auth-context'`
        );
        
        fs.writeFileSync(file, updatedContent);
        console.log(`  ✅ Fixed imports in ${file}`);
      } catch (error) {
        console.error(`  ❌ Error fixing ${file}:`, error.message);
      }
    });
  } else {
    console.log('✅ No direct imports from the old auth-context location found.');
  }
} catch (error) {
  console.error('Error running grep command:', error.message);
} 