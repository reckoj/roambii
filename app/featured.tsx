import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Image,
} from "react-native";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/Cards";
import NoResults from "@/components/NoResults";
import CustomHeader from "@/components/HeaderComponent";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/lib/redux/store/store";
import {
  fetchFeaturedPackagesAsync,
  fetchPackagesAsync,
} from "@/lib/redux/slices/packageSlice";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, MapPin, Heart, Star } from "lucide-react-native";

const { width, height } = Dimensions.get("window");

const Featured: React.FC = () => {
  const params = useLocalSearchParams<{ query?: string; filter?: string }>();
  const dispatch = useDispatch<AppDispatch>();

  // Get data from Redux store
  const { featuredPackages, loading } = useSelector(
    (state: RootState) => state.packages
  );

  // Fetch featured packages on component mount
  useEffect(() => {
    dispatch(fetchFeaturedPackagesAsync());
  }, [dispatch]);

  // Fetch filtered packages when params change
  useEffect(() => {
    dispatch(
      fetchPackagesAsync({
        filter: params.filter || "",
        query: params.query || "",
        limit: 6,
        reset: true,
      })
    );
  }, [params.filter, params.query, dispatch]);

  const handleCardPress = (id: string): void =>
    router.push(`/properties/${id}`);

  // Custom package card component with modern styling
  const PackageCard = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[
        styles.packageCard,
        { transform: [{ scale: index % 3 === 0 ? 1 : 0.95 }] },
      ]}
      activeOpacity={0.9}
      onPress={() => handleCardPress(item.id)}
    >
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: item.image || "https://via.placeholder.com/300" }}
          style={styles.cardImage}
        />

        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>FEATURED</Text>
        </View>

        <TouchableOpacity style={styles.favoriteButton}>
          <Heart size={16} color="#FFF" />
        </TouchableOpacity>

        {/* Price tag */}
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>${item.price || 0}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {item.name || "Unnamed Package"}
        </Text>

        <View style={styles.locationRow}>
          <MapPin size={12} color="#95A5A6" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.type || "Accommodation"}
          </Text>
        </View>

        {item.rating && (
          <View style={styles.ratingRow}>
            <Star size={12} color="#FFD700" fill="#FFD700" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Featured Packages"
        showBackButton={true}
        isPrimaryColored={true}
        backgroundColor="#1ABC9C"
      />

      {/* Main content */}
      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1ABC9C" />
            <Text style={styles.loadingText}>Loading featured packages...</Text>
          </View>
        ) : !featuredPackages || featuredPackages.length === 0 ? (
          <NoResults />
        ) : (
          <FlatList
            data={featuredPackages}
            renderItem={({ item, index }) => (
              <PackageCard item={item} index={index} />
            )}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 30,
    paddingHorizontal: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#95A5A6",
  },
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 6,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  packageCard: {
    width: width / 2 - 24,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginHorizontal: 6,
  },
  cardImageContainer: {
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(26, 188, 156, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  priceTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(26, 188, 156, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopRightRadius: 8,
  },
  priceText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34495E",
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  locationText: {
    fontSize: 12,
    color: "#95A5A6",
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    color: "#34495E",
    fontWeight: "500",
    marginLeft: 4,
  },
});

export default Featured;
