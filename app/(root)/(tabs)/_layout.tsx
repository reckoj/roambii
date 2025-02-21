import { Tabs } from "expo-router";
import {Text, View } from "react-native";
import {  CalendarDaysIcon, Home, MessageCircleIcon, PlusCircle, User } from "lucide-react-native";
import { useGlobalContext } from "@/lib/global-provider";


// Regular TabIcon for Image sources
// const TabIcon = ({
//   focused,
//   icon,
//   title,
// }: {
//   focused: boolean;
//   icon: ImageSourcePropType;
//   title: string;
// }) => (
//   <View className="flex-1 mt-3 flex flex-col items-center">
//     <Image
//       source={icon}
//       tintColor={focused ? "#1ABC9C" : "#95A5A6"}
//       resizeMode="contain"
//       className="size-6"
//     />
//     <Text
//       className={`${
//         focused ? "text-primary-300 font-rubik-medium" : "text-grey font-rubik"
//       } text-xs w-full text-center mt-1`}
//     >
//       {title}
//     </Text>
//   </View>
// );

// New TabIcon for Lucide icons
const LucideTabIcon = ({
  focused,
  Icon,
  title,
}: {
  focused: boolean;
  Icon: typeof PlusCircle;
  title: string;
}) => (
  <View className="flex-1 mt-3 flex flex-col items-center">
    <Icon
      size={24}
      color={focused ? "#1ABC9C" : "#95A5A6"}
    />
    <Text
      className={`${
        focused ? "text-primary-300 font-rubik-medium" : "text-grey font-rubik"
      } text-xs w-full text-center mt-1`}
    >
      {title}
    </Text>
  </View>
);

const TabsLayout = () => {

  const { isLogged, rawUser, isAgent } = useGlobalContext();

  return (
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
    {/* <Tabs.Screen
      name="bookings"
      options={{
        title: "Bookings",
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <LucideTabIcon focused={focused} Icon={CalendarDaysIcon} title="Bookings" />
        ),
      }}
    /> */}
   
      {/* <Tabs.Screen
        name="create-package"
        options={{
          title: "Create Package",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <LucideTabIcon focused={focused} Icon={PlusCircle} title="New Package" />
          ),
        }}
      /> */}
   
    <Tabs.Screen
      name="chat"
      options={{
        title: "Messages",
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <LucideTabIcon focused={focused} Icon={MessageCircleIcon} title="Messages" />
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
   
   
  
   
  );
};

export default TabsLayout;