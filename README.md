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
