import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/lib/redux/store/store";
import { useGlobalContext } from "@/lib/global-provider";
import { updateUserAsync } from "@/lib/redux/slices/authSlice";
import { ChevronLeft, Calendar, Save } from "lucide-react-native";
import CustomHeader from "@/components/HeaderComponent";
import DateTimePicker from '@react-native-community/datetimepicker';
import { User } from "@/lib/firebase/models";

// Interface for legal information
interface LegalInformation {
  fullName: string;
  dateOfBirth: Date | null;
  email: string;
  phoneNumber: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  passportNumber?: string;
  passportExpiryDate: Date | null;
}

const LegalInformationScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { rawUser, refetch } = useGlobalContext();
  
  // State for form data
  const [legalInfo, setLegalInfo] = useState<LegalInformation>({
    fullName: "",
    dateOfBirth: null,
    email: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    passportNumber: "",
    passportExpiryDate: null,
  });
  
  // State for UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDOBPicker, setShowDOBPicker] = useState(false);
  const [showPassportExpiryPicker, setShowPassportExpiryPicker] = useState(false);
  
  // Load existing data if available
  useEffect(() => {
    const typedUser = rawUser as User | null;
    
    if (typedUser?.legalInformation) {
      // Convert string dates back to Date objects
      const legalInfoWithDates: LegalInformation = {
        fullName: typedUser.legalInformation.fullName || "",
        email: typedUser.legalInformation.email || "",
        phoneNumber: typedUser.legalInformation.phoneNumber || "",
        address: typedUser.legalInformation.address || "",
        city: typedUser.legalInformation.city || "",
        state: typedUser.legalInformation.state || "",
        zipCode: typedUser.legalInformation.zipCode || "",
        country: typedUser.legalInformation.country || "",
        passportNumber: typedUser.legalInformation.passportNumber || "",
        dateOfBirth: typedUser.legalInformation.dateOfBirth ? new Date(typedUser.legalInformation.dateOfBirth) : null,
        passportExpiryDate: typedUser.legalInformation.passportExpiryDate ? new Date(typedUser.legalInformation.passportExpiryDate) : null,
      };
      setLegalInfo(legalInfoWithDates);
    } else if (typedUser) {
      // Pre-fill with basic user data if available
      setLegalInfo(prev => ({
        ...prev,
        fullName: typedUser.name || "",
        email: typedUser.email || "",
      }));
    }
  }, [rawUser]);
  
  // Handle text input changes
  const handleInputChange = (field: keyof LegalInformation, value: string) => {
    setLegalInfo(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle date changes
  const handleDateChange = (event: any, selectedDate: Date | undefined, dateField: 'dateOfBirth' | 'passportExpiryDate') => {
    const currentDate = selectedDate || legalInfo[dateField] || new Date();
    
    if (dateField === 'dateOfBirth') {
      setShowDOBPicker(Platform.OS === 'ios');
    } else {
      setShowPassportExpiryPicker(Platform.OS === 'ios');
    }
    
    setLegalInfo(prev => ({ ...prev, [dateField]: currentDate }));
  };
  
  // Form validation
  const isFormValid = () => {
    return (
      legalInfo.fullName.trim().length > 0 &&
      legalInfo.email.trim().length > 0 &&
      legalInfo.phoneNumber.trim().length > 0 &&
      legalInfo.dateOfBirth !== null
    );
  };
  
  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return "Select Date";
    return date.toLocaleDateString();
  };
  
  // Submit legal information
  const handleSubmit = async () => {
    const typedUser = rawUser as User | null;
    
    if (!typedUser?.id) {
      Alert.alert("Error", "User information missing. Please log in again.");
      return;
    }
    
    if (!isFormValid()) {
      Alert.alert(
        "Incomplete Information",
        "Please fill in all required fields marked with *"
      );
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Convert Date objects to strings for storage
      const legalInfoForStorage = {
        ...legalInfo,
        dateOfBirth: legalInfo.dateOfBirth ? legalInfo.dateOfBirth.toISOString() : null,
        passportExpiryDate: legalInfo.passportExpiryDate ? legalInfo.passportExpiryDate.toISOString() : null,
      };
      
      await dispatch(
        updateUserAsync({
          userId: typedUser.id,
          updates: {
            legalInformation: legalInfoForStorage
          }
        })
      ).unwrap();
      
      // Refresh user data
      await refetch();
      
      Alert.alert(
        "Success", 
        "Your legal information has been updated successfully!", 
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        "Error", 
        error.message || "Failed to update legal information"
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <CustomHeader title="Legal Information" showBackButton={true} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.sectionSubtitle}>
              This information will be shared with agents when you book packages
            </Text>
            
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name (as shown on ID) *</Text>
              <TextInput
                style={styles.input}
                value={legalInfo.fullName}
                onChangeText={(text) => handleInputChange("fullName", text)}
                placeholder="Enter your legal full name"
              />
            </View>
            
            {/* Date of Birth */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date of Birth *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDOBPicker(true)}
              >
                <Text style={styles.dateText}>
                  {formatDate(legalInfo.dateOfBirth)}
                </Text>
                <Calendar size={20} color="#8A8D9F" />
              </TouchableOpacity>
              {showDOBPicker && (
                <DateTimePicker
                  value={legalInfo.dateOfBirth || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => handleDateChange(event, date, 'dateOfBirth')}
                  maximumDate={new Date()}
                />
              )}
            </View>
            
            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={legalInfo.email}
                onChangeText={(text) => handleInputChange("email", text)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            {/* Phone Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={legalInfo.phoneNumber}
                onChangeText={(text) => handleInputChange("phoneNumber", text)}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>
            
            <Text style={[styles.sectionTitle, styles.addressTitle]}>Address Information</Text>
            
            {/* Address */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Street Address</Text>
              <TextInput
                style={styles.input}
                value={legalInfo.address}
                onChangeText={(text) => handleInputChange("address", text)}
                placeholder="Enter your street address"
              />
            </View>
            
            {/* City */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={legalInfo.city}
                onChangeText={(text) => handleInputChange("city", text)}
                placeholder="Enter your city"
              />
            </View>
            
            {/* State */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>State/Province</Text>
              <TextInput
                style={styles.input}
                value={legalInfo.state}
                onChangeText={(text) => handleInputChange("state", text)}
                placeholder="Enter your state or province"
              />
            </View>
            
            {/* Zip Code */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Zip/Postal Code</Text>
              <TextInput
                style={styles.input}
                value={legalInfo.zipCode}
                onChangeText={(text) => handleInputChange("zipCode", text)}
                placeholder="Enter your zip/postal code"
              />
            </View>
            
            {/* Country */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Country</Text>
              <TextInput
                style={styles.input}
                value={legalInfo.country}
                onChangeText={(text) => handleInputChange("country", text)}
                placeholder="Enter your country"
              />
            </View>
            
            <Text style={[styles.sectionTitle, styles.passportTitle]}>Travel Documents</Text>
            
            {/* Passport Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Passport Number</Text>
              <TextInput
                style={styles.input}
                value={legalInfo.passportNumber}
                onChangeText={(text) => handleInputChange("passportNumber", text)}
                placeholder="Enter your passport number"
              />
            </View>
            
            {/* Passport Expiry */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Passport Expiry Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowPassportExpiryPicker(true)}
              >
                <Text style={styles.dateText}>
                  {formatDate(legalInfo.passportExpiryDate)}
                </Text>
                <Calendar size={20} color="#8A8D9F" />
              </TouchableOpacity>
              {showPassportExpiryPicker && (
                <DateTimePicker
                  value={legalInfo.passportExpiryDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => handleDateChange(event, date, 'passportExpiryDate')}
                  minimumDate={new Date()}
                />
              )}
            </View>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isFormValid() || isSubmitting) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Save size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Save Information</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LegalInformationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#8A8D9F",
    marginBottom: 20,
  },
  addressTitle: {
    marginTop: 24,
    marginBottom: 10,
  },
  passportTitle: {
    marginTop: 24,
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F0F2F5",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: "#333333",
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    borderRadius: 8,
    padding: 16,
  },
  dateText: {
    fontSize: 16,
    color: "#333333",
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#1ABC9C",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  disabledButton: {
    backgroundColor: "#C4C4C4",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
}); 