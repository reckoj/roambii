import { Tabs } from "expo-router";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";

import {
  CalendarDaysIcon,
  Home,
  MessageCircleIcon,
  PlusCircle,
  User,
  Map,
  Calendar,
} from "lucide-react-native";
import { useGlobalContext } from "@/lib/global-provider";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { checkIsAgent } from "@/lib/auth-service";
import { firebaseDb } from "@/lib/firebase/firebase-config";
import React from "react";
import { useRouter, usePathname } from "expo-router";

// New TabIcon for Lucide icons with badge support
const LucideTabIcon = ({
  focused,
  Icon,
  title,
  showBadge = false,
  badgeCount = 0,
}: {
  focused: boolean;
  Icon: typeof PlusCircle;
  title: string;
  showBadge?: boolean;
  badgeCount?: number;
}) => (
  <View className="flex-1 mt-3 flex flex-col items-center">
    <View className="relative">
      <Icon size={24} color={focused ? "#1ABC9C" : "#95A5A6"} />
      {showBadge && (
        <View className="absolute -top-2 -right-2 bg-red-500 rounded-full min-w-5 h-5 items-center justify-center">
          {badgeCount > 0 && (
            <Text className="text-white text-xs font-bold">
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          )}
        </View>
      )}
    </View>
    <Text
      className={`${
        focused ? "text-primary-300 font-rubik-medium" : "text-grey font-rubik"
      } text-xs w-full text-center mt-1`}
    >
      {title}
    </Text>
  </View>
);

// Custom Tab Bar Component
const CustomTabBar = ({ unreadMessageCount }: { unreadMessageCount: number }) => {
  const { isAgent } = useGlobalContext();
  const router = useRouter();
  const pathname = usePathname();

  // Define tab configurations based on user type
  const tabs = [
    {
      name: "index",
      path: "/(root)/(tabs)/",
      icon: Home,
      title: "Home",
      show: true,
    },
    {
      name: "chat",
      path: "/(root)/(tabs)/chat",
      icon: MessageCircleIcon,
      title: "Messages",
      show: true,
      badge: unreadMessageCount > 0,
      badgeCount: unreadMessageCount,
    },
    {
      name: "itinerary",
      path: "/(root)/(tabs)/itinerary",
      icon: Map,
      title: "Itinerary",
      show: isAgent,
    },
    {
      name: "bookings",
      path: "/(root)/(tabs)/bookings",
      icon: Calendar,
      title: "Bookings",
      show: !isAgent,
    },
    {
      name: "profile",
      path: "/(root)/(tabs)/profile",
      icon: User,
      title: "Profile",
      show: true,
    },
  ].filter(tab => tab.show);

  const handleTabPress = (path: string) => {
    router.push(path as any);
  };

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab, index) => {
        const isFocused = pathname === tab.path || (tab.name === "index" && pathname === "/(root)/(tabs)");
        
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.path)}
            activeOpacity={0.7}
          >
            <LucideTabIcon
              focused={isFocused}
              Icon={tab.icon}
              title={tab.title}
              showBadge={tab.badge || false}
              badgeCount={tab.badgeCount || 0}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// UnreadMessageTracker component to count unread messages
const UnreadMessageTracker = ({
  setUnreadCount,
}: {
  setUnreadCount: (count: number) => void;
}) => {
  const { rawUser } = useGlobalContext();

  useEffect(() => {
    if (!rawUser?.id) return;

    // Track if component is mounted to avoid state updates after unmount
    let isMounted = true;

    // This function will check if the current user is an agent
    const setupUnreadListener = async () => {
      try {
        // Check if user is an agent
        const isAgentResult = await checkIsAgent(rawUser.id);
        const userId =
          isAgentResult.isAgent && isAgentResult.agentId
            ? isAgentResult.agentId
            : rawUser.id;

        console.log(
          `Setting up unread message tracker for ${
            isAgentResult.isAgent ? "agent" : "user"
          } ${userId}`
        );

        // Reference to chat_rooms in Firebase
        const roomsRef = ref(firebaseDb, "chat_rooms");

        // Listen for changes to chat rooms
        const unsubscribe = onValue(roomsRef, (snapshot) => {
          if (!snapshot.exists() || !isMounted) return;

          let totalUnread = 0;

          snapshot.forEach((roomSnapshot) => {
            const roomData = roomSnapshot.val();

            // Check if this room belongs to the current user
            const isUserInRoom =
              roomData.participants &&
              ((Array.isArray(roomData.participants) &&
                roomData.participants.includes(userId)) ||
                (typeof roomData.participants === "object" &&
                  Object.values(roomData.participants).includes(userId)));

            // Also check older format rooms
            const isUserInOldRoom =
              roomData.user_id === userId || roomData.agent_id === userId;

            if (isUserInRoom || isUserInOldRoom) {
              // Get unread count for this user
              const roomUnread = roomData.unread_count?.[userId] || 0;
              totalUnread += roomUnread;
            }
          });

          if (isMounted) {
            console.log(`Total unread messages: ${totalUnread}`);
            setUnreadCount(totalUnread);
          }
        });

        // Cleanup function
        return () => {
          isMounted = false;
          unsubscribe();
        };
      } catch (error) {
        console.error("Error setting up unread message tracker:", error);
      }
    };

    setupUnreadListener();

    return () => {
      isMounted = false;
    };
  }, [rawUser, setUnreadCount]);

  // This is a headless component, so it doesn't render anything
  return null;
};

const TabsLayout = () => {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  return (
    <>
      {/* This component tracks unread messages without rendering anything */}
      <UnreadMessageTracker setUnreadCount={setUnreadMessageCount} />

      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          headerShown: false,
        }}
        tabBar={() => <CustomTabBar unreadMessageCount={unreadMessageCount} />}
      >
        <Tabs.Screen name={"index"} />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="itinerary" />
        <Tabs.Screen name="bookings" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopColor: '#0061FF1A',
    borderTopWidth: 1,
    minHeight: 70,
    paddingBottom: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TabsLayout;
