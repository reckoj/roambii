// app/login.tsx
import images from "../constants/images";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { EyeClosedIcon, EyeIcon } from "lucide-react-native";

import {
  loginUserAsync,
  loginWithGoogleAsync,
  clearAuthError,
  fetchCurrentUserAsync,
} from "../lib/redux/slices/authSlice";
import { RootState, AppDispatch } from "../lib/redux/store/store";

export default function Login() {
  const [renderError, setRenderError] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isLoading, isAuthenticated, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  // Memoize auth state to prevent unnecessary re-renders
  const authState = useMemo(() => ({ isLoading, isAuthenticated, error }), [isLoading, isAuthenticated, error]);

  // Add debug info when component mounts (only once)
  useEffect(() => {
    try {
      // Try to fetch current user on mount to make sure auth is properly initialized
      dispatch(fetchCurrentUserAsync())
        .unwrap()
        .then((user) => {
          if (user) {
            console.log("✅ User fetched successfully");
          }
        })
        .catch((err) => {
          console.log("ℹ️ No current user");
        });
    } catch (error) {
      console.error("❌ useEffect mount error:", error);
      setRenderError(error instanceof Error ? error.message : "Unknown mount error");
    }
  }, [dispatch]);

  // Handle authentication redirect
  useEffect(() => {
    try {
      if (isAuthenticated) {
        router.replace("/(root)/(tabs)");
      }
    } catch (error) {
      console.error("❌ useEffect redirect error:", error);
      setRenderError(error instanceof Error ? error.message : "Unknown redirect error");
    }
  }, [isAuthenticated, router]);

  // Show error alerts when they occur
  useEffect(() => {
    try {
      if (error) {
        Alert.alert("Login Failed", "Invalid credentials");
        dispatch(clearAuthError());
      }
    } catch (err) {
      console.error("❌ useEffect error alert error:", err);
    }
  }, [error, dispatch]);

  // Helper function to extract userId from error messages
  const extractUserIdFromError = useCallback((errorMsg: string): string | null => {
    const match = errorMsg.match(/userId:\s*([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }, []);

  const handleLogin = useCallback(async () => {
    try {
      if (!email || !password) {
        Alert.alert("Error", "Please enter both email and password");
        return;
      }

      setLocalLoading(true);
      const resultAction = await dispatch(loginUserAsync({ email, password }));

      // Check if we have a rejected action with verification requirement
      if (
        loginUserAsync.rejected.match(resultAction) &&
        resultAction.payload &&
        typeof resultAction.payload === "string" &&
        resultAction.payload.includes("verify your email")
      ) {
        // Extract userId if available in the error message
        const userId = extractUserIdFromError(resultAction.payload);

        if (userId) {
          router.push({
            pathname: "/verificationScreen",
            params: {
              email: email,
              userId: userId,
            },
          });
        } else {
          Alert.alert(
            "Verification Required",
            "Please verify your email before logging in. Check your inbox for the verification link."
          );
        }
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setRenderError(error instanceof Error ? error.message : "Unknown login error");
    } finally {
      setLocalLoading(false);
    }
  }, [email, password, dispatch, router, extractUserIdFromError]);

  const handleLoginGoogle = useCallback(async () => {
    try {
      setLocalLoading(true);
      await dispatch(loginWithGoogleAsync());
      // Redirect will handle navigation
    } catch (error) {
      console.error("❌ Google login error:", error);
      setRenderError(error instanceof Error ? error.message : "Unknown Google login error");
    } finally {
      setLocalLoading(false);
    }
  }, [dispatch]);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword]);

  const handleForgotPassword = useCallback(() => {
    router.push("/forgot-password");
  }, [router]);

  const handleSignUp = useCallback(() => {
    router.push("/register");
  }, [router]);

  // Show error screen if rendering failed
  if (renderError) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', padding: 20}}>
        <Text style={{fontSize: 18, fontWeight: 'bold', color: 'red', marginBottom: 10}}>
          Login Screen Error
        </Text>
        <Text style={{fontSize: 14, color: '#333', textAlign: 'center'}}>
          {renderError}
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 20,
            backgroundColor: '#1ABC9C',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8
          }}
          onPress={() => setRenderError(null)}
        >
          <Text style={{color: 'white', fontSize: 16}}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading screen while redirecting
  if (isAuthenticated) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white'}}>
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text style={{marginTop: 16, color: '#666'}}>Redirecting...</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{flex: 1}}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
          <View style={{flex: 1, paddingHorizontal: 24, paddingTop: 40}}>
            <View style={{alignItems: 'center', marginBottom: 40}}>
              <Image
                source={images.roambiiLogo}
                style={{width: '100%', height: 160, resizeMode: 'contain'}}
              />
            </View>

            {/* Input Fields */}
            <View>
              <Text style={{color: '#333', fontFamily: 'Rubik-Medium', fontSize: 16}}>Email</Text>
              <TextInput
                style={{
                  height: 48,
                  paddingHorizontal: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  fontSize: 16
                }}
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter your email"
              />

              <View style={{marginBottom: 16}}>
                <Text style={{color: '#333', fontFamily: 'Rubik-Medium', fontSize: 16}}>Password</Text>
                <View style={{position: 'relative'}}>
                  <TextInput
                    style={{
                      height: 48,
                      paddingHorizontal: 16,
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRadius: 8,
                      fontSize: 16,
                      paddingRight: 48
                    }}
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    placeholder="Enter your password"
                  />
                  <TouchableOpacity
                    style={{position: 'absolute', right: 16, top: 12}}
                    onPress={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeClosedIcon color="#1ABC9C" size={22} />
                    ) : (
                      <EyeIcon color="#1ABC9C" size={22} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={{alignItems: 'flex-end'}}
              onPress={handleForgotPassword}
            >
              <Text style={{color: '#333', fontFamily: 'Rubik-Medium', fontSize: 16}}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={{
                height: 48,
                marginTop: 24,
                marginBottom: 16,
                backgroundColor: '#1ABC9C',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onPress={handleLogin}
              disabled={isLoading || localLoading}
            >
              {isLoading || localLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={{fontSize: 18, fontFamily: 'Rubik-Bold', color: 'white'}}>
                  Log In
                </Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={{flexDirection: 'row', justifyContent: 'center', marginTop: 24}}>
              <Text style={{color: '#6b7280', fontSize: 16}}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={{color: '#10b981', fontSize: 16}}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
