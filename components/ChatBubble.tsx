// ChatBubble.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { CheckCheck } from "lucide-react-native";
import { ChatMessage } from "@/lib/chat-service"; // Update this import to use the right type

interface ChatBubbleProps {
  message: ChatMessage;
  isFromCurrentUser: boolean;
  isConsecutive: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isFromCurrentUser,
  isConsecutive,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const bubbleStyle = () => {
    const baseStyles = [
      styles.bubbleBase,
      isFromCurrentUser ? styles.bubbleUser : styles.bubblePartner,
    ];

    return baseStyles;
  };

  const textColor = isFromCurrentUser ? styles.textUser : styles.textPartner;
  const metaTextColor = isFromCurrentUser
    ? styles.metaTextUser
    : styles.metaTextPartner;

  // Render the read status indicator
  const renderReadIndicator = () => {
    if (!isFromCurrentUser) return null;

    if (message.read) {
      // Message is read - show blue double check
      return (
        <View style={styles.readIndicator}>
          <CheckCheck
            size={16}
            color="#34B7F1" // Blue color for read messages
            strokeWidth={2}
          />
        </View>
      );
    } else {
      // Message is sent but not read - show gray double check
      return (
        <View style={styles.readIndicator}>
          <CheckCheck
            size={16}
            color="rgba(255, 255, 255, 0.7)" // Gray color for unread messages
            strokeWidth={2}
          />
        </View>
      );
    }
  };

  return (
    <Animated.View
      style={{
        alignSelf: isFromCurrentUser ? "flex-end" : "flex-start",
        marginBottom: 8,
        opacity: fadeAnim,
      }}
    >
      <View style={bubbleStyle()}>
        <Text style={textColor}>{message.content}</Text>

        <View style={styles.metaContainer}>
          <Text style={metaTextColor}>
            {new Date(
              typeof message.timestamp === "number"
                ? message.timestamp
                : Date.now()
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

          {renderReadIndicator()}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bubbleBase: {
    maxWidth: "80%",
    minWidth: "30%",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: "#45756c",
    borderTopRightRadius: 4,
  },
  bubbleUserConsecutive: {
    borderTopRightRadius: 18,
  },
  bubblePartner: {
    backgroundColor: "#1ABC9C",
    borderTopLeftRadius: 4,
  },
  bubblePartnerConsecutive: {
    borderTopLeftRadius: 18,
  },
  bubblePending: {
    opacity: 0.7,
  },
  textUser: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  textPartner: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  metaTextUser: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginRight: 5,
  },
  metaTextPartner: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
  },
  readIndicator: {
    marginLeft: 4,
    height: 16,
    justifyContent: "center",
  },
});

export default ChatBubble;
