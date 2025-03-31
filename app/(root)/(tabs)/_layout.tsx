import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import {
  CalendarDaysIcon,
  Home,
  MessageCircleIcon,
  PlusCircle,
  User,
} from "lucide-react-native";
import { useGlobalContext } from "@/lib/global-provider";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { checkIsAgent } from "@/lib/chatService";

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

// UnreadMessageTracker component to count unread messages
const UnreadMessageTracker = ({
  setUnreadCount,
}: {
  setUnreadCount: (count: number) => void;
}) => {
  const { rawUser } = useGlobalContext();

  useEffect(() => {
    if (!rawUser?.$id) return;

    // Track if component is mounted to avoid state updates after unmount
    let isMounted = true;

    // This function will check if the current user is an agent
    const setupUnreadListener = async () => {
      try {
        // Check if user is an agent
        const isAgentResult = await checkIsAgent(rawUser.$id);
        const userId =
          isAgentResult.isAgent && isAgentResult.agentId
            ? isAgentResult.agentId
            : rawUser.$id;

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
          tabBarStyle: {
            backgroundColor: "white",
            position: "absolute",
            borderTopColor: "#0061FF1A",
            borderTopWidth: 1,
            minHeight: 70,
          },
        }}
      >
        <Tabs.Screen
          name={"index"}
          options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <LucideTabIcon focused={focused} Icon={Home} title="Home" />
            ),
          }}
        />

        <Tabs.Screen
          name="chat"
          options={{
            title: "Messages",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <LucideTabIcon
                focused={focused}
                Icon={MessageCircleIcon}
                title="Messages"
                showBadge={unreadMessageCount > 0}
                badgeCount={unreadMessageCount}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <LucideTabIcon focused={focused} Icon={User} title="Profile" />
            ),
          }}
        />
      </Tabs>
    </>
  );
};

export default TabsLayout;
