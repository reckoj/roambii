# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# Roambii

## Project Overview

Roambii is a travel platform connecting travelers with local agents for personalized travel experiences.

## Project Structure

Please see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for details on the new organized project structure.

## Development Setup

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android simulator
npm run android
```

## Migration Scripts

The project is being reorganized to a more maintainable structure. Use these scripts to help with the migration:

```bash
# Migrate components to new directories
node scripts/migrate-components.js

# Update import paths in your files
node scripts/update-imports.js
```

## Importing Components

Use the new import paths for components:

```javascript
// Import from feature directories
import { RecommendedAgents } from '@/app/components/agents';

// Import services
import { getAllAgents } from '@/lib/services';
```

## Testing

```bash
# Run tests
npm test
```

## Contributing

1. Follow the project structure guidelines in PROJECT_STRUCTURE.md
2. Use the provided components and services
3. Add new components to the appropriate directories
4. Update the index.ts files when adding new components

## Itinerary Pricing Feature

### Overview
The itinerary feature now includes a price field that allows agents to set prices for itineraries they create. This price can be viewed by all users but can only be edited by agents.

### Implementation Details
1. The `Itinerary` model now includes an optional `price` field to store the cost of the itinerary.
2. Firestore security rules have been updated to ensure that only users in agent mode can set or modify the price field.
3. The itinerary creation screen includes a price input field that is only visible to agents.
4. The itinerary detail screen displays the price if it has been set, and allows agents to edit it.

### Deploying Firestore Rules
To deploy the updated Firestore security rules, you need to:

1. Set up the Firebase CLI if you haven't already:
   ```
   npm install -g firebase-tools
   firebase login
   firebase init
   ```

2. Choose "Firestore" when prompted for features.

3. When the setup is complete, deploy the rules with:
   ```
   firebase deploy --only firestore:rules
   ```

4. Alternatively, you can manually update the rules in the Firebase Console:
   - Go to Firebase Console > Firestore Database > Rules
   - Copy the contents of the `firestore.rules` file from this project
   - Paste into the rules editor and click "Publish"

### Testing the Feature
1. Log in as an agent user (or toggle to agent mode)
2. Create a new itinerary and set a price
3. View the itinerary to confirm the price is displayed
4. Try editing the price as both an agent and a regular user to verify permissions

## Itinerary Sharing

The Roambii app now includes the ability to share itineraries between users. Users can share an itinerary with others while maintaining proper access controls.

### Features

- **Collaborative Editing**: Users can share itineraries with others, allowing them to view and edit details
- **Access Control**: While travelers can edit most parts of a shared itinerary, only agents can modify the price
- **Visual Indicators**: Clear indication when viewing a shared itinerary
- **User Management**: Owners can see who an itinerary is shared with and revoke access

### Security

The implementation uses Firestore Security Rules to enforce access controls:
- Only the creator of an itinerary or users it's shared with can access it
- Only agents can set or modify the price field, regardless of who created the itinerary
- Non-agent users (travelers) can't modify the price field, even when the itinerary is shared with them

### Usage

1. **Sharing an Itinerary**: 
   - Open an itinerary you own
   - Click the Share icon in the top right
   - Enter the email of the person you want to share with
   - Click "Share"

2. **Managing Shared Access**:
   - View the list of users an itinerary is shared with
   - Click the X icon next to a user to revoke their access

3. **Editing Shared Itineraries**:
   - When viewing a shared itinerary, most fields can be edited
   - The price field can only be modified by agents, even if you created the itinerary
