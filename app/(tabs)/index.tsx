import { usePocketBase } from '@/context/pocketbase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Type definitions
type Post = {
  id: string;
  title: string;
  text?: string;
  post_type?: string;
  created: string;
  rating?: string;
  poster?: string;
  media?: string[];
  tags?: string[];  // Add tags array
  creator?: { id: string; name: string };
  viewType?: 'banner' | 'photo' | 'card';
  difficulty?: string;  // Add difficulty
};

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewType, setViewType] = useState<'banner' | 'photo' | 'card'>('card');
  const { pb } = usePocketBase();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Update the fetchPosts function:
  const fetchPosts = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      if (!pb) return;

      console.log("Attempting to fetch posts...");

      // Simplify the query - remove the problematic filter
      const records = await pb.collection('Post').getList(1, 20, {
        sort: '-created',
        expand: 'Creator'  // Only expand Creator for now, add Tags later if needed
      });

      console.log('Fetched posts:', records.items.length);

      setPosts(
        records.items.map((item: any) => ({
          id: item.id,
          title: item.Title || '',
          text: item.Text || '',
          post_type: item.Post_Type || '',
          created: item.created,
          rating: Array.isArray(item.Rating) ? item.Rating[0] || '0' : '0',
          poster: item.Poster,
          media: item.Media,
          // Get creator info from expanded relation
          creator: item.expand?.Creator?.[0]
            ? {
                id: item.expand.Creator[0].id,
                name: item.expand.Creator[0].name || 'Unknown User',
              }
            : undefined,
          // Don't try to extract tags for now until we confirm Creator expansion works
          tags: [],
        }))
      );
    } catch (error) {
      console.error('Error fetching posts:', error);
      // Add more detailed error logging
      if (typeof error === 'object' && error !== null) {
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [pb]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  // Function to cycle through view types
  const cycleViewType = () => {
    setViewType((current) => {
      if (current === 'banner') return 'photo';
      if (current === 'photo') return 'card';
      return 'banner';
    });
  };

  // Post view components
  const renderBannerView = (item: Post) => (
    <TouchableOpacity
      style={styles.bannerContainer}
      onPress={() =>
        router.push({
          pathname: '/my-posts/[id]',
          params: { id: item.id, readonly: 'true' },
        })
      }>
      <View style={styles.bannerImageContainer}>
        {item.poster ? (
          <Image
            source={{
              uri: `https://pocketbase-production-38ea2.up.railway.app/api/files/Post/${item.id}/${item.poster}`,
            }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.bannerImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={48} color="#aaaaaa" />
          </View>
        )}
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerTitle}>{item.title}</Text>
          {item.creator && (
            <Text style={styles.bannerAuthor}>By {item.creator.name}</Text>
          )}
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
      onPress={() =>
        router.push({
          pathname: '/my-posts/[id]',
          params: { id: item.id, readonly: 'true' },
        })
      }>
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
          <Ionicons name="image-outline" size={32} color="#aaaaaa" />
        </View>
      )}
      <View style={styles.photoCardOverlay}>
        <Text style={styles.photoCardTitle}>{item.title}</Text>
        {item.creator && (
          <Text style={styles.photoCardAuthor}>By {item.creator.name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPostCard = (item: Post) => (
    <TouchableOpacity
      style={styles.postCardContainer}
      onPress={() =>
        router.push({
          pathname: '/my-posts/[id]',
          params: { id: item.id, readonly: 'true' },
        })
      }>
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
      
      {/* Tags row */}
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((tag, index) => (
            <View key={index} style={styles.tagContainer}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.postCardFooter}>
        {item.creator && (
          <Text style={styles.postCardAuthor}>By {item.creator.name}</Text>
        )}
        <Text style={styles.postCardDate}>
          {new Date(item.created).toLocaleDateString()}
        </Text>
        {item.post_type && (
          <View style={styles.typeContainer}>
            <Text style={styles.typeText}>{item.post_type}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPostItem = ({ item }: { item: Post }) => {
    switch (viewType) {
      case 'banner':
        return renderBannerView(item);
      case 'photo':
        return renderPhotoCard(item);
      default:
        return renderPostCard(item);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: insets.top > 0 ? 0 : 12 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Community Feed</Text>
          <TouchableOpacity style={styles.viewTypeButton} onPress={cycleViewType}>
            <Ionicons
              name={
                viewType === 'banner'
                  ? 'reorder-four-outline'
                  : viewType === 'photo'
                  ? 'grid-outline'
                  : 'list-outline'
              }
              size={24}
              color="#007AFF"
            />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPostItem}
            contentContainerStyle={styles.listContent}
            numColumns={viewType === 'photo' ? 2 : 1}
            key={viewType} // Force re-render on view type change
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No posts found</Text>
              </View>
            )}
            ListHeaderComponent={
              <Text style={styles.subtitle}>
                Discover what&apos;s happening in the community
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F7', // Match your header background color
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  viewTypeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },

  // Banner View styles
  bannerContainer: {
    width: '100%',
    height: 180,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bannerImageContainer: {
    width: '100%',
    height: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  bannerAuthor: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  bannerDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Photo Card styles
  photoCardContainer: {
    flex: 1,
    height: 200,
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  photoCardImage: {
    width: '100%',
    height: '100%',
  },
  photoCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
  },
  photoCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  photoCardAuthor: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Post Card styles
  postCardContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  postCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  postCardImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  postCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 12,
  },
  postCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  postCardAuthor: {
    fontSize: 14,
    color: '#555',
    marginRight: 8,
    flex: 1,
  },
  postCardDate: {
    fontSize: 12,
    color: '#8E8E93',
  },

  // Misc styles
  placeholderImage: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tagContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#555',
  },
  typeContainer: {
    backgroundColor: '#e1f5fe', // Light blue for type
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  typeText: {
    fontSize: 12,
    color: '#0277bd',
    fontWeight: '500',
  },
});
