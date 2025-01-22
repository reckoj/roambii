import { View, Text } from "react-native";
import React from "react";
import { useLocalSearchParams } from "expo-router";

const AgentPackages = () => {
  const { id } = useLocalSearchParams();
  return (
    <View>
      <Text>Package [id]</Text>
    </View>
  );
};

export default AgentPackages;
