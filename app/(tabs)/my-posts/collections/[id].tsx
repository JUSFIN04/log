import { useAuth } from '@/context/auth';
import { usePocketBase } from '@/context/pocketbase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams();
  const isEditing = id !== 'create';
  const router = useRouter();
  const { pb } = usePocketBase();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  type Post = { id: string; title: string; [key: string]: any };
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  
  useEffect(() => {
    if (pb) {
      if (isEditing) {
        loadCollection();
      }
      loadUserPosts();
    }
  }, [pb, id]);
  
  const loadCollection = async () => {
    if (!pb) {
      Alert.alert('Error', 'PocketBase client is not available');
      setIsLoading(false);
      return;
    }
    try {
      const record = await pb.collection('Post_Collection').getOne(id as string, {
        expand: 'children_posts',
      });
      setTitle(record.title || '');
      setText(record.text || '');
      
      // Set selected posts if available
      if (record.expand?.children_posts) {
        const postIds: string[] = (record.expand.children_posts as Post[]).map((post: Post) => post.id);
        setSelectedPosts(postIds);
      }
    } catch (error) {
      console.error('Error loading collection:', error);
      Alert.alert('Error', 'Failed to load collection details');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadUserPosts = async () => {
    if (!pb) {
      console.error('PocketBase client is not available');
      return;
    }
    try {
      const records = await pb.collection('List').getList(1, 50, {
        filter: `creator.id = '${user?.id}'`,
        sort: '-created',
      });
      setUserPosts(
        records.items.map((item: any) => ({
          id: item.id,
          title: item.title,
          ...item,
        }))
      );
    } catch (error) {
      console.error('Error loading user posts:', error);
    }
  };
  
  const togglePostSelection = (postId: string) => {
    setSelectedPosts(current => {
      if (current.includes(postId)) {
        return current.filter(id => id !== postId);
      } else {
        return [...current, postId];
      }
    });
  };
  
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const data = {
        title,
        text,
        creator: user?.id,
        children_posts: selectedPosts,
      };
      
      if (!pb) {
        Alert.alert('Error', 'PocketBase client is not available');
        return;
      }
      if (isEditing) {
        await pb.collection('Post_Collection').update(id as string, data);
      } else {
        await pb.collection('Post_Collection').create(data);
      }
      
      router.back();
    } catch (error) {
      console.error('Error saving collection:', error);
      Alert.alert('Error', 'Failed to save collection');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter collection title"
            maxLength={100}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={text}
            onChangeText={setText}
            placeholder="Enter collection description"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Posts</Text>
          {userPosts.length > 0 ? (
            <ScrollView style={styles.postsContainer} nestedScrollEnabled>
              {userPosts.map(post => (
                <TouchableOpacity
                  key={post.id}
                  style={[
                    styles.postItem,
                    selectedPosts.includes(post.id) && styles.selectedPostItem
                  ]}
                  onPress={() => togglePostSelection(post.id)}
                >
                  <Text
                    style={[
                      styles.postItemText,
                      selectedPosts.includes(post.id) && styles.selectedPostItemText
                    ]}
                    numberOfLines={1}
                  >
                    {post.title}
                  </Text>
                  {selectedPosts.includes(post.id) && (
                    <Ionicons name="checkmark" size={20} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noPosts}>No posts available. Create some posts first.</Text>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update Collection' : 'Create Collection'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
  },
  postsContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  postItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  selectedPostItem: {
    backgroundColor: '#007AFF',
  },
  postItemText: {
    fontSize: 16,
    flex: 1,
  },
  selectedPostItemText: {
    color: 'white',
  },
  noPosts: {
    padding: 16,
    color: '#8E8E93',
    textAlign: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});