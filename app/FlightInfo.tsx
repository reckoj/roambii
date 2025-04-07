import { View, Text, TouchableOpacity, Platform, Image } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import CustomInput from "@/components/CustomInput";
import icons from "@/constants/icons";

interface FlightInformationProps {
  formData: {
    departingFrom?: string;
    arrivingTo?: string;
    returningFrom?: string;
    returningTo?: string;
    departureDate?: string;
    returnDate?: string;
  };
  handleChange: (key: string, value: string) => void;
}

const FlightInformation: React.FC<FlightInformationProps> = ({
  formData,
  handleChange,
}) => {
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);

  return (
    <View className="mt-6">
      <Text className="text-xl font-bold mb-2">Flight Information</Text>

      {/* Departure & Arrival */}
      <View className="flex flex-row gap-4">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-700">
            Departure From
          </Text>
          <CustomInput
            value={formData.departingFrom || ""}
            onChangeText={(text) => handleChange("departingFrom", text)}
          />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-700">
            Arrival To
          </Text>
          <CustomInput
            value={formData.arrivingTo || ""}
            onChangeText={(text) => handleChange("arrivingTo", text)}
          />
        </View>
      </View>

      {/* Return From & Return To */}
      <View className="flex flex-row gap-4 mt-4">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-700">
            Return From
          </Text>
          <CustomInput
            value={formData.returningFrom || ""}
            onChangeText={(text) => handleChange("returningFrom", text)}
          />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-700">Return To</Text>
          <CustomInput
            value={formData.returningTo || ""}
            onChangeText={(text) => handleChange("returningTo", text)}
          />
        </View>
      </View>

      {/* Departure Date */}
      <View className="flex flex-row gap-4 mt-4">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-700">
            Departure Date
          </Text>
          <TouchableOpacity
            onPress={() => setShowDeparturePicker(true)}
            className="relative"
          >
            <CustomInput
              value={formData.departureDate || ""}
              onChangeText={() => {}}
              editable={false}
            />
            <Image
              source={icons.calendar}
              className="absolute right-3 top-4 size-6"
            />
          </TouchableOpacity>
          {showDeparturePicker && (
            <DateTimePicker
              value={
                formData.departureDate
                  ? new Date(formData.departureDate)
                  : new Date()
              }
              mode="date"
              display="default"
              onChange={(event, date) => {
                if (date)
                  handleChange(
                    "departureDate",
                    date.toISOString().split("T")[0]
                  );
                setShowDeparturePicker(false);
              }}
            />
          )}
        </View>

        {/* Return Date */}
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-700">
            Return Date
          </Text>
          <TouchableOpacity
            onPress={() => setShowReturnPicker(true)}
            className="relative"
          >
            <CustomInput
              value={formData.returnDate || ""}
              onChangeText={() => {}}
              editable={false}
            />
            <Image
              source={icons.calendar}
              className="absolute right-3 top-4 size-6"
            />
          </TouchableOpacity>
          {showReturnPicker && (
            <DateTimePicker
              value={
                formData.returnDate ? new Date(formData.returnDate) : new Date()
              }
              mode="date"
              display="default"
              onChange={(event, date) => {
                if (date)
                  handleChange("returnDate", date.toISOString().split("T")[0]);
                setShowReturnPicker(false);
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default FlightInformation;
