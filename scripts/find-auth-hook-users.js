/**
 * Script to find files that use useAuth or AuthProvider
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find files that use useAuth
try {
  const useAuthCommand = 'grep -l "useAuth" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -r ./app ./lib ./components || true';
  
  const useAuthFiles = execSync(useAuthCommand, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file.trim() !== '');
  
  console.log(`Found ${useAuthFiles.length} files that use useAuth:`);
  
  useAuthFiles.forEach(file => {
    // Skip the auth-context file itself
    if (file === './lib/context/auth-context.tsx') {
      return;
    }
    
    console.log(`- ${file}`);
    
    // Check if it imports from the correct location
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      if (!content.includes(`from '@/lib/context/auth-context'`) && 
          !content.includes(`from "@/lib/context/auth-context"`)) {
        console.log(`  ⚠️ WARNING: This file uses useAuth but doesn't import from '@/lib/context/auth-context'`);
        
        // Check if it imports from the old location
        if (content.includes(`from '@/lib/auth-context'`) || 
            content.includes(`from "@/lib/auth-context"`)) {
          console.log(`  🔴 ISSUE: File imports from old auth-context location`);
          
          // Fix it
          const updatedContent = content.replace(
            /from ['"]@\/lib\/auth-context['"]/g, 
            `from '@/lib/context/auth-context'`
          );
          
          fs.writeFileSync(file, updatedContent);
          console.log(`  ✅ Fixed imports in ${file}`);
        }
      }
    } catch (error) {
      console.error(`  ❌ Error checking ${file}:`, error.message);
    }
  });
  
  // Find files that use AuthProvider
  const authProviderCommand = 'grep -l "AuthProvider" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -r ./app ./lib ./components || true';
  
  const authProviderFiles = execSync(authProviderCommand, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(file => file.trim() !== '');
  
  console.log(`\nFound ${authProviderFiles.length} files that use AuthProvider:`);
  
  authProviderFiles.forEach(file => {
    // Skip the auth-context file itself
    if (file === './lib/context/auth-context.tsx') {
      return;
    }
    
    console.log(`- ${file}`);
    
    // Check if it imports from the correct location
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      if (!content.includes(`from '@/lib/context/auth-context'`) && 
          !content.includes(`from "@/lib/context/auth-context"`)) {
        console.log(`  ⚠️ WARNING: This file uses AuthProvider but doesn't import from '@/lib/context/auth-context'`);
        
        // Check if it imports from the old location
        if (content.includes(`from '@/lib/auth-context'`) || 
            content.includes(`from "@/lib/auth-context"`)) {
          console.log(`  🔴 ISSUE: File imports from old auth-context location`);
          
          // Fix it
          const updatedContent = content.replace(
            /from ['"]@\/lib\/auth-context['"]/g, 
            `from '@/lib/context/auth-context'`
          );
          
          fs.writeFileSync(file, updatedContent);
          console.log(`  ✅ Fixed imports in ${file}`);
        }
      }
    } catch (error) {
      console.error(`  ❌ Error checking ${file}:`, error.message);
    }
  });
  
} catch (error) {
  console.error('Error running grep command:', error.message);
} 