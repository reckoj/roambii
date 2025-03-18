import {
  FlatList,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [refreshing, setRefreshing] = useState(false); // ✅ For pull-to-refresh
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const { data: featured } = useAppwrite({
    fn: featuredPackages,
  });

  // ✅ Initial Fetch (Only Runs Once)
  useEffect(() => {
    if (packages.length === 0) {
      fetchPackages(0, true);
    }
  }, []);

  // ✅ Fetch Packages (Handles Pagination)
  const fetchPackages = async (newOffset = 0, reset = false) => {
    if (reset) {
      setLoading(true);
      setPackages([]); // ✅ Reset packages on refresh
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

    setPackages((prev) => {
      const existingIds = new Set(prev.map((pkg) => pkg.$id));
      const filteredNewPackages = newPackages.filter(
        (pkg) => !existingIds.has(pkg.$id)
      );

      return reset ? newPackages : [...prev, ...filteredNewPackages];
    });

    setOffset(newOffset + 6);
    setLoading(false);
    setLoadingMore(false);
  };

  // ✅ Load More Data When Reaching Bottom
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPackages(offset);
    }
  };

  // ✅ Pull-to-Refresh Function
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPackages(0, true).then(() => setRefreshing(false));
  }, []);

  const handleCardPress = (id: string) => router.push(`/properties/${id}`);

  return (
    <>
      {!isAgent ? (
        <SafeAreaView className="flex-1 bg-white">
          <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />

          {/* ✅ FlatList with Pull-to-Refresh */}
          <FlatList
            data={packages}
            numColumns={2}
            renderItem={({ item }) => (
              <View className="w-[48%] p-2">
                <Card item={item} onPress={() => handleCardPress(item.$id)} />
              </View>
            )}
            keyExtractor={(item) => item.$id}
            contentContainerClassName="pb-32"
            columnWrapperClassName="flex gap-6"
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            } // ✅ Enables pull-to-refresh
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

                {/* ✅ Featured Packages */}
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

                  {featured?.length === 0 ? (
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
                      keyExtractor={(item, index) => `${item.$id}-${index}`}
                      horizontal
                      bounces={false}
                      showsHorizontalScrollIndicator={false}
                      contentContainerClassName="flex gap-5 mt-5"
                    />
                  )}
                </View>

                {/* ✅ Recommended Agents */}
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
