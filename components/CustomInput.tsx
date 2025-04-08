import React from "react";
import {
  TextInput,
  KeyboardTypeOptions,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from "react-native";

interface CustomInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  height?: number;
  editable?: boolean;
  containerStyle?: ViewStyle;
  style?: TextStyle;
  multiline?: boolean;
  numberOfLines?: number;
  textAlignVertical?: "auto" | "top" | "bottom" | "center";
}

const CustomInput: React.FC<CustomInputProps> = ({
  value,
  onChangeText,
  placeholder = "",
  keyboardType = "default",
  secureTextEntry = false,
  height,
  editable = true,
  containerStyle,
  style,
  multiline = false,
  numberOfLines,
  textAlignVertical,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[styles.input, height ? { height } : {}, style]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        multiline={multiline || !!height}
        numberOfLines={numberOfLines}
        editable={editable}
        textAlignVertical={textAlignVertical}
        {...props}
      />
    </View>
  );
};

export default CustomInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    height: 48, // Default height
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFF",
  },
});
