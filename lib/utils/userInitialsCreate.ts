/**
 * String utility functions for the application
 */

/**
 * Extracts initials from a full name
 * @param name - The full name string
 * @returns The initials (up to 2 characters) in uppercase, or "U" if no name provided
 *
 * @example
 * getInitials("John Doe") // Returns "JD"
 * getInitials("John") // Returns "J"
 * getInitials("John Michael Doe") // Returns "JM"
 * getInitials("") // Returns "U"
 * getInitials(undefined) // Returns "U"
 */
export const getInitials = (name?: string): string => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Gets appropriate greeting based on current time
 * @returns Greeting string based on time of day
 */
export const getGreeting = (): string => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return "Good Morning";
  else if (currentHour >= 12 && currentHour < 18) return "Good Afternoon";
  return "Good Evening";
};

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The capitalized string
 */
export const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Truncates text to specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

/**
 * Formats a name for display (capitalizes each word)
 * @param name - The name to format
 * @returns Formatted name with each word capitalized
 */
export const formatName = (name: string): string => {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
};
