// import React, { useEffect, useState, useCallback } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   ActivityIndicator,
//   RefreshControl,
//   Dimensions,
//   StatusBar,
//   Alert,
//   ScrollView,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { router } from "expo-router";
// import { useGlobalContext } from "@/lib/global-provider";
// import CustomHeader from "@/components/HeaderComponent";
// import images from "@/constants/images";
// import Animated from "react-native-reanimated";
// import {
//   Heart,
//   MapPin,
//   Star,
//   Bed,
//   Bath,
//   Users,
//   Calendar,
//   Trash2,
//   Share2,
// } from "lucide-react-native";
// import { getUserWishlist, removeFromWishlist } from "@/lib/appwrite";

// // Format date helper
// const formatDate = (dateString) => {
//   if (!dateString) return "";
//   const date = new Date(dateString);
//   return date.toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// };

// const WishlistScreen = () => {
//   const { rawUser } = useGlobalContext();
//   const [wishlistItems, setWishlistItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filterView, setFilterView] = useState("all"); // 'all', 'recent', 'price-high', 'price-low'

//   // Fetch wishlist items
//   const fetchWishlistItems = async () => {
//     if (!rawUser?.$id) {
//       setLoading(false);
//       setRefreshing(false);
//       return;
//     }

//     try {
//       const items = await getUserWishlist(rawUser.$id);
//       setWishlistItems(items);
//     } catch (error) {
//       console.error("Error fetching wishlist items:", error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   // Initial fetch
//   useEffect(() => {
//     fetchWishlistItems();
//   }, [rawUser?.$id]);

//   // Handle pull-to-refresh
//   const handleRefresh = useCallback(() => {
//     setRefreshing(true);
//     fetchWishlistItems();
//   }, [rawUser?.$id]);

//   // Remove from wishlist
//   const handleRemoveFromWishlist = async (id) => {
//     Alert.alert(
//       "Remove from Wishlist",
//       "Are you sure you want to remove this property from your wishlist?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Remove",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               // Optimistic UI update
//               setWishlistItems(wishlistItems.filter((item) => item.$id !== id));

//               // Make API call to remove from wishlist
//               await removeFromWishlist(id);
//             } catch (error) {
//               console.error("Error removing from wishlist:", error);
//               // Restore the item if API call fails
//               fetchWishlistItems();
//               Alert.alert(
//                 "Error",
//                 "Failed to remove from wishlist. Please try again."
//               );
//             }
//           },
//         },
//       ]
//     );
//   };

//   // View property details
//   const handleViewProperty = (id) => {
//     router.push(`/properties/${id}`);
//   };

//   // Filter wishlist items
//   const getFilteredItems = () => {
//     let filtered = [...wishlistItems];

//     switch (filterView) {
//       case "recent":
//         filtered.sort(
//           (a, b) => new Date(b.$createdAt) - new Date(a.$createdAt)
//         );
//         break;
//       case "price-high":
//         filtered.sort((a, b) => b.package?.price - a.package?.price);
//         break;
//       case "price-low":
//         filtered.sort((a, b) => a.package?.price - b.package?.price);
//         break;
//       default:
//         // 'all' - no sorting needed
//         break;
//     }

//     return filtered;
//   };

//   // Render filter button
//   const renderFilterButton = (label, value) => (
//     <TouchableOpacity
//       style={[
//         styles.filterButton,
//         filterView === value && styles.activeFilterButton,
//       ]}
//       onPress={() => setFilterView(value)}
//     >
//       <Text
//         style={[
//           styles.filterButtonText,
//           filterView === value && styles.activeFilterText,
//         ]}
//       >
//         {label}
//       </Text>
//     </TouchableOpacity>
//   );

//   // Render wishlist item
//   const renderWishlistItem = ({ item }) => {
//     const packageDetails = item.package || {};

//     return (
//       <Animated.View style={styles.itemContainer}>
//         <TouchableOpacity
//           style={styles.propertyCard}
//           activeOpacity={0.9}
//           onPress={() => handleViewProperty(packageDetails.$id)}
//         >
//           {/* Card image */}
//           <View style={styles.cardImageContainer}>
//             <Image
//               source={{
//                 uri: packageDetails.image || "https://via.placeholder.com/300",
//               }}
//               style={styles.cardImage}
//             />

//             {/* Rating */}
//             {packageDetails.rating && (
//               <View style={styles.ratingBadge}>
//                 <Star size={14} color="#FFD700" fill="#FFD700" />
//                 <Text style={styles.ratingText}>
//                   {packageDetails.rating.toFixed(1)}
//                 </Text>
//               </View>
//             )}

