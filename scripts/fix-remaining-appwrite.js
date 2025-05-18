const fs = require('fs');
const path = require('path');

// Files with Appwrite imports to fix
const filesToFix = [
  'components/Cards.tsx',
  'components/Comment.tsx',
  'components/AgentReviews.tsx',
  'lib/seed.ts',
  'components/AmenitySelection.tsx'
];

// Function to read file content
const readFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
};

// Function to write file content
const writeFile = (filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Updated ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
};

// Main function to fix Appwrite references
const fixAppwriteReferences = () => {
  console.log('🔍 Fixing remaining Appwrite references...');
  
  for (const file of filesToFix) {
    const filePath = path.join(process.cwd(), file);
    const content = readFile(filePath);
    
    if (!content) continue;
    
    let updatedContent = content;
    
    // Replace Appwrite Models import with Firebase type
    if (content.includes('import { Models } from "react-native-appwrite"')) {
      // Define a Firebase-compatible Document interface
      const firebaseDocumentInterface = `
// Firebase document interface to replace Appwrite Models.Document
interface FirebaseDocument {
  id: string;
  [key: string]: any;
}`;
      
      // Replace the Appwrite import with our Firebase interface
      updatedContent = updatedContent
        .replace('import { Models } from "react-native-appwrite"', firebaseDocumentInterface)
        .replace('item: Models.Document', 'item: FirebaseDocument');
    }
    
    // Replace imports from @/lib/appwrite
    if (content.includes('import { storage, config } from "@/lib/appwrite"')) {
      updatedContent = updatedContent.replace(
        'import { storage, config } from "@/lib/appwrite"',
        'import { storage } from "@/lib/firebase/firebase-config"'
      );
    }
    
    // Replace other Appwrite imports
    updatedContent = updatedContent
      .replace('import { ID } from "react-native-appwrite"', '// Firebase UUID is handled differently')
      .replace('import { databases, config } from "./appwrite"', 'import { firestore } from "./firebase/firebase-config"')
      .replace('import { ID, Query, Permission, Role } from "react-native-appwrite"', '// Firebase security rules replace Appwrite permissions');
    
    // Remove Appwrite specific properties
    updatedContent = updatedContent.replace('$createdAt', 'createdAt');
    
    // If content was updated, write back to file
    if (updatedContent !== content) {
      writeFile(filePath, updatedContent);
    } else {
      console.log(`⚠️ No changes needed for ${file}`);
    }
  }
  
  console.log('✅ Completed fixing Appwrite references');
};

// Run the fix function
fixAppwriteReferences(); 