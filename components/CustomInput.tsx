import { TextInput, KeyboardTypeOptions, StyleSheet } from "react-native";

interface CustomInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  height?: number;
  editable?: boolean;
}

const CustomInput: React.FC<CustomInputProps> = ({
  value,
  onChangeText,
  placeholder = "",
  keyboardType = "default",
  secureTextEntry = false,
  height,
  editable = false,
}) => {
  return (
    <TextInput
      style={[styles.input, height ? { height } : {}]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
      multiline={!!height}
      editable
    />
  );
};

export default CustomInput;

const styles = StyleSheet.create({
  input: {
    height: 48, // ✅ Default height
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFF",
  },
});
