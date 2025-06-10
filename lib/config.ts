import { Platform } from 'react-native';

// Get the local IP address from environment or use a default
const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_IP || '192.168.1.1'; // You'll need to set this to your computer's IP
const PORT = process.env.EXPO_PUBLIC_API_PORT || '4000';

// API URLs
export const API_URLS = {
  // Development URLs
  development: {
    local: `http://localhost:${PORT}`,
    network: `http://${LOCAL_IP}:${PORT}`,
  },
  // Production URL
  production: 'https://api.roambii.com', // Replace with your production API URL
};

// Get the current environment
const ENV = process.env.NODE_ENV || 'development';

// Determine if we're running on a physical device
const isPhysicalDevice = !__DEV__ || Platform.OS === 'android' || Platform.OS === 'ios';

// Export the appropriate API URL based on environment and device
export const API_URL = ENV === 'production' 
  ? API_URLS.production 
  : isPhysicalDevice 
    ? API_URLS.development.network 
    : API_URLS.development.local;

// Log the configuration
console.log('📱 API Configuration:');
console.log('- Environment:', ENV);
console.log('- Platform:', Platform.OS);
console.log('- Is Physical Device:', isPhysicalDevice);
console.log('- API URL:', API_URL);

// Export other configuration values
export const CONFIG = {
  API_URL,
  ENV,
  IS_PRODUCTION: ENV === 'production',
  IS_DEVELOPMENT: ENV === 'development',
  IS_PHYSICAL_DEVICE: isPhysicalDevice,
}; 