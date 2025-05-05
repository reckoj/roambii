import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
} from "react-native";
import { X, Star } from "lucide-react-native";

export interface ReviewDetails {
  id: string;
  author: string;
  avatar?: string;
  agentRating: number; // Changed from rating to agentRating to match ReviewsList
  comment: string;
  createdAt?: string;
  users?: string[];
  agentId?: any;
  $permissions?: string[];
}

interface ReviewModalProps {
  isModalVisible: boolean;
  setIsModalVisible: (visible: boolean) => void;
  selectedReview: ReviewDetails | null;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isModalVisible,
  setIsModalVisible,
  selectedReview,
}) => {
  const renderStars = (rating: number) => (
    <View style={styles.starContainer}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={16}
          color={i < Math.floor(rating) ? "#FDB814" : "#D1D5DB"}
          fill={i < Math.floor(rating) ? "#FDB814" : "none"}
        />
      ))}
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Review from {selectedReview?.author}
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View style={styles.reviewerInfo}>
              <Image
                source={
                  selectedReview?.avatar
                    ? { uri: selectedReview.avatar }
                    : require("@/assets/images/avatar.png")
                }
                style={styles.modalAvatar}
              />
              <View>
                <Text style={styles.reviewerName}>
                  {selectedReview?.author}
                </Text>
                {selectedReview && renderStars(selectedReview.agentRating)}
                {selectedReview?.createdAt && (
                  <Text style={styles.reviewDate}>
                    {new Date(selectedReview.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.reviewText}>{selectedReview?.comment}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    width: "100%",
    maxHeight: "80%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    maxHeight: "90%",
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  modalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "500",
  },
  reviewDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  reviewText: {
    fontSize: 16,
    lineHeight: 24,
  },
  starContainer: {
    flexDirection: "row",
    marginTop: 5,
  },
});

export default ReviewModal;
