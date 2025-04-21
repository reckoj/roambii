// import React, { useEffect } from "react";
// import { View, Text, ActivityIndicator } from "react-native";
// import { router, useLocalSearchParams } from "expo-router";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { useGlobalContext } from "@/lib/global-provider";

// /**
//  * A screen to handle OAuth callback
//  * This screen should be redirected to after OAuth login
//  */
// export default function AuthCallback() {
//   const params = useLocalSearchParams();
//   const { refetch } = useGlobalContext();

//   // Log params for debugging
//   useEffect(() => {
//     console.log("[Auth Callback] Received params:", params);

//     // Refresh user context and redirect
//     const processAuth = async () => {
//       try {
//         await refetch();
//         // Redirect to home after authentication
//         router.replace("/");
//       } catch (error) {
//         console.error("[Auth Callback] Error processing auth:", error);
//         router.replace("/login");
//       }
//     };

//     processAuth();
//   }, []);

//   return (
//     <SafeAreaView className="flex-1 bg-white">
//       <View className="flex-1 items-center justify-center">
//         <ActivityIndicator size="large" color="#1ABC9C" />
//         <Text className="mt-4 text-gray-600 font-rubik">
//           Completing sign in...
//         </Text>
//       </View>
//     </SafeAreaView>
//   );
// }
