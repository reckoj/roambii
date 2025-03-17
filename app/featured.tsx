import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import React, { useEffect } from "react";
import { useAppwrite } from "@/lib/useAppwrite";
import { featuredPackages, getAllPackages } from "@/lib/appwrite";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/Cards";
import NoResults from "@/components/NoResults";
import { ArrowLeft, MoveLeftIcon } from "lucide-react-native";

const Featured = () => {
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

  const handleCardPress = (id: string) => router.push(`/properties/${id}`);
  return (
    <SafeAreaView className="h-full bg-white">
      <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />
      <View className="flex flex-row items-center p-2 justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex rounded-full size-10 items-center  justify-center"
        >
          <ArrowLeft size={24} color={"#1ABC9C"} />
        </TouchableOpacity>
        <Text className="text-xl font-rubik text-text">
          Featured Properties
        </Text>
        <Text></Text>
      </View>
      <View className="px-5">
        <View className="my-5">
          {/* <Text className="text-xl font-rubik-bold text-text mb-5">
            Featured Properties
          </Text> */}

          {latestPropertiesLoading ? (
            <ActivityIndicator size="large" className="text-primary-300" />
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
                  <Card item={item} onPress={() => handleCardPress(item.$id)} />
                </View>
              )}
              keyExtractor={(item) => item.$id}
              numColumns={latestProperties.length === 1 ? 1 : 2}
              columnWrapperClassName={
                latestProperties.length > 1 ? "flex gap-5" : ""
              }
              contentContainerClassName="pb-14"
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Featured;
