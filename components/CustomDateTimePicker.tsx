import React, { useState } from 'react';
import { View, Platform, TouchableOpacity, Text, StyleSheet } from 'react-native';
import OriginalDateTimePicker from '@react-native-community/datetimepicker';

interface DateTimePickerProps {
  value: Date;
  mode: 'date' | 'time';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  onChange: (event: any, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: any;
}

const CustomDateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  mode,
  display = 'default',
  onChange,
  minimumDate,
  maximumDate,
  style,
}) => {
  const [show, setShow] = useState(false);

  // Format the display value
  const formatDisplayValue = () => {
    if (mode === 'date') {
      return value.toLocaleDateString();
    } else {
      return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Handle the date change
  const handleChange = (event: any, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios'); // Hide picker on Android
    onChange(event, selectedDate);
  };

  if (Platform.OS === 'android') {
    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity style={styles.button} onPress={() => setShow(true)}>
          <Text style={styles.buttonText}>{formatDisplayValue()}</Text>
        </TouchableOpacity>
        
        {show && (
          <OriginalDateTimePicker
            testID="dateTimePicker"
            value={value}
            mode={mode}
            is24Hour={true}
            display={display}
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )}
      </View>
    );
  }
  
  // iOS implementation - just use the original component
  return (
    <OriginalDateTimePicker
      testID="dateTimePicker"
      value={value}
      mode={mode}
      is24Hour={true}
      display={display}
      onChange={onChange}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonText: {
    fontSize: 16,
  },
});

export default CustomDateTimePicker; 