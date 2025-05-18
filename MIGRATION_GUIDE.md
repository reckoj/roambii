# Migration Guide for Roambii Project

This guide outlines the steps to migrate the existing codebase to the new organized project structure.

## Overview of Changes

1. **Feature-based directory structure**: Components and screens organized by feature
2. **Centralized service exports**: All services exported from a single location
3. **Consistent import patterns**: Using absolute imports with the `@/` prefix
4. **Improved maintainability**: Easier to find and update related code

## Step 1: Directory Structure

The following directories have been created:

```
app/
  components/              # UI Components
    agents/
    auth/
    booking/
    chat/
    common/
    home/
    itinerary/
  screens/                 # Screen Components
    auth/
    booking/
    agent/
    package/
    search/
    user/
    flight/
    common/
lib/
  context/
  hooks/
  services/
  utils/
```

## Step 2: Use Migration Scripts

Five scripts have been provided to help with the migration:

1. **migrate-components.js**: Moves components to their new locations and fixes imports
   ```bash
   node scripts/migrate-components.js
   ```

2. **migrate-screens.js**: Moves screens to their new locations and fixes imports
   ```bash
   node scripts/migrate-screens.js
   ```

3. **update-imports.js**: Updates import paths in your files
   ```bash
   node scripts/update-imports.js
   ```

4. **fix-imports.js**: Fixes relative imports in moved files
   ```bash
   node scripts/fix-imports.js <file-path>
   ```

5. **create-router-wrappers.js**: Creates Expo Router wrapper files
   ```bash
   node scripts/create-router-wrappers.js
   ```

## Recommended Migration Sequence

For a smooth migration, follow these steps:

1. Run `migrate-components.js` to move components
2. Run `migrate-screens.js` to move screens
3. Run `update-imports.js` to update import paths in other files
4. Run `create-router-wrappers.js` to maintain Expo Router compatibility
5. Fix any remaining issues manually

## Step 3: Update Component and Screen Imports

When working with components and screens, use the following import pattern:

### Components
```javascript
// OLD WAY
import RecommendedAgents from '@/components/RecommendedAgents';

// NEW WAY
import { RecommendedAgents } from '@/app/components/agents';
```

### Screens
```javascript
// OLD WAY
import Login from '@/app/login';

// NEW WAY
import { LoginScreen } from '@/app/screens/auth';
```

## Step 4: Update Service Imports

Services are now centralized:

```javascript
// OLD WAY
import { getAllAgents } from '@/lib/agent-service';
import { loginUser } from '@/lib/auth-service';

// NEW WAY
import { getAllAgents, loginUser } from '@/lib/services';
```

## Step 5: Component and Screen Creation Guide

### For Components

1. Place them in the appropriate feature directory under `app/components/`
2. Export them from the feature directory's index.ts file
3. Use the consistent import pattern

Example:
```javascript
// In app/components/agents/NewAgentCard.tsx
export default function NewAgentCard() { ... }

// In app/components/agents/index.ts
export { default as RecommendedAgents } from './RecommendedAgents';
export { default as NewAgentCard } from './NewAgentCard';

// In another file
import { NewAgentCard } from '@/app/components/agents';
```

### For Screens

1. Place them in the appropriate feature directory under `app/screens/`
2. Add the 'Screen' suffix to the component name
3. Export them from the feature directory's index.ts file

Example:
```javascript
// In app/screens/booking/BookingDetailsScreen.tsx
export default function BookingDetailsScreen() { ... }

// In app/screens/booking/index.ts
export { default as BookingDetailsScreen } from './booking-details';

// In another file
import { BookingDetailsScreen } from '@/app/screens/booking';
```

## Step 6: Expo Router Integration

For screens that need to be part of the navigation:

1. Create an `app/(screens)/` directory for screens that should be part of the router
2. Use symbolic links or wrapper components to reference the screens in app/screens/

Example:
```javascript
// In app/(root)/bookings.tsx
import { BookingsScreen } from '@/app/screens/booking';
export default BookingsScreen;
```

## Step 7: Testing

After migrating components and updating imports:

1. Ensure the app builds without errors
2. Test all migrated functionality
3. Verify that navigation and data flow work correctly

## Common Issues and Solutions

1. **Import Errors**: If you see "Cannot find module", check if the component has been properly exported from the index.ts file.

2. **Component Not Rendering**: Verify that you're using the correct import path and that the component name matches the export.

3. **Navigation Issues**: When moving screens, make sure to update any navigation references to point to the new paths.

4. **Duplicate Components**: During migration, you might have both old and new components. Make sure you're importing from the correct location.

## Additional Resources

- See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for a detailed overview of the new structure
- See example components and screens for reference implementation

## Timeline

- Phase 1: Migrate core components and set up new structure
- Phase 2: Migrate screens to the new pattern (Current)
- Phase 3: Migrate all remaining components and screens
- Phase 4: Remove old files and clean up legacy code 