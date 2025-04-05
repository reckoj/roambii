import React from "react";
import { Stack } from "expo-router";
import SearchScreen from "@/components/SearchScreen";

/**
 * Search Route
 */
export default function Search() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <SearchScreen />
    </>
  );
}
