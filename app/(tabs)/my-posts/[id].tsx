import { useAuth } from "@/context/auth";
import { usePocketBase } from "@/context/pocketbase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PostDetailScreen() {
  const insets = useSafeAreaInsets();

  // Add more robust parameter handling
  const params = useLocalSearchParams();
  const id = params.id || 'create';
  console.log("Route params:", JSON.stringify(params));
  
  // More explicit validation of the ID parameter
  const isEditing = typeof id === "string" && id !== "create" && id !== "[id]";
  const router = useRouter();
  const { pb } = usePocketBase();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [postType, setPostType] = useState("");
  const [rating, setRating] = useState("0");
  const [isPublished, setIsPublished] = useState(true);

  // At the top of your component, add state for focus tracking
  const [titleFocused, setTitleFocused] = useState(false);
  const [contentFocused, setContentFocused] = useState(false);
  const [typeFocused, setTypeFocused] = useState(false);

  // Only load post data if this is an edit (not a new post)
  // Removed duplicate loadPost declaration to fix redeclaration error.

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
      
      // Make sure we're using the actual ID string
      const postId = String(id);
      const record = await pb.collection("Post").getOne(postId);

      console.log("Post loaded successfully:", record.id);

      // Use capitalized field names to match PocketBase schema
      setTitle(record.Title || "");
      setText(record.Text || "");
      setPostType(record.Post_Type || "");

      // Rating is an array in PocketBase
      setRating(record.Rating?.[0] || "0");
      
      // Also set published status if available
      if (typeof record.Published === "boolean") {
        setIsPublished(record.Published);
      }
      
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

  useEffect(() => {
    console.log("useEffect triggered - isEditing:", isEditing, "id:", id);
    
    // Fix: Don't attempt to load post data immediately on component mount
    // Use a short delay to ensure all params are properly loaded
    const timer = setTimeout(() => {
      // Only try to load posts if we have a valid ID and we're in edit mode
      if (isEditing && pb && id && id !== "create" && id !== "[id]") {
        loadPost();
      } else {
        // This is a new post or readonly mode, no need to load data for editing
        setIsLoading(false);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [pb, id, isEditing, loadPost]);

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
        Published: isPublished, // Add the published status
      };

      if (isEditing) {
        await pb.collection("Post").update(id as string, data);
        console.log("Post updated successfully");
      } else {
        const record = await pb.collection("Post").create(data);
        console.log("Post created successfully with ID:", record.id);
      }

      // Single navigation action after the operation completes
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

  const togglePublishStatus = () => {
    setIsPublished(!isPublished);
  };

  const handleSharePost = async () => {
    if (!title) {
      Alert.alert('Error', 'Please add a title before sharing');
      return;
    }
    
    try {
      await Share.share({
        message: `Check out my post: ${title}${text ? '\n\n' + text : ''}`,
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  // Add UI here
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { paddingTop: insets.top || 12 }]}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.contentContainer}
            // Add bottom padding for keyboard and bottom inset
            contentInsetAdjustmentBehavior="automatic"
          >
            <View style={styles.floatingInputGroup}>
              <Text 
                style={[
                  styles.floatingLabel, 
                  (titleFocused || title) ? styles.floatingLabelActive : null
                ]}
              >
                Title
              </Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Enter post title"
                placeholderTextColor="#A0A0A0"
                value={title}
                onChangeText={setTitle}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Content</Text>
              <TextInput
                style={styles.contentInput}
                placeholder="Enter post content"
                placeholderTextColor="#A0A0A0"
                multiline
                value={text}
                onChangeText={setText}
              />
            </View>

            <View style={styles.floatingInputGroup}>
              <Text 
                style={[
                  styles.floatingLabel, 
                  (typeFocused || postType) ? styles.floatingLabelActive : null
                ]}
              >
                Post Type
              </Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., Article, Recipe, Review"
                placeholderTextColor="#A0A0A0"
                value={postType}
                onChangeText={setPostType}
                onFocus={() => setTypeFocused(true)}
                onBlur={() => setTypeFocused(false)}
              />
            </View>
            
            <View style={styles.ratingContainer}>
              <Text style={styles.label}>Rating:</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star.toString())}
                  >
                    <Ionicons
                      name={parseInt(rating) >= star ? "star" : "star-outline"}
                      size={32}
                      color={parseInt(rating) >= star ? "#FFD700" : "#ccc"}
                      style={styles.starIcon}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={togglePublishStatus}
              >
                <Ionicons
                  name={isPublished ? "eye" : "eye-off"}
                  size={24}
                  color="#007AFF"
                />
                <Text style={styles.actionButtonText}>
                  {isPublished ? "Published" : "Draft"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSharePost}
              >
                <Ionicons name="share-outline" size={24} color="#007AFF" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Update Post" : "Create Post"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7", // Slightly gray background to contrast with white inputs
    paddingTop: 12, // Add some top padding
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    padding: 16,
  },
  titleInput: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  contentInput: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E1E1E1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  input: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  ratingContainer: {
    marginBottom: 24,
  },
  stars: {
    flexDirection: "row",
  },
  starIcon: {
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionButtonText: {
    marginTop: 4,
    color: '#007AFF',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  floatingInputGroup: {
    position: 'relative',
    marginBottom: 24,
  },
  floatingLabel: {
    position: 'absolute',
    left: 10,
    top: 18,
    fontSize: 14,
    color: '#A0A0A0',
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 4,
  },
  floatingLabelActive: {
    top: -8,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});
