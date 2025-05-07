import { router } from "expo-router";
import { Alert } from "react-native";
import { auth } from "./firebase/firebase-config";
import { checkActionCode, applyActionCode } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "./firebase/firebase-config";

export const handleDeepLink = async (url: string) => {
  console.log("Deep link received:", url);

  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    // Check for password reset links - typical format: /reset-password?oobCode=xyz
    if (path.includes("reset-password") || path.includes("resetPassword")) {
      const oobCode = searchParams.get("oobCode") || searchParams.get("code");

      if (oobCode) {
        console.log("Password reset code detected:", oobCode);
        // Navigate to the reset password screen with the code
        router.push({
          pathname: "/reset-password",
          params: { oobCode },
        });
        return;
      }
    }

    // Check for email verification links
    if (path.includes("verify-email") || path.includes("verifyEmail")) {
      const oobCode = searchParams.get("oobCode") || searchParams.get("code");

      if (oobCode) {
        console.log("Email verification code detected:", oobCode);
        
        try {
          await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);

          if (auth.currentUser) {
            await updateDoc(doc(firestore, "users", auth.currentUser.uid), {
              isEmailVerified: true,
              updatedAt: new Date(),
            });
          }

          Alert.alert(
            "Success",
            "Email verified successfully. You can now log in."
          );
        } catch (error: any) {
          Alert.alert("Error", error.message || "Failed to verify email");
        }
        
        router.replace("/login");
      }
    }

    // Handle other types of deep links here
    console.log("Unhandled deep link path:", path);
  } catch (error) {
    console.error("Error handling deep link:", error);
  }
}; 