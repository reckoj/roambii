// lib/firebase/storageService.ts
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { storage } from "../lib/firebase/firebase-config";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload a profile image to Firebase Storage
 * @param userId User ID to associate with the image
 * @param imageUri Local URI of the image to upload
 * @returns URL of the uploaded image or null if upload failed
 */
export const uploadProfileImage = async (
  userId: string,
  imageUri: string
): Promise<string | undefined> => {
  try {
    // Fetch the file from the URI
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Generate a unique file name
    const fileExtension = imageUri.split(".").pop() || "jpg";
    const fileName = `${userId}_profile_${uuidv4()}.${fileExtension}`;

    // Upload to Firebase Storage
    const avatarRef = ref(storage, `avatars/${fileName}`);
    await uploadBytes(avatarRef, blob);

    // Get download URL
    const downloadUrl = await getDownloadURL(avatarRef);

    return downloadUrl;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return undefined;
  }
};

/**
 * Upload a package/property image to Firebase Storage
 * @param imageUri Local URI of the image to upload
 * @param packageId Optional package ID to associate with the image
 * @returns URL of the uploaded image or null if upload failed
 */
export const uploadPackageImage = async (
  imageUri: string,
  packageId?: string
): Promise<string | null> => {
  try {
    // Fetch the file from the URI
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Generate a unique file name
    const fileExtension = imageUri.split(".").pop() || "jpg";
    const fileName = `${packageId || "package"}_${uuidv4()}.${fileExtension}`;

    // Upload to Firebase Storage
    const imageRef = ref(storage, `package_images/${fileName}`);
    await uploadBytes(imageRef, blob);

    // Get download URL
    const downloadUrl = await getDownloadURL(imageRef);

    return downloadUrl;
  } catch (error) {
    console.error("Error uploading package image:", error);
    return null;
  }
};

/**
 * Upload multiple images to Firebase Storage
 * @param imageUris Array of local URIs of images to upload
 * @param folderPath Storage folder path
 * @returns Array of URLs of the uploaded images
 */
export const uploadMultipleImages = async (
  imageUris: string[],
  folderPath: string
): Promise<string[]> => {
  try {
    const uploadPromises = imageUris.map(async (uri) => {
      // Fetch the file from the URI
      const response = await fetch(uri);
      const blob = await response.blob();

      // Generate a unique file name
      const fileExtension = uri.split(".").pop() || "jpg";
      const fileName = `${uuidv4()}.${fileExtension}`;

      // Upload to Firebase Storage
      const imageRef = ref(storage, `${folderPath}/${fileName}`);
      await uploadBytes(imageRef, blob);

      // Get download URL
      return getDownloadURL(imageRef);
    });

    // Wait for all uploads to complete
    const downloadUrls = await Promise.all(uploadPromises);

    return downloadUrls;
  } catch (error) {
    console.error("Error uploading multiple images:", error);
    return [];
  }
};

/**
 * Delete an image from Firebase Storage by URL
 * @param imageUrl URL of the image to delete
 * @returns Boolean indicating success or failure
 */
export const deleteImageByUrl = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract the storage path from the URL
    // This is a bit of a hack but works for Firebase Storage URLs
    const baseUrl = "https://firebasestorage.googleapis.com/v0/b/";
    const urlWithoutBase = imageUrl.substring(baseUrl.length);
    const bucketEnd = urlWithoutBase.indexOf("/");
    const pathStart = urlWithoutBase.indexOf("o/") + 2;
    const pathEnd = urlWithoutBase.indexOf("?");

    if (pathStart === -1 || pathEnd === -1) {
      throw new Error("Invalid Firebase Storage URL");
    }

    const path = decodeURIComponent(
      urlWithoutBase.substring(pathStart, pathEnd)
    );

    // Delete the image
    const imageRef = ref(storage, path);
    await deleteObject(imageRef);

    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
};

/**
 * Get all images in a folder
 * @param folderPath Storage folder path
 * @returns Array of URLs of the images in the folder
 */
export const getImagesInFolder = async (
  folderPath: string
): Promise<string[]> => {
  try {
    const folderRef = ref(storage, folderPath);
    const result = await listAll(folderRef);

    const downloadUrlPromises = result.items.map((itemRef) =>
      getDownloadURL(itemRef)
    );

    const downloadUrls = await Promise.all(downloadUrlPromises);

    return downloadUrls;
  } catch (error) {
    console.error(`Error getting images from folder ${folderPath}:`, error);
    return [];
  }
};

/**
 * Delete all images in a folder
 * @param folderPath Storage folder path
 * @returns Boolean indicating success or failure
 */
export const deleteImagesInFolder = async (
  folderPath: string
): Promise<boolean> => {
  try {
    const folderRef = ref(storage, folderPath);
    const result = await listAll(folderRef);

    const deletePromises = result.items.map((itemRef) => deleteObject(itemRef));

    await Promise.all(deletePromises);

    return true;
  } catch (error) {
    console.error(`Error deleting images from folder ${folderPath}:`, error);
    return false;
  }
};
