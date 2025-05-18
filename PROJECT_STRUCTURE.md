# Roambii Project Structure

## Directory Structure

```
roambii/
├── app/                  # Main app directory
│   ├── components/       # UI Components organized by feature
│   │   ├── common/       # Reusable/shared components
│   │   ├── agents/       # Agent-related components
│   │   ├── auth/         # Authentication components
│   │   ├── booking/      # Booking-related components
│   │   ├── chat/         # Chat components
│   │   ├── home/         # Home screen components
│   │   └── itinerary/    # Itinerary components
│   ├── screens/          # Screen components organized by feature
│   │   ├── auth/         # Authentication screens (login, register, etc.)
│   │   ├── booking/      # Booking-related screens
│   │   ├── agent/        # Agent management screens
│   │   ├── package/      # Package management screens
│   │   ├── search/       # Search functionality screens
│   │   ├── user/         # User profile screens
│   │   ├── flight/       # Flight information screens
│   │   └── common/       # General utility screens
│   └── (root)/           # Root screens and tabs
├── assets/               # Static assets like images, fonts
├── constants/            # Constants, theme definitions, etc.
├── lib/                  # Non-UI code
│   ├── services/         # API services
│   ├── hooks/            # Custom hooks
│   ├── context/          # Context providers
│   ├── utils/            # Utility functions
│   ├── redux/            # Redux store, slices, etc.
│   └── firebase/         # Firebase configuration
└── components/           # Legacy components (to be migrated)
```

## Import Guidelines

Use absolute imports with the `@/` prefix for cleaner imports:

```javascript
// Good
import { RecommendedAgents } from '@/app/components/agents';
import { getAllAgents } from '@/lib/services';
import { LoginScreen } from '@/app/screens/auth';

// Avoid
import RecommendedAgents from '../../../../app/components/agents/RecommendedAgents';
import { getAllAgents } from '../../../lib/agent-service';
import LoginScreen from '../../app/login';
```

## Component Organization

- **Feature-based**: Components are organized by feature (agents, booking, etc.)
- **Common**: Shared components used across multiple features
- **Index files**: Each directory has an index.ts file exporting its components

## Screen Organization

Screens follow the same feature-based organization principle:
- **Feature-specific screens**: Grouped by their primary feature/function
- **Single entry point**: All screens are exported through a central index.ts file
- **Naming convention**: Consistent naming with 'Screen' suffix (e.g., LoginScreen)

## Service Organization

All services are exported from the central services directory for easier imports.

## Migration Plan

1. Move components to their appropriate directories
2. Move screens to their feature directories in app/screens/
3. Update import paths
4. Use the new structure for all new components and screens 