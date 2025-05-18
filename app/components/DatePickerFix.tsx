import React, { useState } from 'react';
import { Button, Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * A cross-platform DateTimePicker that works around the RNCMaterialDatePicker error on Android
 * Use this component instead of directly importing DateTimePicker from @react-native-community/datetimepicker
 */
const DatePickerFix = (props: any) => {
  const [show, setShow] = useState(Platform.OS === 'ios');
  
  // If Android and not showing the picker, render a button to show it
  if (Platform.OS === 'android' && !show) {
    return (
      <Button 
        title={`Select ${props.mode === 'date' ? 'Date' : 'Time'}`}
        onPress={() => setShow(true)}
      />
    );
  }
  
  // For iOS or when showing on Android
  return (
    <View>
      <DateTimePicker
        {...props}
        onChange={(event, date) => {
          // Hide the picker after selection on Android
          if (Platform.OS === 'android') {
            setShow(false);
          }
          // Call the original onChange
          if (props.onChange) {
            props.onChange(event, date);
          }
        }}
      />
    </View>
  );
};

export default DatePickerFix; 