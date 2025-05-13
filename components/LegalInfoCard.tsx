import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { FileText, Calendar, MapPin, Globe, Phone } from 'lucide-react-native';
import { router } from 'expo-router';

// Generic interface that accepts any User type with legalInformation
interface LegalInfoCardProps {
  user: {
    name?: string;
    email?: string;
    avatar?: string;
    legalInformation?: {
      fullName?: string;
      dateOfBirth?: string | null;
      email?: string;
      phoneNumber?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      passportNumber?: string;
      passportExpiryDate?: string | null;
    };
  } | null;
}

const LegalInfoCard: React.FC<LegalInfoCardProps> = ({ user }) => {
  // Check for all required properties explicitly
  const hasRequiredInfo = user && 
    user.legalInformation?.fullName && 
    user.legalInformation?.email && 
    user.legalInformation?.phoneNumber && 
    user.legalInformation?.dateOfBirth;
  
  // Format date helper
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (!hasRequiredInfo) {
    return (
      <TouchableOpacity
        style={styles.emptyCard}
        onPress={() => router.push('/legal-information')}
      >
        <FileText size={24} color="#1ABC9C" />
        <Text style={styles.emptyText}>Add your legal information</Text>
        <Text style={styles.subText}>
          Required for booking travel packages
        </Text>
      </TouchableOpacity>
    );
  }

  // Full address formatter
  const formatAddress = () => {
    if (!user?.legalInformation) return null;
    const { address, city, state, zipCode, country } = user.legalInformation;
    const parts = [address, city, state, zipCode, country].filter(Boolean);
    if (parts.length === 0) return null;
    return parts.join(', ');
  };

  const fullAddress = formatAddress();

  return (
    <View style={styles.card}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.legalInformation?.fullName?.charAt(0) || "T"}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{user?.legalInformation?.fullName}</Text>
          <Text style={styles.travelStatus}>Traveler</Text>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.infoContainer}>
        {user?.legalInformation?.dateOfBirth && (
          <View style={styles.infoItem}>
            <View style={styles.iconContainer}>
              <Calendar size={16} color="#1ABC9C" />
            </View>
            <Text style={styles.infoText}>
              Born: {formatDate(user.legalInformation.dateOfBirth)}
            </Text>
          </View>
        )}
        
        {fullAddress && (
          <View style={styles.infoItem}>
            <View style={styles.iconContainer}>
              <MapPin size={16} color="#1ABC9C" />
            </View>
            <Text style={styles.infoText}>{fullAddress}</Text>
          </View>
        )}

        {user?.legalInformation?.phoneNumber && (
          <View style={styles.infoItem}>
            <View style={styles.iconContainer}>
              <Phone size={16} color="#1ABC9C" />
            </View>
            <Text style={styles.infoText}>{user.legalInformation.phoneNumber}</Text>
          </View>
        )}

        {user?.legalInformation?.passportNumber && (
          <View style={styles.infoItem}>
            <View style={styles.iconContainer}>
              <Globe size={16} color="#1ABC9C" />
            </View>
            <Text style={styles.infoText}>
              Passport: {user.legalInformation.passportNumber}
              {user.legalInformation.passportExpiryDate ? 
                ` (Expires: ${formatDate(user.legalInformation.passportExpiryDate)})` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push('/legal-information')}
      >
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1ABC9C",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  travelStatus: {
    fontSize: 14,
    color: "#1ABC9C",
    fontWeight: "600",
  },
  infoContainer: {
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(26, 188, 156, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
  },
  editButton: {
    backgroundColor: "#1ABC9C",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "flex-end",
  },
  editButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginTop: 12,
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: "#8A8D9F",
    textAlign: "center",
  },
});

export default LegalInfoCard; 