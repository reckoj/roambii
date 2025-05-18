# DateTimePicker Fix for Android

## Issue
The error `TurboModuleRegistry.getEnforcing(...): 'RNCMaterialDatePicker' could not be found` occurs on Android when using `@react-native-community/datetimepicker`. This is a common issue with React Native date pickers on Android.

## Solution
We've created a custom wrapper component that handles the platform differences between iOS and Android.

## How to Use

1. Replace your imports from `@react-native-community/datetimepicker` with imports from our custom component:

```javascript
// BEFORE
import DateTimePicker from '@react-native-community/datetimepicker';

// AFTER
import CustomDateTimePicker from '@/components/CustomDateTimePicker';
```

2. Update your DateTimePicker usage:

```jsx
// BEFORE
{showDatePicker && (
  <DateTimePicker
    value={date}
    mode="date"
    display="default"
    onChange={(event, selectedDate) => {
      setShowDatePicker(Platform.OS === 'ios');
      if (selectedDate) {
        setDate(selectedDate);
      }
    }}
  />
)}

// AFTER
<CustomDateTimePicker
  value={date}
  mode="date"
  display="default"
  onChange={(event, selectedDate) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }}
/>
```

## Benefits

- Works on both iOS and Android
- Handles the platform-specific differences automatically
- No need to manage visibility state manually
- Maintains the same API as the original component

## Additional Setup

There are a few other changes we've made to ensure compatibility:

1. Updated babel.config.js to properly resolve the module
2. Added the proper usage descriptions in iOS Info.plist
3. Created a custom wrapper component that handles Android's quirks

This should resolve the "RNCMaterialDatePicker" error and allow your date pickers to work on both platforms. 