import { View, Text, FlatList, ActivityIndicator } from "react-native";
import React, { useEffect } from "react";
import { useAppwrite } from "@/lib/useAppwrite";
import { featuredPackages, getAllPackages } from "@/lib/appwrite";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/Cards";
import NoResults from "@/components/NoResults";
import CustomHeader from "@/components/HeaderComponent";

const Featured: React.FC = () => {
  const params = useLocalSearchParams<{ query?: string; filter?: string }>();
  const { data: latestProperties, loading: latestPropertiesLoading } =
    useAppwrite({
      fn: featuredPackages,
    });

  const {
    data: properties,
    refetch,
    loading,
  } = useAppwrite({
    fn: getAllPackages,
    params: {
      filter: params.filter!,
      query: params.query!,
      limit: 6,
    },
    skip: true,
  });

  useEffect(() => {
    refetch({
      filter: params.filter!,
      query: params.query!,
      limit: 6,
    });
  }, [params.filter, params.query]);

  const handleCardPress = (id: string): void =>
    router.push(`/properties/${id}`);

  return (
    <View className="flex-1">
      {/* Custom Header Component - handling safe area automatically */}
      <CustomHeader title="Featured Packages" handleSafeArea={true} />

      {/* Main content with white background */}
      <View className="flex-1 bg-white">
        <View className="px-5">
          <View className="my-5">
            {latestPropertiesLoading ? (
              <ActivityIndicator size="large" color="#1ABC9C" />
            ) : !latestProperties || latestProperties.length === 0 ? (
              <NoResults />
            ) : (
              <FlatList
                data={latestProperties}
                renderItem={({ item }) => (
                  <View
                    className={`${
                      latestProperties.length === 1
                        ? "w-[48%] self-center"
                        : "w-[48%]"
                    }`}
                  >
                    <Card
                      item={item}
                      onPress={() => handleCardPress(item.$id)}
                    />
                  </View>
                )}
                keyExtractor={(item) => item.$id}
                numColumns={latestProperties.length === 1 ? 1 : 2}
                columnWrapperStyle={
                  latestProperties.length > 1 ? { gap: 20 } : undefined
                }
                contentContainerStyle={{ paddingBottom: 56 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export default Featured;
