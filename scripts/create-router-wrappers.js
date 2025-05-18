/**
 * Script to create Expo Router wrapper files for screens that have been moved
 * 
 * This script will:
 * 1. Create wrapper files in the app directory that import and re-export the screens
 * 2. This maintains compatibility with Expo Router while using the new directory structure
 * 
 * Usage: node scripts/create-router-wrappers.js
 */

const fs = require('fs');
const path = require('path');

// Define screen mappings
// Format: [Original file path, New screen import path, Screen name]
const SCREEN_MAPPINGS = [
  // Auth screens
  ['app/login.tsx', '@/app/screens/auth', 'LoginScreen'],
  ['app/register.tsx', '@/app/screens/auth', 'RegisterScreen'],
  ['app/pre-login.tsx', '@/app/screens/auth', 'PreLoginScreen'],
  ['app/forgot-password.tsx', '@/app/screens/auth', 'ForgotPasswordScreen'],
  ['app/verificationScreen.tsx', '@/app/screens/auth', 'VerificationScreen'],
  ['app/verificationConfirmationScreen.tsx', '@/app/screens/auth', 'VerificationConfirmationScreen'],
  ['app/update-password.tsx', '@/app/screens/auth', 'UpdatePasswordScreen'],
  
  // Booking screens
  ['app/bookings.tsx', '@/app/screens/booking', 'BookingsScreen'],
  ['app/booking-details.tsx', '@/app/screens/booking', 'BookingDetailsScreen'],
  ['app/booking-cancel.tsx', '@/app/screens/booking', 'BookingCancelScreen'],
  ['app/booking-success.tsx', '@/app/screens/booking', 'BookingSuccessScreen'],
  ['app/bookingScreen.tsx', '@/app/screens/booking', 'BookingScreen'],
  ['app/bookingConfirmation.tsx', '@/app/screens/booking', 'BookingConfirmationScreen'],
  ['app/archivedBookings.tsx', '@/app/screens/booking', 'ArchivedBookingsScreen'],
  ['app/userBookings.tsx', '@/app/screens/booking', 'UserBookingsScreen'],
  
  // Other screens
  ['app/search.tsx', '@/app/screens/search', 'SearchScreen'],
  ['app/wishlist.tsx', '@/app/screens/user', 'WishlistScreen'],
  ['app/FlightInfo.tsx', '@/app/screens/flight', 'FlightInfoScreen'],
  ['app/legal-information.tsx', '@/app/screens/user', 'LegalInformationScreen'],
  // Add more mappings as needed
];

// Create wrappers
let createdCount = 0;

SCREEN_MAPPINGS.forEach(([originalFile, importPath, screenName]) => {
  // Only create wrappers for screens that exist and should be part of the router
  if (!fs.existsSync(originalFile)) {
    console.log(`Original file not found, skipping wrapper creation: ${originalFile}`);
    return;
  }
  
  // Generate wrapper content
  const wrapperContent = `/**
 * Expo Router wrapper for ${screenName}
 * This file maintains compatibility with Expo Router while using the new directory structure.
 */

import { ${screenName} } from '${importPath}';

export default ${screenName};
`;

  // Write the wrapper file
  try {
    // Don't overwrite the original file directly, create a backup if needed
    if (fs.existsSync(originalFile)) {
      const backupFile = `${originalFile}.backup`;
      if (!fs.existsSync(backupFile)) {
        console.log(`Creating backup of original file: ${backupFile}`);
        fs.copyFileSync(originalFile, backupFile);
      }
    }
    
    // Write the wrapper file
    fs.writeFileSync(originalFile, wrapperContent);
    console.log(`Created router wrapper: ${originalFile}`);
    createdCount++;
  } catch (error) {
    console.error(`Error creating wrapper for ${originalFile}:`, error.message);
  }
});

console.log(`\n✅ Created ${createdCount} router wrappers`);
console.log('\nNext steps:');
console.log('1. Verify that the router wrappers work correctly');
console.log('2. Test navigation to ensure routes are still accessible');
console.log('3. If everything works, you can later delete the backups (*.backup files)'); 