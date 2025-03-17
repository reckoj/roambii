import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import Search from "@/components/Search";
import NoResults from "@/components/NoResults";
import { Card, FeaturedCard } from "@/components/Cards";
import { useAppwrite } from "@/lib/useAppwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { featuredPackages, getAllPackages } from "@/lib/appwrite";
import RecommendedAgents from "@/components/RecommendedAgents";
import Bookings from "@/app/bookings";

const getGreeting = () => {
  const currentHour = new Date().getHours();

  if (currentHour < 12) return "Good Morning";
  else if (currentHour >= 12 && currentHour < 18) return "Good Afternoon";
  return "Good Evening";
};

const Home = () => {
  const { rawUser, isAgent } = useGlobalContext();
  const greeting = getGreeting();

  const params = useLocalSearchParams<{ query?: string; filter?: string }>();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const { data: featured, loading: featuredLoading } = useAppwrite({
    fn: featuredPackages,
  });

  useEffect(() => {
    fetchPackages(0, true); // ✅ Initial load of packages
  }, [params.filter, params.query]);

  const fetchPackages = async (newOffset = 0, reset = false) => {
    if (reset) {
      setLoading(true);
      setPackages([]); // ✅ Reset packages when applying filters/search
    } else {
      setLoadingMore(true);
    }

    const newPackages = await getAllPackages({
      filter: params.filter!,
      query: params.query!,
      limit: 6,
      offset: newOffset,
    });

    if (newPackages.length < 6) setHasMore(false); // ✅ Stop loading when fewer than 6 packages

    // ✅ Check for duplicates before adding new data
    setPackages((prev) => {
      const existingIds = new Set(prev.map((pkg) => pkg.$id)); // ✅ Track existing package IDs
      const filteredNewPackages = newPackages.filter(
        (pkg) => !existingIds.has(pkg.$id)
      ); // ✅ Only add new unique packages

      return reset ? newPackages : [...prev, ...filteredNewPackages]; // ✅ Prevents duplication
    });

    setOffset(newOffset + 6);
    setLoading(false);
    setLoadingMore(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPackages(offset);
    }
  };

  const handleCardPress = (id: string) => router.push(`/properties/${id}`);

  return (
    <>
      {!isAgent ? (
        <SafeAreaView className="flex-1 bg-white">
          <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />

          <FlatList
            data={packages}
            numColumns={2} // ✅ Keeps a two-column layout
            renderItem={({ item }) => (
              <View
                className={`${
                  featuredPackages.length === 1
                    ? "w-[48%] self-center"
                    : "w-[48%]"
                } p-2`}
              >
                <Card item={item} onPress={() => handleCardPress(item.$id)} />
              </View>
            )}
            keyExtractor={(item) => item.$id} // ✅ Ensures unique keys
            contentContainerClassName="pb-32"
            columnWrapperClassName={
              fetchPackages.length > 1 ? "flex gap-6" : ""
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator
                  size="large"
                  className="text-primary-300 mt-5"
                />
              ) : (
                <NoResults />
              )
            }
            onEndReached={handleLoadMore} // ✅ Triggers pagination
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" className="mt-5" />
              ) : null
            } // ✅ Fix
            ListHeaderComponent={() => (
              <View className="px-5">
                <View className="flex flex-row items-center justify-between mt-5">
                  <View className="flex flex-row">
                    <Image
                      source={{ uri: rawUser?.avatar }}
                      className="size-12 rounded-full"
                    />
                    <View className="flex flex-col items-start ml-2 justify-center">
                      <Text className="text-xs font-rubik text-black-100">
                        {greeting}
                      </Text>
                      <Text className="text-sm font-rubik text-text">
                        {rawUser?.name.split(" ")[0]}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Featured Section */}
                <View className="my-5">
                  <View className="flex flex-row items-center justify-between">
                    <Text className="text-xl font-rubik-bold text-text">
                      Featured
                    </Text>
                    <TouchableOpacity onPress={() => router.push("/featured")}>
                      <Text className="text-base font-rubik-bold text-primary-300">
                        See all
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {featuredLoading ? (
                    <ActivityIndicator
                      size="large"
                      className="text-primary-300"
                    />
                  ) : !featured || featured.length === 0 ? (
                    <NoResults />
                  ) : (
                    <FlatList
                      data={featured}
                      renderItem={({ item }) => (
                        <FeaturedCard
                          item={item}
                          onPress={() => handleCardPress(item.$id)}
                        />
                      )}
                      keyExtractor={(item, index) => `${item.$id}-${index}`} // ✅ Ensures uniqueness
                      horizontal
                      bounces={false}
                      showsHorizontalScrollIndicator={false}
                      contentContainerClassName="flex gap-5 mt-5"
                    />
                  )}
                </View>

                {/* Recommended Agents */}
                <View className="mt-4">
                  <View className="flex flex-row items-center justify-between">
                    <Text className="text-xl font-rubik-bold text-text">
                      Recommended Agents
                    </Text>
                  </View>
                  <RecommendedAgents />
                  <View className="mt-5">
                    <View className="flex flex-row items-center justify-between">
                      <Text className="text-xl font-rubik-bold text-text">
                        All Packages
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          />
        </SafeAreaView>
      ) : (
        <Bookings />
      )}
    </>
  );
};

export default Home;
