import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface RecruitmentPost {
  id: string;
  user_id: string;
  content: string;
  sport: string;
  location: string;
  is_urgent: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string;
  user_liked: boolean;
  user_bookmarked: boolean;
}

export interface RecruitmentReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

export const useRecruitment = () => {
  const [posts, setPosts] = useState<RecruitmentPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Initialize user state
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch all posts
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try using the RPC function first
      let { data, error } = await supabase.rpc('get_recruitment_posts');

      // If RPC fails, try direct query
      if (error && error.message?.includes('function')) {
        console.log('RPC function not found, trying direct query...');
        const result = await supabase
          .from('recruitment_posts')
          .select(`
            id,
            user_id,
            content,
            sport,
            location,
            is_urgent,
            likes_count,
            comments_count,
            created_at,
            profiles!inner(username, full_name, avatar_url)
          `)
          .order('created_at', { ascending: false });
        
        // Transform the data to match expected format
        data = result.data?.map(post => {
          const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
          return {
            ...post,
            username: profile?.username,
            full_name: profile?.full_name,
            avatar_url: profile?.avatar_url,
            user_liked: false,
            user_bookmarked: false
          };
        });
        error = result.error;
      }

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  // Create a new post
  const createPost = async (content: string, sport: string, location: string, isUrgent = false) => {
    try {
      console.log('Creating post with user:', user);
      
      if (!user) {
        console.error('No user found');
        throw new Error('Authentication required');
      }
      
      console.log('Calling create_recruitment_post with:', {
        p_content: content,
        p_sport: sport,
        p_location: location,
        p_is_urgent: isUrgent
      });

      // Try using the RPC function first, fallback to direct insert
      let { data, error } = await supabase.rpc('create_recruitment_post', {
        p_content: content,
        p_sport: sport,
        p_location: location,
        p_is_urgent: isUrgent
      });

      // If RPC fails, try direct insert
      if (error && error.message?.includes('function')) {
        console.log('RPC function not found, trying direct insert...');
        const result = await supabase
          .from('recruitment_posts')
          .insert({
            content: content,
            sport: sport,
            location: location,
            is_urgent: isUrgent,
            user_id: user.id
          })
          .select('id')
          .single();
        
        data = result.data;
        error = result.error;
      }

      console.log('Response:', { data, error });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      // Refresh posts after creating
      await fetchPosts();
      return data;
    } catch (err) {
      console.error('Full error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      setError(errorMessage);
      throw err;
    }
  };

  // Toggle like on a post
  const toggleLike = async (postId: string) => {
    try {
      if (!user) throw new Error('Authentication required');

      const { data, error } = await supabase.rpc('toggle_recruitment_like', {
        post_id: postId
      });

      if (error) throw error;

      // Update local state optimistically
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? {
                ...post,
                user_liked: data,
                likes_count: data 
                  ? post.likes_count + 1 
                  : post.likes_count - 1
              }
            : post
        )
      );

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle like');
      throw err;
    }
  };

  // Toggle bookmark on a post
  const toggleBookmark = async (postId: string) => {
    try {
      if (!user) throw new Error('Authentication required');

      const { data, error } = await supabase.rpc('toggle_recruitment_bookmark', {
        post_id: postId
      });

      if (error) throw error;

      // Update local state optimistically
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, user_bookmarked: data }
            : post
        )
      );

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle bookmark');
      throw err;
    }
  };

  // Add a reply to a post
  const addReply = async (postId: string, content: string) => {
    try {
      if (!user) throw new Error('Authentication required');

      const { data, error } = await supabase.rpc('add_recruitment_reply', {
        p_post_id: postId,
        p_content: content
      });

      if (error) throw error;

      // Update local state optimistically
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        )
      );

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reply');
      throw err;
    }
  };

  // Get replies for a post
  const getReplies = async (postId: string): Promise<RecruitmentReply[]> => {
    try {
      const { data, error } = await supabase.rpc('get_recruitment_replies', {
        p_post_id: postId
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch replies');
      throw err;
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to new posts
    const postsSubscription = supabase
      .channel('recruitment_posts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'recruitment_posts' },
        () => {
          // Refresh posts when changes occur
          fetchPosts();
        }
      )
      .subscribe();

    // Subscribe to new replies
    const repliesSubscription = supabase
      .channel('recruitment_replies')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'recruitment_replies' },
        () => {
          // Refresh posts to update comment counts
          fetchPosts();
        }
      )
      .subscribe();

    // Subscribe to likes changes
    const likesSubscription = supabase
      .channel('recruitment_likes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'recruitment_likes' },
        () => {
          // Refresh posts to update like counts
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      postsSubscription.unsubscribe();
      repliesSubscription.unsubscribe();
      likesSubscription.unsubscribe();
    };
  }, [user]);

  return {
    posts,
    loading,
    error,
    fetchPosts,
    createPost,
    toggleLike,
    toggleBookmark,
    addReply,
    getReplies
  };
};