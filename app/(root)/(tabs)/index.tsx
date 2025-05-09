import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  FlatList,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Animated,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import images from "@/constants/images";
import NoResults from "@/components/NoResults";
import { FeaturedCard } from "@/components/Cards";
import { useGlobalContext } from "@/lib/global-provider";
import RecommendedAgents from "@/components/RecommendedAgents";
import Bookings from "@/app/bookings";
import { Calendar, Home, MapPin, Heart, SearchIcon } from "lucide-react-native";

// Redux imports
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFeaturedPackagesAsync,
  fetchPackagesAsync,
  setFilter,
  setQuery,
} from "@/lib/redux/slices/packageSlice";
import { RootState, AppDispatch } from "@/lib/redux/store/store";

const { width } = Dimensions.get("window");

const HEADER_MAX_HEIGHT = 140;
const HEADER_MIN_HEIGHT = 120;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const getGreeting = () => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return "Good Morning";
  else if (currentHour >= 12 && currentHour < 18) return "Good Afternoon";
  return "Good Evening";
};

// Define theme colors
const COLORS = {
  primary: "#1ABC9C",
  primaryLight: "#36d6ba",
  secondary: "#D9D9D9",
  background: "#FFFFFF",
  cardBackground: "#F9FAFC",
  text: "#333333",
  textLight: "#8A8D9F",
  white: "#FFFFFF",
  divider: "#EEEEEE",
};

