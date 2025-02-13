import { useEffect, useState } from "react";
import { router, useLocalSearchParams,  } from "expo-router";
import { getAgentById } from "@/lib/appwrite"; 
import { Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View,  Dimensions, Platform, StyleSheet, Modal, } from "react-native";
import icons from "@/constants/icons";
import { ChevronDown, ChevronUp, ArrowRightFromLineIcon, Star, X, MessageCircle, ChevronRight  } from "lucide-react-native";


type Package = {
  name: string;
  price: string;
};

type Review = {
  id: number;
  author: string;
  rating: number;
  comment: string;
  avatar: string;
};

const AgentProfile = () => {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id; // ✅ Ensure id is a string
  const [agent, setAgent] = useState<any>(null);
  const windowHeight = Dimensions.get("window").height;
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const fetchAgent = async () => {
      if (id) {
        try {
          const data = await getAgentById({ id: String(id) }); // ✅ Convert id to string
          setAgent(data);
        } catch (error) {
          console.error("Error fetching agent by ID:", error);
        }
      }
    };

    fetchAgent();
  }, [id]);

  if (!agent) return <Text>Loading agent details...</Text>;

  // Sample data - in a real app, this would come from props or API
  const tagent = {
    name: "Sarah Johnson",
    title: "Luxury Real Estate Specialist",
    rating: 4.8,
    reviewCount: 127,
    avatar: "https://placeholder.com/120x120",
    packages: [
      { name: "Basic Tour", price: "$299" },
      { name: "Premium Package", price: "$499" },
      { name: "Luxury Experience", price: "$999" },
    ],
    reviews: [
      { id: 1, author: "John D.", rating: 5, comment: "Amazing service! Sarah helped us find our perfect home in record time. Her knowledge of the local market was invaluable.", avatar: "https://placeholder.com/50x50" },
      { id: 2, author: "Alice M.", rating: 5, comment: "Found my dream home! The virtual tour package was exactly what I needed.", avatar: "https://placeholder.com/50x50" },
      { id: 3, author: "Robert K.", rating: 4, comment: "Very professional and responsive. Great attention to detail.", avatar: "https://placeholder.com/50x50" },
      { id: 4, author: "Emma S.", rating: 5, comment: "Best agent ever! Made the whole process smooth and stress-free.", avatar: "https://placeholder.com/50x50" },
    ],
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starContainer}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            color={i < Math.floor(rating) ? '#FDB814' : '#D1D5DB'}
          />

        ))}
      </View>
    );
  };

  const ReviewModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Review from {selectedReview?.author}</Text>
            <TouchableOpacity 
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.reviewerInfo}>
              <Image
                source={{ uri: selectedReview?.avatar }}
                style={styles.modalAvatar}
              />
              <View>
                <Text style={styles.reviewerName}>{selectedReview?.author}</Text>
                {renderStars(selectedReview?.rating || 0)}
              </View>
            </View>
            <Text style={styles.reviewText}>{selectedReview?.comment}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );


  return (
<SafeAreaView style={styles.container}>
<View className="flex flex-row items-center p-2 justify-between">
                      <TouchableOpacity
                        onPress={() => router.back()}
                        className="flex rounded-full size-10 items-center ml-4 justify-center"
                      >
                        <Image source={icons.backArrow} className="size-8" />
                      </TouchableOpacity>
        
                    </View>
      <ScrollView>
        {/* Header Section */}
         
        <View style={styles.header}>

          <Image
            source={{ uri: agent.avatar }}
            style={styles.avatar}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{agent.name}</Text>
            <Text style={styles.title}>{tagent.title}</Text>
            <View style={styles.ratingContainer}>
              {renderStars(tagent.rating)}
              <Text style={styles.ratingText}>
                {tagent.rating} ({tagent.reviewCount} reviews)
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Button */}
        <TouchableOpacity className="bg-primary-300" style={styles.contactButton}>
          <MessageCircle  size={20} color="#FFF" />
          <Text style={styles.contactButtonText}>Contact Me</Text>
        </TouchableOpacity>

        {/* Packages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Packages</Text>
          {tagent.packages.map((pkg, index) => (
            <TouchableOpacity key={index} style={styles.packageItem}>
              <Text style={styles.packageName}>{pkg.name}</Text>
              <View style={styles.packagePrice}>
                <Text style={styles.priceText}>{pkg.price}</Text>
                <ChevronRight  size={20} color="#666" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Reviews</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.reviewsScroll}
          >
            {tagent.reviews.map((review) => (
              <TouchableOpacity
                key={review.id}
                style={styles.reviewCard}
                onPress={() => {
                  setSelectedReview(review);
                  setIsModalVisible(true);
                }}
              >
                <View style={styles.reviewHeader}>
                  <Image
                    source={{ uri: review.avatar }}
                    style={styles.reviewerAvatar}
                  />
                  <Text style={styles.reviewerName}>{review.author}</Text>
                </View>
                {renderStars(review.rating)}
                <Text numberOfLines={2} style={styles.reviewPreview}>
                  {review.comment}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      
      <ReviewModal />
    </SafeAreaView>
    
  );
};

export default AgentProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  title: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  starContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactButton: {
    flexDirection: 'row',
   
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  contactButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1F2937',
  },
  packageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  packagePrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1ABC9C',
    marginRight: 8,
  },
  reviewsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  reviewCard: {
    width: 200,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginRight: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  reviewPreview: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
});

