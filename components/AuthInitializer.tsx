// // components/AuthInitializer.tsx
// import React, { useEffect, useState, ReactNode } from "react";
// import { View, ActivityIndicator, Text } from "react-native";
// import { useDispatch, useSelector } from "react-redux";
// import { SplashScreen } from "expo-router";
// import { fetchCurrentUserAsync } from "@/lib/redux/slices/authSlice";
// import { RootState, AppDispatch } from "@/lib/store/store";

// // Prevent the splash screen from auto-hiding if it hasn't been handled already
// SplashScreen.preventAutoHideAsync().catch(() => {
//   /* Ignore if already prevented */
// });

// // Define the props interface with proper typing for children
// interface AuthInitializerProps {
//   children: ReactNode;
// }

// export default function AuthInitializer({ children }: AuthInitializerProps) {
//   const dispatch = useDispatch<AppDispatch>();
//   const { isLoading } = useSelector((state: RootState) => state.auth);
//   const [authChecked, setAuthChecked] = useState(false);

//   useEffect(() => {
//     // Check authentication status when the component mounts
//     const checkAuth = async () => {
//       try {
//         // Don't use unwrap here, as we just want to check auth status
//         // and we don't want it to throw errors if not authenticated
//         await dispatch(fetchCurrentUserAsync());
//       } catch (error) {
//         console.log("Not authenticated or error:", error);
//       } finally {
//         // Mark auth as checked regardless of result
//         setAuthChecked(true);
//         // Now hide the splash screen
//         SplashScreen.hideAsync().catch(console.error);
//       }
//     };

//     checkAuth();
//   }, [dispatch]);

//   // While checking auth status or loading, show a loading indicator
//   if (isLoading || !authChecked) {
//     return (
//       <View className="flex-1 justify-center items-center bg-white">
//         <ActivityIndicator size="large" color="#1ABC9C" />
//         <Text className="mt-4 text-gray-600">Setting things up...</Text>
//       </View>
//     );
//   }

//   // Auth check completed, render app
//   return <>{children}</>;
// }