const HomeScreen = () => {
  const { rawUser, isAgent } = useGlobalContext();
  const greeting = getGreeting();
  const dispatch = useDispatch<AppDispatch>();

  // Redux selectors
  const {
    packages,
    featuredPackages,
    loading,
    loadingMore,
    hasMore,
    offset,
    filter,
    query,
  } = useSelector((state: RootState) => state.packages);

  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList>(null);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const lastLoadMoreTime = useRef(0);

  // Initial Fetch
  useEffect(() => {
    if (packages.length === 0) {
      dispatch(fetchPackagesAsync({ limit: 6, offset: 0, reset: true }));
    }
    dispatch(fetchFeaturedPackagesAsync());

    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [dispatch]);

  // Load More Data When Reaching Bottom
  const handleLoadMore = useCallback(() => {
    const now = Date.now();
    if (
      !loadingMore && 
      hasMore && 
      !refreshing && 
      !isScrolling.current &&
      now - lastLoadMoreTime.current > 1000 // Prevent multiple loads within 1 second
    ) {
      lastLoadMoreTime.current = now;
      dispatch(
        fetchPackagesAsync({
          filter,
          query,
          limit: 6,
          offset,
          reset: false,
        })
      );
    }
  }, [dispatch, loadingMore, hasMore, refreshing, filter, query, offset]);

  // Pull-to-Refresh Function
  const handleRefresh = useCallback(() => {
    if (!refreshing) {
      setRefreshing(true);
      Promise.all([
        dispatch(
          fetchPackagesAsync({
            filter,
            query,
            limit: 6,
            offset: 0,
            reset: true,
          })
        ),
        dispatch(fetchFeaturedPackagesAsync()),
      ]).finally(() => {
        setRefreshing(false);
      });
    }
  }, [dispatch, filter, query, refreshing]);

  // Handle scroll events
  const handleScroll = useCallback(
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      {
        useNativeDriver: true,
        listener: () => {
          isScrolling.current = true;
          if (scrollTimeout.current) {
            clearTimeout(scrollTimeout.current);
          }
          scrollTimeout.current = setTimeout(() => {
            isScrolling.current = false;
          }, 200); // Increased debounce time
        },
      }
    ),
    []
  );

  const handleCardPress = (id: string) => router.push(`/properties/${id}`);

  // Animated header values
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: "clamp",
  });

  const headerBackgroundOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0.1, 0.2],
    extrapolate: "clamp",
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0.6, 0.2, 0],
    extrapolate: "clamp",
  });

  const headerContentOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  const headerContentTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -50],
    extrapolate: "clamp",
  });

  // Custom render functions
  const renderFeaturedCard = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.featuredCardContainer}>
      <FeaturedCard item={item} onPress={() => handleCardPress(item.id)} />
    </View>
  );

  const renderPackageCard = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.packageCardContainer}>
      <TouchableOpacity
        style={styles.packageCard}
        activeOpacity={0.9}
        onPress={() => handleCardPress(item.id)}
      >
        <View style={styles.cardImageContainer}>
          <Image
            source={{
              uri: item.image || "https://via.placeholder.com/300",
            }}
            style={styles.cardImage}
          />
          <TouchableOpacity style={styles.favoriteButton}>
            <Heart size={16} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.priceTag}>
            <Text style={styles.priceText}>${item.price || 0}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {item.name || "Unnamed Property"}
          </Text>

          <View style={styles.locationRow}>
            <MapPin size={12} color="#95A5A6" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.type || "Accommodation"}
            </Text>
          </View>

          <View style={styles.featuresRow}>
            {item.bedrooms && (
              <View style={styles.featureItem}>
                <Text style={styles.featureValue}>{item.bedrooms}</Text>
                <Text style={styles.featureLabel}>Beds</Text>
              </View>
            )}

            {item.bathrooms && (
              <View style={styles.featureItem}>
                <Text style={styles.featureValue}>{item.bathrooms}</Text>
                <Text style={styles.featureLabel}>Baths</Text>
              </View>
            )}

            {item.guestAmount && (
              <View style={styles.featureItem}>
                <Text style={styles.featureValue}>{item.guestAmount}</Text>
                <Text style={styles.featureLabel}>Guests</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = ({
    title,
    onSeeAll,
  }: {
    title: string;
    onSeeAll?: () => void;
  }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAllButton}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderQuickAction = ({
    icon,
    title,
    onPress,
  }: {
    icon: React.ReactNode;
    title: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickActionIcon}>{icon}</View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  if (isAgent) {
    return <Bookings />;
  }

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle="light-content"
      />

      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.headerBackground,
            { opacity: headerBackgroundOpacity },
          ]}
        />

        <Animated.View
          style={[styles.headerImageContainer, { opacity: imageOpacity }]}
        >
          <Image
            source={images.homeImage2}
            style={styles.headerImage}
            resizeMode="cover"
          />
        </Animated.View>

        <SafeAreaView style={styles.headerContent}>
          <View style={styles.topNav}>
            <View style={styles.userContainer}>
              <Image
                source={{
                  uri: rawUser?.avatar || "https://via.placeholder.com/40",
                }}
                style={styles.userAvatar}
              />
              <Animated.View
                style={{
                  opacity: headerContentOpacity,
                  transform: [{ translateY: headerContentTranslate }],
                }}
              >
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.userName}>
                  {rawUser?.name?.split(" ")[0] || ""}
                </Text>
              </Animated.View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.searchBar}
                onPress={() => router.push("/search")}
              >
                <SearchIcon size={24} color="#1ABC9C" />
                <Text style={styles.searchText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Main Content */}
      <Animated.FlatList
        ref={listRef}
        data={packages}
        numColumns={2}
        renderItem={renderPackageCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: HEADER_MAX_HEIGHT },
        ]}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.columnWrapper}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1ABC9C"
            colors={["#1ABC9C"]}
            progressViewOffset={HEADER_MAX_HEIGHT}
            progressBackgroundColor="rgba(255,255,255,0.8)"
          />
        }
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
              {renderQuickAction({
                icon: <Calendar size={18} color="#1ABC9C" />,
                title: "My Bookings",
                onPress: () => router.push("/userBookings"),
              })}
            </View>

            {/* Featured Section */}
            {renderSectionHeader({
              title: "Featured",
              onSeeAll: () => router.push("/featured"),
            })}

            <View style={styles.featuredContainer}>
              {loading && featuredPackages.length === 0 ? (
                <ActivityIndicator
                  size="large"
                  color="#1ABC9C"
                  style={styles.loader}
                />
              ) : featuredPackages.length === 0 ? (
                <NoResults />
              ) : (
                <FlatList
                  data={featuredPackages}
                  renderItem={renderFeaturedCard}
                  keyExtractor={(item) => item.id}
                  horizontal
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredList}
                  ItemSeparatorComponent={() => (
                    <View style={styles.featuredCardSeparator} />
                  )}
                />
              )}
            </View>

            {/* Recommended Agents Section */}
            {renderSectionHeader({ title: "Recommended Agents" })}
            <View style={styles.agentsContainer}>
              <RecommendedAgents />
            </View>

            {/* All Packages Section */}
            {renderSectionHeader({ title: "All Packages" })}
          </View>
        )}
        ListFooterComponent={() =>
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#1ABC9C" />
              <Text style={styles.loadingMoreText}>
                Loading more packages...
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MAX_HEIGHT,
    overflow: "hidden",
    zIndex: 10,
  },
  headerBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
  },
  headerImageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerImage: {
    width: "100%",
    height: "100%",
    opacity: 0.25,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
  },
  greeting: {
    fontSize: 10,
    color: "#34495E",
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34495E",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  searchText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#95A5A6",
  },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  listHeader: {
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    backgroundColor: "#f1f1f1",
    borderRadius: 16,
    padding: 14,
    marginTop: -5,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  quickAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F9F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: "#34495E",
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#34495E",
  },
  seeAllButton: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1ABC9C",
  },
  featuredContainer: {
    marginBottom: 24,
  },
  featuredList: {
    paddingRight: 10,
  },
  featuredCardContainer: {
    marginHorizontal: 8,
  },
  featuredCardSeparator: {
    width: 16,
  },
  agentsContainer: {
    marginBottom: 24,
  },
  packageCardContainer: {
    width: "48%",
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: "#f1f1f1",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  cardImageContainer: {
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: 130,
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  priceTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(26, 188, 156, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopRightRadius: 8,
  },
  priceText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#34495E",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: "#95A5A6",
    marginLeft: 4,
  },
  featuresRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  featureItem: {
    alignItems: "center",
  },
  featureValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#34495E",
  },
  featureLabel: {
    fontSize: 10,
    color: "#95A5A6",
  },
  loader: {
    marginVertical: 20,
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#95A5A6",
  },
});
