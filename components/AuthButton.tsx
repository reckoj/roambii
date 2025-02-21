import { TouchableOpacity, Text } from "react-native";

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

const AuthButton: React.FC<AuthButtonProps> = ({ title, onPress, disabled = false }) => {
  return (
    <TouchableOpacity
      className={`h-12 mt-6 mb-4 bg-primary-300 rounded-md items-center justify-center ${
        disabled ? "opacity-50" : ""
      }`}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className="text-lg font-rubik-bold text-white ml-2">{title}</Text>
    </TouchableOpacity>
  );
};

export default AuthButton;
