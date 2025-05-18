/**
 * Migration script to move screens from app directory to app/screens directory
 * 
 * This script will:
 * 1. Move screen files to their appropriate directories in app/screens/
 * 2. Create index.ts files for exporting screens
 * 3. Fix relative imports in moved files
 * 4. Log what has been done for review
 * 
 * Usage: node scripts/migrate-screens.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration - Define screen mappings here
// Format: [sourceFile, targetDirectory, screenName]
const SCREEN_MAPPINGS = [
  // Auth screens
  ['app/login.tsx', 'app/screens/auth', 'LoginScreen'],
  ['app/register.tsx', 'app/screens/auth', 'RegisterScreen'],
  ['app/pre-login.tsx', 'app/screens/auth', 'PreLoginScreen'],
  ['app/forgot-password.tsx', 'app/screens/auth', 'ForgotPasswordScreen'],
  ['app/verificationScreen.tsx', 'app/screens/auth', 'VerificationScreen'],
  ['app/verificationConfirmationScreen.tsx', 'app/screens/auth', 'VerificationConfirmationScreen'],
  ['app/update-password.tsx', 'app/screens/auth', 'UpdatePasswordScreen'],
  
  // Booking screens
  ['app/bookings.tsx', 'app/screens/booking', 'BookingsScreen'],
  ['app/booking-details.tsx', 'app/screens/booking', 'BookingDetailsScreen'],
  ['app/booking-cancel.tsx', 'app/screens/booking', 'BookingCancelScreen'],
  ['app/booking-success.tsx', 'app/screens/booking', 'BookingSuccessScreen'],
  ['app/bookingScreen.tsx', 'app/screens/booking', 'BookingScreen'],
  ['app/bookingConfirmation.tsx', 'app/screens/booking', 'BookingConfirmationScreen'],
  ['app/archivedBookings.tsx', 'app/screens/booking', 'ArchivedBookingsScreen'],
  ['app/userBookings.tsx', 'app/screens/booking', 'UserBookingsScreen'],
  
  // Agent screens
  ['app/agent-profile-setup.tsx', 'app/screens/agent', 'AgentProfileSetupScreen'],
  ['app/edit-agent-profile.tsx', 'app/screens/agent', 'EditAgentProfileScreen'],
  
  // Package screens
  ['app/create-package.tsx', 'app/screens/package', 'CreatePackageScreen'],
  ['app/editPackage.tsx', 'app/screens/package', 'EditPackageScreen'],
  ['app/featured.tsx', 'app/screens/package', 'FeaturedPackagesScreen'],
  
  // Misc screens
  ['app/search.tsx', 'app/screens/search', 'SearchScreen'],
  ['app/wishlist.tsx', 'app/screens/user', 'WishlistScreen'],
  ['app/FlightInfo.tsx', 'app/screens/flight', 'FlightInfoScreen'],
  ['app/legal-information.tsx', 'app/screens/user', 'LegalInformationScreen'],
  ['app/loadinScreen.tsx', 'app/screens/common', 'LoadingScreen'],
];

// Make sure directories exist
const DIRECTORIES = [
  'app/screens/auth',
  'app/screens/booking',
  'app/screens/agent',
  'app/screens/package',
  'app/screens/search',
  'app/screens/user',
  'app/screens/flight',
  'app/screens/common',
  'app/screens/itinerary'
];

// Ensure all directories exist
DIRECTORIES.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Process each screen
SCREEN_MAPPINGS.forEach(([source, targetDir, screenName]) => {
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
  const exportLine = `export { default as ${screenName} } from './${path.basename(source, '.tsx')}';`;
  if (!indexContent.includes(exportLine)) {
    indexContent += indexContent.endsWith('\n') ? '' : '\n';
    indexContent += exportLine + '\n';
    fs.writeFileSync(indexFile, indexContent);
    console.log(`Updated ${indexFile} with export for ${screenName}`);
  }
});

// Create main screens index file to export all screens
const mainIndexFile = 'app/screens/index.ts';
console.log(`Creating main screens index file: ${mainIndexFile}`);

// Create content for the main index file
let mainIndexContent = `// Export all screens for easy imports\n\n`;

// Add exports for each directory
DIRECTORIES.forEach(dir => {
  const dirName = path.basename(dir);
  mainIndexContent += `// ${dirName.charAt(0).toUpperCase() + dirName.slice(1)} screens\n`;
  mainIndexContent += `export * from './${dirName}';\n\n`;
});

fs.writeFileSync(mainIndexFile, mainIndexContent);

console.log('\n✅ Migration finished!');
console.log('\nNext steps:');
console.log('1. Update import paths in your components');
console.log('2. Verify the screens work correctly');
console.log('3. Update the router to use the new screen paths'); 