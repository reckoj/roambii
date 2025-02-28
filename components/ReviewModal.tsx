import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { X } from "lucide-react-native"; // Assuming you're using lucide-react-native for icons

interface Review {
  author: string;
  avatar: string;
  rating: number;
  comment: string;
}

interface ReviewModalProps {
  isModalVisible: boolean;
  setIsModalVisible: (visible: boolean) => void;
  selectedReview: Review | null;
  renderStars: (rating: number) => React.ReactNode;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isModalVisible,
  setIsModalVisible,
  selectedReview,
  renderStars,
}) => {
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
          <View style={styles.modalBody}>
            <View style={styles.reviewerInfo}>
              <Image
                source={{ uri: selectedReview?.avatar }}
                style={styles.modalAvatar}
              />
              <View>
                <Text style={styles.reviewerName}>
                  {selectedReview?.author}
                </Text>
                {selectedReview && renderStars(selectedReview.rating)}
              </View>
            </View>
            <Text style={styles.reviewText}>{selectedReview?.comment}</Text>
          </View>
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
    gap: 15,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  reviewText: {
    fontSize: 16,
    lineHeight: 24,
  },
});

export default ReviewModal;
