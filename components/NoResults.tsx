import React from "react";
import { View, Text, Image } from "react-native";

import images from "@/constants/images";

const NoResults = () => {
  return (
    <View style={{ flex: 1, alignItems: "center", marginVertical: 20 }}>
      <Image
        source={images.noResult}
        style={{ width: "90%", height: 320 }}
        resizeMode="contain"
      />
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#333", marginTop: 20 }}>
        No Result
      </Text>
      <Text style={{ fontSize: 16, color: "#666", marginTop: 8 }}>
        We could not find any result
      </Text>
    </View>
  );
};

export default NoResults;
