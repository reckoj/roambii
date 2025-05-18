import React, { useState } from 'react';
import { TouchableOpacity, Text, Platform, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from 'react-native-paper';

interface DateTimePickerCustomProps {
  value: Date;
  mode: 'date' | 'time';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  onChange: (event: any, date?: Date | undefined) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

const DateTimePickerCustom: React.FC<DateTimePickerCustomProps> = ({
  value,
  mode,
  display = 'default',
  onChange,
  minimumDate,
  maximumDate,
}) => {
  const [showPicker, setShowPicker] = useState(true);

  // On Android, we need to handle the picker visibility manually
  const handleChange = (event: any, selectedDate?: Date) => {
    // Hide the picker after selection on Android
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    // Call the original onChange callback
    onChange(event, selectedDate);
  };

  // Android requires workarounds for the date picker
  if (Platform.OS === 'android' && !showPicker) {
    return (
      <Button 
        mode="outlined" 
        onPress={() => setShowPicker(true)}
        style={styles.button}
      >
        {mode === 'date' ? 'Show Date Picker' : 'Show Time Picker'}
      </Button>
    );
  }

  // For iOS, or when picker is visible on Android
  return (
    <DateTimePicker
      testID="dateTimePicker"
      value={value}
      mode={mode}
      is24Hour={true}
      display={display}
      onChange={handleChange}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: 8,
  },
});

export default DateTimePickerCustom; 