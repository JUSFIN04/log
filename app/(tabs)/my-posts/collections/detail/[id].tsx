import { usePocketBase } from '@/context/pocketbase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Post = {
  id: string;
  title: string;
  text?: string;
  created: string;
};

export default function CollectionViewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { pb } = usePocketBase();
  
  const [isLoading, setIsLoading] = useState(true);
  const [collection, setCollection] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  
  useEffect(() => {
    const loadCollection = async () => {
      if (!pb) {
        return;
      }
      try {
        const record = await pb.collection('Post_Collection').getOne(id as string, {
          expand: 'children_posts',
        });
        
        setCollection(record);
        
        if (record.expand?.children_posts) {
          setPosts(record.expand.children_posts);
        }
      } catch (error) {
        console.error('Error loading collection:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (pb && id) {
      loadCollection();
    }
  }, [pb, id]);
  
  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => router.push(`/posts/${item.id}`)}
    >
      <Text style={styles.postTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.postDate}>{new Date(item.created).toLocaleDateString()}</Text>
      <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
    </TouchableOpacity>
  );
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{collection?.title}</Text>
        {collection?.text && (
          <Text style={styles.description}>{collection.text}</Text>
        )}
      </View>
      
      <Text style={styles.sectionTitle}>Posts in this Collection</Text>
      
      {posts.length > 0 ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPostItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts in this collection</Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts in this collection</Text>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push(`/posts/collections/${id}`)}
      >
        <Ionicons name="pencil" size={20} color="white" />
        <Text style={styles.editButtonText}>Edit Collection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    margin: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  postItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  postDate: {
    color: '#8E8E93',
    marginRight: 8,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  editButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
});