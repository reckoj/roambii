import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from './firebase/models';

const USER_STORAGE_KEY = '@roambii_user';

export const saveUserToStorage = async (user: User | null) => {
  try {
    if (user) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      console.log('User saved to storage');
    } else {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log('User removed from storage');
    }
  } catch (error) {
    console.error('Error saving user to storage:', error);
  }
};

export const getUserFromStorage = async (): Promise<User | null> => {
  try {
    const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (userJson) {
      const user = JSON.parse(userJson) as User;
      console.log('User retrieved from storage');
      return user;
    }
    return null;
  } catch (error) {
    console.error('Error getting user from storage:', error);
    return null;
  }
};

export const clearUserStorage = async () => {
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    console.log('User storage cleared');
  } catch (error) {
    console.error('Error clearing user storage:', error);
  }
}; 