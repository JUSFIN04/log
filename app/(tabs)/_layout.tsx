import { useAuth } from "@/context/auth";
import { usePocketBase } from "@/context/pocketbase";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert
} from "react-native";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const isEditing = id !== "create" && id !== "[id]"; // Check for both cases
  const router = useRouter();
  const { pb } = usePocketBase();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [postType, setPostType] = useState("");
  const [rating, setRating] = useState("0");

  // Only load post data if this is an edit (not a new post)
  useEffect(() => {
    if (isEditing && pb) {
      loadPost();
    } else {
      // This is a new post, no need to load data
      setIsLoading(false);
    }
  }, [pb, id, isEditing]);

  const loadPost = async () => {
    try {
      // Additional validation to ensure ID is valid
      if (!id || typeof id !== "string" || id === "create" || id === "[id]") {
        console.log("Invalid post ID, skipping data load:", id);
        setIsLoading(false);
        return;
      }

      console.log("Loading post with ID:", id);
      if (!pb) {
        console.error("PocketBase instance is null");
        setIsLoading(false);
        return;
      }
      const record = await pb.collection("Post").getOne(id);

      console.log("Post loaded successfully:", record.id);

      // Use capitalized field names to match PocketBase schema
      setTitle(record.Title || "");
      setText(record.Text || "");
      setPostType(record.Post_Type || "");

      // Rating is an array in PocketBase
      setRating(record.Rating?.[0] || "0");
    } catch (error) {
      console.error("Error loading post:", error);
      // More detailed error logging
      if (typeof error === "object" && error !== null) {
        if ("status" in error) console.log("Status code:", (error as any).status);
        if ("data" in error) console.log("Error data:", JSON.stringify((error as any).data));
      }

      if (typeof error === "object" && error !== null && "status" in error && (error as any).status === 404) {
        Alert.alert("Error", "Post not found. It may have been deleted.");
        router.back();
      } else {
        Alert.alert("Error", "Failed to load post details");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }

    setIsSaving(true);

    if (!pb || !user) {
      Alert.alert("Error", "You must be logged in to save posts");
      setIsSaving(false);
      return;
    }

    try {
      const data = {
        Title: title,
        Text: text,
        Post_Type: postType,
        Rating: [rating], // Rating is an array in PocketBase
        Creator: [user.id], // Creator is an array in PocketBase
      };

      if (isEditing) {
        await pb.collection("Post").update(id as string, data);
        console.log("Post updated successfully");
      } else {
        const record = await pb.collection("Post").create(data);
        console.log("Post created successfully with ID:", record.id);
      }

      router.back();
    } catch (error) {
      console.error("Error saving post:", error);
      // More detailed error logging
      if (typeof error === "object" && error !== null && "status" in error) {
        console.log("Status code:", (error as any).status);
      }
      if (typeof error === "object" && error !== null && "data" in error) {
        console.log("Error data:", JSON.stringify((error as any).data));
      }

      Alert.alert("Error", "Failed to save post");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#007AFF",
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color }) => (
              <Ionicons name="compass" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="my-posts/index"
          options={{
            title: "My Posts",
            tabBarIcon: ({ color }) => (
              <Ionicons name="document-text" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person" size={24} color={color} />
            ),
          }}
        />
        
        {/* Hide dynamic routes from tab bar */}
        <Tabs.Screen
          name="my-posts/[id]"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />
        <Tabs.Screen
          name="my-posts/collections/[id]"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="my-posts/collections/detail/[id]"
          options={{
            href: null,
          }}
        />
      </Tabs>
      {/* Add your post detail UI here */}
    </>
  );
}
