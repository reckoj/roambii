import React, { useState } from "react";
import { View, TouchableOpacity, Image, TextInput, Text, Modal, FlatList, Pressable } from "react-native";
import { useDebouncedCallback } from "use-debounce";
import icons from "@/constants/icons";
import { useLocalSearchParams, router, usePathname } from "expo-router";
import { ChevronDown, SearchIcon } from "lucide-react-native";

const CONTINENTS = [
  "North America",
  "South America",
  "Asia",
  "Caribbean",
  "Africa"
];

const Search = () => {
  const path = usePathname();
  const params = useLocalSearchParams<{ query?: string }>();
  const [search, setSearch] = useState(params.query);
  const [selectedContinent, setSelectedContinent] = useState<string>("Region");
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  const debouncedSearch = useDebouncedCallback((text: string) => {
    router.setParams({ query: text });
  }, 500);

  const handleSearch = (text: string) => {
    setSearch(text);
    debouncedSearch(text);
  };

  const handleSelectContinent = (continent: string) => {
    setSelectedContinent(continent);
    setIsDropdownVisible(false);
  };

  return (
    <>
      <View className="flex-row items-center gap-8 mt-5">
        <View className="flex-1 flex-row items-center border border-primary-100 rounded-lg py-2 px-4">
          
          <SearchIcon color="#1ABC9C"  size={18}/>
          <TextInput
            value={search}
            onChangeText={handleSearch}
            placeholder="Search "
            className=" font-rubik text-red-200 ml-2 flex-1"
            placeholderTextColor="#D9D9D9"
            
            
          />
        </View>

        <TouchableOpacity 
          onPress={() => setIsDropdownVisible(true)}
          className="border border-primary-100 rounded-lg py-2 px-3 flex-row items-center"
        >
          <Text className="text-text font-rubik-bold mr-2">{selectedContinent}</Text>
          {/* <Image source={icons.filter} className="size-4" /> */}
          <ChevronDown size={16 }  color="#1ABC9C"/>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDropdownVisible(false)}
      >
        <Pressable 
          className="flex-1 bg-black/30"
          onPress={() => setIsDropdownVisible(false)}
        >
          <View className="bg-white mt-32 mx-4 rounded-lg overflow-hidden">
            <FlatList
              data={CONTINENTS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectContinent(item)}
                  className="px-4 py-3 border-b border-gray-100"
                >
                  <Text className="text-sm font-rubik text-black-300">{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export default Search;