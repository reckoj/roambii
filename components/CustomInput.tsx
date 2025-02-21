import { TextInput, KeyboardTypeOptions } from "react-native";

interface CustomInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
}

const CustomInput: React.FC<CustomInputProps> = ({
  value,
  onChangeText,
  placeholder = "",
  keyboardType = "default",
  secureTextEntry = false,
}) => {
  return (
    <TextInput
      className="h-12 px-4 mb-4 border border-gray-300 rounded-md"
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
    />
  );
};

export default CustomInput;
