const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying auth-context imports...');

// Check for any remaining direct imports from the old location
try {
  console.log('Checking for direct imports from old auth-context location...');
  const directImports = execSync(
    'grep -l "from \'@/lib/auth-context\'" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -r ./app ./lib ./components || true'
  ).toString().trim();
  
  const directImports2 = execSync(
    'grep -l "from \\"@/lib/auth-context\\"" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -r ./app ./lib ./components || true'
  ).toString().trim();
  
  const directImportsArray = [...directImports.split('\n'), ...directImports2.split('\n')].filter(Boolean);
  
  if (directImportsArray.length > 0) {
    console.log('⚠️ Found files still importing from old auth-context location:');
    directImportsArray.forEach(file => console.log(`- ${file}`));
    
    // Fix these imports automatically
    console.log('Fixing imports automatically...');
    directImportsArray.forEach(file => {
      let content = fs.readFileSync(file, 'utf-8');
      content = content
        .replace(/from ['"]@\/lib\/auth-context['"]/g, 'from \'@/lib/context/auth-context\'');
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`✅ Fixed imports in ${file}`);
    });
  } else {
    console.log('✅ No files found importing from old auth-context location');
  }
} catch (error) {
  console.error('Error checking for direct imports:', error);
}

// Verify the new auth-context file is being used
try {
  console.log('\nVerifying usages of the new auth-context location...');
  const newImports = execSync(
    'grep -l "from \'@/lib/context/auth-context\'" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -r ./app ./lib ./components || true'
  ).toString().trim();
  
  const newImports2 = execSync(
    'grep -l "from \\"@/lib/context/auth-context\\"" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -r ./app ./lib ./components || true'
  ).toString().trim();
  
  const newImportsArray = [...newImports.split('\n'), ...newImports2.split('\n')].filter(Boolean);
  
  if (newImportsArray.length > 0) {
    console.log('✅ Found files correctly importing from new auth-context location:');
    console.log(`- ${newImportsArray.length} files are using the correct import path`);
  } else {
    console.log('⚠️ No files found importing from new auth-context location - this is suspicious');
  }
} catch (error) {
  console.error('Error checking for new imports:', error);
}

// Check for useAuth hook usage
try {
  console.log('\nChecking for useAuth hook usage...');
  const useAuthFiles = execSync(
    'grep -l "useAuth" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -r ./app ./lib ./components || true'
  ).toString().trim();
  
  const useAuthFilesArray = useAuthFiles.split('\n').filter(Boolean);
  
  if (useAuthFilesArray.length > 0) {
    console.log(`✅ Found ${useAuthFilesArray.length} files using the useAuth hook`);
  } else {
    console.log('⚠️ No files found using the useAuth hook - this is suspicious');
  }
} catch (error) {
  console.error('Error checking for useAuth usage:', error);
}

console.log('\n✅ Auth-context import verification complete'); 