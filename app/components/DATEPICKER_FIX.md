# How to Fix DateTimePicker on Android

Follow these steps to fix the `RNCMaterialDatePicker could not be found` error:

## Step 1: Use the DatePickerFix Component

Replace all imports and usages of DateTimePicker in your code:

### BEFORE:
```javascript
import DateTimePicker from '@react-native-community/datetimepicker';

// Usage
{showDatePicker && (
  <DateTimePicker
    value={date}
    mode="date"
    onChange={handleChange}
  />
)}
```

### AFTER:
```javascript
import DatePickerFix from '@/app/components/DatePickerFix';

// Usage (no need for conditional rendering on Android)
<DatePickerFix
  value={date}
  mode="date"
  onChange={handleChange}
/>
```

## That's it!

The DatePickerFix component handles:
- Platform differences between iOS and Android
- Showing/hiding the picker on Android
- Error-free operation on both platforms

No need to manage the visibility state yourself or write platform-specific code. 