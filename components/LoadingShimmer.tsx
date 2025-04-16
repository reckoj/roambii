import React, { useEffect } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ShimmerEffectProps {
  width: number;
  height: number;
  style?: ViewStyle;
}

const ShimmerEffect: React.FC<ShimmerEffectProps> = ({
  width,
  height,
  style,
}) => {
  // Animation value for the shimmer effect
  const shimmerAnimated = new Animated.Value(0);

  // Start the animation when component mounts
  useEffect(() => {
    const startShimmerAnimation = () => {
      Animated.loop(
        Animated.timing(shimmerAnimated, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        })
      ).start();
    };

    startShimmerAnimation();

    // Clean up animation when component unmounts
    return () => {
      shimmerAnimated.stopAnimation();
      shimmerAnimated.setValue(0);
    };
  }, []);

  // Interpolate the animation value to create the shimmer effect
  const shimmerTranslate = shimmerAnimated.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={[styles.shimmerContainer, { width, height }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX: shimmerTranslate }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.1)",
            "rgba(255,255,255,0.3)",
            "rgba(255,255,255,0.1)",
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  shimmerContainer: {
    backgroundColor: "#E0E0E0",
    overflow: "hidden",
    position: "relative",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    flex: 1,
  },
});

export default ShimmerEffect;
