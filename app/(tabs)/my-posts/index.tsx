import { useAuth } from "@/context/auth";
import { usePocketBase } from "@/context/pocketbase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get("window");

// Update Post type with viewType
type Post = {
  id: string;
  title: string;
  text?: string;
  post_type?: string;
  created: string;
  rating?: string;
  poster?: string;
  media?: string[];
  tags?: string[];
  viewType?: "banner" | "photo" | "card";
};

type PostCollection = {
  id: string;
  title: string;
  text?: string;
  created: string;
};

export default function PostsScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [collections, setCollections] = useState<PostCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts"); // 'posts' or 'collections'
  const [viewType, setViewType] = useState<"banner" | "photo" | "card">("card");
  const { pb } = usePocketBase();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);

    try {
      if (!pb || !user) return;

      if (activeTab === "posts") {
        const records = await pb.collection("Post").getList(1, 50, {
          filter: `Creator ~ '${user.id}'`,
          sort: "-created",
          expand: "Tags",
        });

        setPosts(
          records.items.map((item: any) => ({
            id: item.id,
            title: item.Title,
            text: item.Text,
            post_type: item.Post_Type,
            created: item.created,
            rating: item.Rating?.[0] || "0",
            poster: item.Poster, // Make sure to include the poster/image field
            media: item.Media,
            // Assign a random view type for demo purposes
            // In production, you'd store this preference or let users set it per post
            viewType: item.View_Type || viewType,
          }))
        );
      } else {
        const records = await pb.collection("Post_Collection").getList(1, 50, {
          filter: `Creator ~ '${user.id}'`, // Using ~ for array contains
          sort: "-created",
        });

        setCollections(
          records.items.map((item: any) => ({
            id: item.id,
            title: item.Title || item.title,
            text: item.Text || item.text,
            created: item.created,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      // Add more detailed error logging
      if (typeof error === "object" && error !== null && "status" in error) {
        const err = error as { status?: any; message?: any };
        console.error(`Status: ${err.status}, Message: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [pb, user, activeTab, viewType]);

  // Fetch data when the component comes into focus
  useFocusEffect(
    useCallback(() => {
      if (pb && user) {
        fetchData();
      }
    }, [pb, user, fetchData])
  );

  const handleDeletePost = async (id: string) => {
    if (!pb) return;

    try {
      // Updated collection name
      await pb.collection("Post").delete(id);
      setPosts(posts.filter((post) => post.id !== id));
    } catch (error) {
      console.error("Error deleting post:", error);
      // Add user feedback
      Alert.alert("Error", "Failed to delete post. Please try again.");
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!pb) return;

    try {
      await pb.collection("Post_Collection").delete(id);
      setCollections(collections.filter((collection) => collection.id !== id));
    } catch (error) {
      console.error("Error deleting collection:", error);
    }
  };

  // Add this function to cycle through view types
  const cycleViewType = () => {
    setViewType((current) => {
      if (current === "banner") return "photo";
      if (current === "photo") return "card";
      return "banner";
    });
  };

  // Add these functions to render different post view types
  const renderBannerView = (item: Post) => (
    <TouchableOpacity
      style={styles.bannerContainer}
      onPress={() => router.push(`./${item.id}`)}
    >
      <View style={styles.bannerImageContainer}>
        <Image
          source={
            item.poster
              ? {
                  uri: `https://pocketbase-production-38ea2.up.railway.app/api/files/Post/${item.id}/${item.poster}`,
                }
              : { uri: 'https://via.placeholder.com/400x200/CCCCCC/808080?text=No+Image' } // Online placeholder
          }
          style={styles.bannerImage}
          resizeMode="cover"
        />
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerTitle}>{item.title}</Text>
          <Text style={styles.bannerDate}>
            {new Date(item.created).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPhotoCard = (item: Post) => (
    <TouchableOpacity
      style={styles.photoCardContainer}
      onPress={() => router.push(`/my-posts/${item.id}`)}
    >
      {item.poster ? (
        <Image
          source={{
            uri: `https://pocketbase-production-38ea2.up.railway.app/api/files/Post/${item.id}/${item.poster}`,
          }}
          style={styles.photoCardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.photoCardImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={48} color="#aaaaaa" />
        </View>
      )}
      <View style={styles.photoCardOverlay}>
        <Text style={styles.photoCardTitle}>{item.title}</Text>
        {item.text && (
          <Text style={styles.photoCardCaption} numberOfLines={2}>
            {item.text}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPostCard = (item: Post) => (
    <TouchableOpacity
      style={styles.postCardContainer}
      onPress={() => router.push(`/my-posts/${item.id}`)}
    >
      <Text style={styles.postCardTitle}>{item.title}</Text>
      {item.poster && (
        <Image
          source={{
            uri: `https://pocketbase-production-38ea2.up.railway.app/api/files/Post/${item.id}/${item.poster}`,
          }}
          style={styles.postCardImage}
          resizeMode="cover"
        />
      )}
      {item.text && (
        <Text style={styles.postCardText} numberOfLines={3}>
          {item.text}
        </Text>
      )}
      <View style={styles.postCardFooter}>
        <Text style={styles.postCardDate}>
          {new Date(item.created).toLocaleDateString()}
        </Text>
        {item.post_type && (
          <View style={styles.tagContainer}>
            <Text style={styles.tagText}>{item.post_type}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Update your renderPostItem to use the appropriate view based on viewType
  const renderPostItem = ({ item, index }: { item: Post; index: number }) => {
    // For photo view type with 2 columns
    if (viewType === 'photo') {
      return (
        <View style={styles.photoItemWrapper}>
          {renderPhotoCard(item)}
        </View>
      );
    }
    
    // For other view types
    return (
      <View style={styles.postItemWrapper}>
        {viewType === 'banner' && renderBannerView(item)}
        {viewType === 'card' && renderPostCard(item)}
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePost(item.id)}
        >
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderCollectionItem = ({ item }: { item: PostCollection }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => router.push(`/my-posts/collections/detail/${item.id}`)}
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemDate}>
          {new Date(item.created).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteCollectionButton} // Changed from deleteButton
        onPress={() => handleDeleteCollection(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    fetchData();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: insets.top > 0 ? 0 : 12 }]}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "posts" && styles.activeTab]}
            onPress={() => handleTabChange("posts")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "posts" && styles.activeTabText,
              ]}
            >
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "collections" && styles.activeTab]}
            onPress={() => handleTabChange("collections")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "collections" && styles.activeTabText,
              ]}
            >
              Collections
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <>
            {activeTab === "posts" && (
              <View style={styles.viewTypeContainer}>
                <TouchableOpacity
                  style={styles.viewTypeButton}
                  onPress={cycleViewType}
                >
                  <Ionicons
                    name={
                      viewType === "banner"
                        ? "reorder-four-outline"
                        : viewType === "photo"
                        ? "grid-outline"
                        : "list-outline"
                    }
                    size={24}
                    color="#007AFF"
                  />
                  <Text style={styles.viewTypeText}>
                    {viewType === "banner"
                      ? "Banner View"
                      : viewType === "photo"
                      ? "Photo Cards"
                      : "Post Cards"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "posts" ? (
              <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderPostItem}
                contentContainerStyle={styles.listContent}
                numColumns={viewType === 'photo' ? 2 : 1}
                key={viewType} // Force re-render on view type change
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No posts found</Text>
                  </View>
                )}
              />
            ) : (
              <FlatList
                data={collections}
                keyExtractor={(item) => item.id}
                renderItem={renderCollectionItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No collections found</Text>
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={styles.fab}
              onPress={() =>
                router.push(
                  activeTab === "posts"
                    ? "./posts/create"
                    : "./posts/collections/create"
                )
              }
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white", // Match your tabs background
  },
  container: {
    flex: 1,
    backgroundColor: "#F9F9FB",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
    backgroundColor: "white",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: "row",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 8,
  },
  tagContainer: {
    backgroundColor: "#E1F5FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  tagText: {
    color: "#0288D1",
    fontSize: 12,
  },
  deleteCollectionButton: {
    // Changed from deleteButton
    justifyContent: "center",
    padding: 8,
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "white",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },

  // Add new styles for the view type selector
  viewTypeContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E1E1",
  },
  viewTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
  },
  viewTypeText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#007AFF",
  },

  // Banner View styles
  bannerContainer: {
    width: "100%",
    height: 180,
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bannerImageContainer: {
    width: "100%",
    height: "100%",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 16,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  bannerDate: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },

  // Photo Card styles
  photoCardContainer: {
    width: width / 2 - 24, // Half width minus padding
    height: 200,
    margin: 8,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  photoCardImage: {
    width: "100%",
    height: "100%",
  },
  photoCardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 12,
  },
  photoCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  photoCardCaption: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  placeholderImage: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Post Card styles
  postCardContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  postCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  postCardImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  postCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
    marginBottom: 12,
  },
  postCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postCardDate: {
    fontSize: 14,
    color: "#8E8E93",
  },

  // Wrapper to position delete button
  postItemWrapper: {
    position: "relative",
  },
  photoItemWrapper: {
    width: width / 2 - 24, // Half width minus padding
    margin: 8,
  },
});