//             {/* Price tag */}
//             <View style={styles.priceTag}>
//               <Text style={styles.priceText}>${packageDetails.price}</Text>
//               <Text style={styles.priceLabel}>/night</Text>
//             </View>
//           </View>

//           {/* Card content */}
//           <View style={styles.cardContent}>
//             <View style={styles.cardContentTop}>
//               <Text numberOfLines={1} style={styles.propertyName}>
//                 {packageDetails.name || "Property"}
//               </Text>

//               <View style={styles.locationRow}>
//                 <MapPin size={14} color="#95A5A6" />
//                 <Text style={styles.locationText} numberOfLines={1}>
//                   {packageDetails.type || "Accommodation"}
//                 </Text>
//               </View>

//               <View style={styles.featuresRow}>
//                 {packageDetails.bedrooms && (
//                   <View style={styles.feature}>
//                     <Bed size={14} color="#7F8C8D" />
//                     <Text style={styles.featureText}>
//                       {packageDetails.bedrooms}
//                     </Text>
//                   </View>
//                 )}

//                 {packageDetails.bathrooms && (
//                   <View style={styles.feature}>
//                     <Bath size={14} color="#7F8C8D" />
//                     <Text style={styles.featureText}>
//                       {packageDetails.bathrooms}
//                     </Text>
//                   </View>
//                 )}

//                 {packageDetails.guestAmount && (
//                   <View style={styles.feature}>
//                     <Users size={14} color="#7F8C8D" />
//                     <Text style={styles.featureText}>
//                       {packageDetails.guestAmount}
//                     </Text>
//                   </View>
//                 )}
//               </View>
//             </View>

//             <View style={styles.cardActions}>
//               <View style={styles.dateAddedContainer}>
//                 <Calendar size={12} color="#95A5A6" />
//                 <Text style={styles.dateText}>
//                   Added {formatDate(item.$createdAt)}
//                 </Text>
//               </View>

//               <TouchableOpacity
//                 style={styles.removeButton}
//                 onPress={() => handleRemoveFromWishlist(item.$id)}
//               >
//                 <Trash2 size={16} color="#E74C3C" />
//                 <Text style={styles.removeText}>Remove</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </TouchableOpacity>
//       </Animated.View>
//     );
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar barStyle="dark-content" />

//       {/* Header */}
//       <CustomHeader
//         title="My Wishlist"
//         showBackButton={true}
//         rightIcon={<Share2 color="white" size={24} />}
//         onRightIconPress={() => {
//           /* Handle share functionality */
//           Alert.alert(
//             "Share",
//             "Share your wishlist with friends feature coming soon!"
//           );
//         }}
//       />

//       {/* Main content */}
//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#1ABC9C" />
//           <Text style={styles.loadingText}>Loading your wishlist...</Text>
//         </View>
//       ) : (
//         <>
//           {/* Filter options */}
//           <View style={styles.filterContainer}>
//             <Text style={styles.filterTitle}>Sort by:</Text>
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={styles.filterScrollContent}
//             >
//               {renderFilterButton("All", "all")}
//               {renderFilterButton("Recently Added", "recent")}
//               {renderFilterButton("Price: High to Low", "price-high")}
//               {renderFilterButton("Price: Low to High", "price-low")}
//             </ScrollView>
//           </View>

//           {/* Wishlist count */}
//           <View style={styles.countContainer}>
//             <Text style={styles.countText}>
//               {wishlistItems.length}{" "}
//               {wishlistItems.length === 1 ? "property" : "properties"} saved
//             </Text>
//           </View>

//           {/* Wishlist items */}
//           {wishlistItems.length === 0 ? (
//             <View style={styles.emptyContainer}>
//               <Image
//                 source={
//                   images.noResult || require("../assets/images/no-results.png")
//                 }
//                 style={styles.emptyImage}
//                 resizeMode="contain"
//               />
//               <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
//               <Text style={styles.emptySubtitle}>
//                 Save properties you love to your wishlist for easy access later
//               </Text>
//               <TouchableOpacity
//                 style={styles.exploreButton}
//                 onPress={() => router.push("/")}
//               >
//                 <Text style={styles.exploreButtonText}>Explore Properties</Text>
//               </TouchableOpacity>
//             </View>
//           ) : (
//             <FlatList
//               data={getFilteredItems()}
//               renderItem={renderWishlistItem}
//               keyExtractor={(item) => item.$id}
//               contentContainerStyle={styles.listContainer}
//               showsVerticalScrollIndicator={false}
//               refreshControl={
//                 <RefreshControl
//                   refreshing={refreshing}
//                   onRefresh={handleRefresh}
//                   colors={["#1ABC9C"]}
//                   tintColor="#1ABC9C"
//                 />
//               }
//             />
//           )}
//         </>
//       )}
//     </SafeAreaView>
//   );
// };

