// Import all services with namespaces
import * as authService from '../auth-service';
import * as agentService from '../agent-service';
import * as bookingService from '../booking-service';
import * as packageService from '../package-service';
import * as userService from '../user-service';
import * as chatService from '../chat-service';
import * as storageService from '../storage-service';
import * as reviewService from '../review-service';
import * as itineraryService from '../itinerary-service';

// Namespaced exports to avoid collisions
export {
  authService,
  agentService,
  bookingService,
  packageService,
  userService,
  chatService,
  storageService,
  reviewService,
  itineraryService
};

// Export common functions directly for backwards compatibility
// Auth service
export const { 
  loginUser,
  registerUser,
  logout,
  sendResetPasswordEmail,
  resendVerificationEmail,
  handleVerificationDeepLink,
  VerificationStatus
} = authService;

// Agent service - most commonly used function
export const { getAllAgents } = agentService;

// Booking service - common functions
export const { 
  createBooking,
  getBookingById,
  getUserBookings,
  cancelBooking
} = bookingService;

// Package service - common functions
export const { 
  getPackageById,
  getFeaturedPackages
} = packageService; 