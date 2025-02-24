import images from "@/constants/images";
import React, { useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Image,
  ImageSourcePropType,
  SafeAreaView,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";

interface LoadingScreenProps {
  onComplete: () => void;
  gifSource?: ImageSourcePropType;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Set timeout for auto-completion
    const timer = setTimeout(() => {
      // Fade out animation before completing
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onComplete());
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete, fadeAnim]);

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          opacity: fadeAnim,
        },
        styles.container,
      ]}
    >
      <View className="w-full h-96 justify-center items-center">
        <Image
          source={images.pudgy}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
      <Text className="mt-5 text-xl font-rubik text-text">
        You're All Set for Your Next Adventure!
      </Text>
      <Text className="mt-2 text-lg text-white">
        {" "}
        We're getting you ready to explore...
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#7ad3ff",
  },
  title: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  gifContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  gif: {
    width: "100%",
    height: "100%",
  },
});

export default LoadingScreen;