// const { width } = Dimensions.get("window");

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F8F9FA",
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   loadingText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: "#95A5A6",
//   },
//   // Filter section
//   filterContainer: {
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#ECEFF1",
//   },
//   filterTitle: {
//     fontSize: 14,
//     fontWeight: "500",
//     color: "#34495E",
//     marginBottom: 8,
//   },
//   filterScrollContent: {
//     paddingRight: 16,
//   },
//   filterButton: {
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//     backgroundColor: "#ECEFF1",
//     marginRight: 8,
//   },
//   activeFilterButton: {
//     backgroundColor: "#1ABC9C",
//   },
//   filterButtonText: {
//     fontSize: 13,
//     color: "#7F8C8D",
//   },
//   activeFilterText: {
//     color: "#FFFFFF",
//     fontWeight: "500",
//   },
//   // Wishlist count
//   countContainer: {
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//   },
//   countText: {
//     fontSize: 15,
//     color: "#34495E",
//     fontWeight: "500",
//   },
//   // List container
//   listContainer: {
//     padding: 16,
//     paddingTop: 0,
//   },
//   // Wishlist item
//   itemContainer: {
//     marginBottom: 16,
//   },
//   propertyCard: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: 16,
//     overflow: "hidden",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 8,
//     elevation: 2,
//   },
//   cardImageContainer: {
//     position: "relative",
//     height: 180,
//   },
//   cardImage: {
//     width: "100%",
//     height: "100%",
//   },
//   ratingBadge: {
//     position: "absolute",
//     top: 12,
//     left: 12,
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "rgba(255, 255, 255, 0.9)",
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   ratingText: {
//     marginLeft: 4,
//     fontSize: 12,
//     fontWeight: "600",
//     color: "#34495E",
//   },
//   priceTag: {
//     position: "absolute",
//     bottom: 12,
//     right: 12,
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "rgba(26, 188, 156, 0.9)",
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 12,
//   },
//   priceText: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: "#FFFFFF",
//   },
//   priceLabel: {
//     fontSize: 12,
//     color: "rgba(255, 255, 255, 0.8)",
//     marginLeft: 2,
//   },
//   cardContent: {
//     padding: 16,
//   },
//   cardContentTop: {
//     marginBottom: 12,
//   },
//   propertyName: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#34495E",
//     marginBottom: 6,
//   },
//   locationRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   locationText: {
//     fontSize: 14,
//     color: "#95A5A6",
//     marginLeft: 6,
//   },
//   featuresRow: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   feature: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginRight: 16,
//   },
//   featureText: {
//     fontSize: 14,
//     color: "#7F8C8D",
//     marginLeft: 6,
//   },
//   cardActions: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: "#ECEFF1",
//   },
//   dateAddedContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   dateText: {
//     fontSize: 12,
//     color: "#95A5A6",
//     marginLeft: 6,
//   },
//   removeButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingVertical: 6,
//     paddingHorizontal: 10,
//     borderRadius: 6,
//     backgroundColor: "rgba(231, 76, 60, 0.1)",
//   },
//   removeText: {
//     fontSize: 12,
//     color: "#E74C3C",
//     fontWeight: "500",
//     marginLeft: 4,
//   },
//   // Empty state
//   emptyContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 24,
//   },
//   emptyImage: {
//     width: width * 0.6,
//     height: width * 0.6,
//     marginBottom: 24,
//   },
//   emptyTitle: {
//     fontSize: 22,
//     fontWeight: "600",
//     color: "#34495E",
//     marginBottom: 8,
//     textAlign: "center",
//   },
//   emptySubtitle: {
//     fontSize: 16,
//     color: "#7F8C8D",
//     textAlign: "center",
//     marginBottom: 24,
//     paddingHorizontal: 16,
//   },
//   exploreButton: {
//     backgroundColor: "#1ABC9C",
//     paddingVertical: 14,
//     paddingHorizontal: 24,
//     borderRadius: 12,
//     alignItems: "center",
//     justifyContent: "center",
//     minWidth: 200,
//   },
//   exploreButtonText: {
//     color: "#FFFFFF",
//     fontSize: 16,
//     fontWeight: "600",
//   },
// });

// export default WishlistScreen;
