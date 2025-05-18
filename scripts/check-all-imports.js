/**
 * Script to check all imports for auth-context in the codebase
 * 
 * This script scans all files for potential issues with imports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all TypeScript and JavaScript files
const findCommand = "find . -type f \\( -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' \\) -not -path '*/node_modules/*' -not -path '*/.git/*'";
const files = execSync(findCommand, { encoding: 'utf8' }).trim().split('\n');

console.log(`Found ${files.length} files to check`);

const problemFiles = [];

// Check each file for potential import issues
files.forEach(file => {
  try {
    // Skip non-relevant files
    if (file.includes('node_modules/') || file.includes('.git/')) {
      return;
    }
    
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for imports from the old location
    if (content.includes(`from '@/lib/context/auth-context'`) || 
        content.includes(`from '@/lib/context/auth-context'`) ||
        content.includes(`from '@/lib/auth-context/'`) ||
        content.includes(`from "@/lib/auth-context/"`)) {
      
      problemFiles.push({
        file,
        issue: 'Uses old auth-context import path'
      });
    }
    
    // Check for useAuth without proper import
    if (content.includes('useAuth') && 
        !content.includes(`from '@/lib/context/auth-context'`) &&
        !content.includes(`from "@/lib/context/auth-context"`)) {
      
      problemFiles.push({
        file,
        issue: 'Uses useAuth but might not import from the correct location'
      });
    }
    
    // Check for AuthProvider without proper import
    if (content.includes('AuthProvider') && 
        !content.includes(`from '@/lib/context/auth-context'`) &&
        !content.includes(`from "@/lib/context/auth-context"`)) {
      
      problemFiles.push({
        file,
        issue: 'Uses AuthProvider but might not import from the correct location'
      });
    }
  } catch (error) {
    console.error(`Error checking file ${file}:`, error.message);
  }
});

// Report problems
if (problemFiles.length > 0) {
  console.log('\n🔴 Found potential import issues in the following files:');
  problemFiles.forEach(({ file, issue }) => {
    console.log(`  - ${file}: ${issue}`);
  });
  
  // Fix the issues
  console.log('\nAttempting to fix issues...');
  
  problemFiles.forEach(({ file }) => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const updatedContent = content.replace(
        /from ['"]@\/lib\/auth-context['"]/g, 
        `from '@/lib/context/auth-context'`
      );
      
      if (content !== updatedContent) {
        fs.writeFileSync(file, updatedContent);
        console.log(`✅ Fixed imports in ${file}`);
      }
    } catch (error) {
      console.error(`Error fixing file ${file}:`, error.message);
    }
  });
} else {
  console.log('\n✅ No import issues found!');
} 