import { useState, useEffect } from 'react';
import { supabase, auth, profiles } from '../lib/supabase';

export interface RecruitmentPost {
  id: string;
  user_id: string;
  content: string;
  sport?: string;
  location?: string;
  is_urgent: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string;
  user_liked: boolean;
  user_bookmarked: boolean;
  expires_at?: string;
  is_expired?: boolean;
}

export const useRecruitmentSimple = () => {
  const [posts, setPosts] = useState<RecruitmentPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [canPost, setCanPost] = useState(true);
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const [lastPostTime, setLastPostTime] = useState<Date | null>(null);

  // Initialize user state using the same pattern as Profile component
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('Loading current user...');
        
        // Get current authenticated user
        const { user: currentUser, error: authError } = await auth.getCurrentUser();
        
        console.log('Auth result:', { currentUser, authError });
        
        if (authError) {
          console.error('Auth error:', authError);
          setError('Authentication required');
          return;
        }
        
        if (!currentUser) {
          console.log('No user found');
          setError('Please log in to use the recruitment feed');
          return;
        }

        setUser(currentUser);
        console.log('User set:', currentUser);
        
        // Get user profile data
        const { data: profileData, error: profileError } = await profiles.getProfile(currentUser.id);
        
        if (profileError) {
          console.error('Profile error:', profileError);
        } else {
          setUserProfile(profileData);
          console.log('User profile loaded:', profileData);
        }
        
      } catch (err) {
        console.error('Error loading user:', err);
        setError('Failed to load user data');
      }
    };

    loadUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        setUser(session.user);
        // Load profile for the new user
        const { data: profileData } = await profiles.getProfile(session.user.id);
        setUserProfile(profileData);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Create recruitment_posts table if it doesn't exist
  const ensureTablesExist = async () => {
    try {
      console.log('Attempting to create recruitment_posts table...');
      
      // Try a simple test insert to see if table exists
      const testResult = await supabase
        .from('recruitment_posts')
        .select('id')
        .limit(1);
      
      if (testResult.error && testResult.error.message.includes('does not exist')) {
        console.log('Table does not exist, would need to create it via migration');
        return false;
      }
      
      console.log('Table exists or accessible');
      return true;
    } catch (err) {
      console.log('Table check failed:', err);
      return false;
    }
  };

  // Fetch all posts using direct query with fallback
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching posts...');

      // Try recruitment_posts first
      let { data, error } = await supabase
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
          created_at
        `)
        .order('created_at', { ascending: false });

      // If recruitment_posts fails, try user_posts as fallback
      if (error) {
        console.log('recruitment_posts failed, trying user_posts as fallback...');
        console.log('recruitment_posts error:', JSON.stringify(error, null, 2));
        
        const fallbackResult = await supabase
          .from('user_posts')
          .select(`
            id,
            user_id,
            caption,
            created_at
          `)
          .ilike('caption', 'RECRUITMENT_POST:%')
          .order('created_at', { ascending: false });
        
        // Transform user_posts data to match recruitment_posts format
        data = fallbackResult.data?.map(post => {
          // Remove the RECRUITMENT_POST: marker from the caption
          const cleanContent = post.caption?.replace('RECRUITMENT_POST:', '') || '';
          
          return {
            id: post.id,
            user_id: post.user_id,
            content: cleanContent,
            sport: 'General',
            location: 'Global', 
            is_urgent: cleanContent.includes('🚨') || false,
            likes_count: 0,
            comments_count: 0,
            created_at: post.created_at,
            profiles: null
          };
        }) || null;
        error = fallbackResult.error;
      }

      console.log('Fetch result:', { data, error });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Load user profiles for each post
      const transformedPosts = await Promise.all((data || []).map(async (post) => {
        console.log('Loading profile for user:', post.user_id);
        
        // Get user profile from users table
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('username, full_name, avatar_url')
          .eq('id', post.user_id)
          .single();

        console.log('Profile data for', post.user_id, ':', profileData, profileError);

        // Check if current user has liked/bookmarked this post from database
        let userLiked = false;
        let userBookmarked = false;
        let likesCount = 0;
        let commentsCount = 0;

        if (user?.id) {
          // Check if user liked this post
          const { data: likeData } = await supabase
            .from('recruitment_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('post_id', post.id)
            .single();
          
          userLiked = !!likeData;

          // Check if user bookmarked this post  
          const { data: bookmarkData } = await supabase
            .from('recruitment_bookmarks')
            .select('id')
            .eq('user_id', user.id)
            .eq('post_id', post.id)
            .single();
            
          userBookmarked = !!bookmarkData;
        }

        // Get total likes count for this post
        const { count: likesCountData } = await supabase
          .from('recruitment_likes')
          .select('id', { count: 'exact' })
          .eq('post_id', post.id);
        
        likesCount = likesCountData || 0;

        // Get total comments count for this post  
        const { count: commentsCountData } = await supabase
          .from('recruitment_comments')
          .select('id', { count: 'exact' })
          .eq('post_id', post.id);
          
        commentsCount = commentsCountData || 0;

        // Calculate expiry time (24 hours from creation)
        const createdAt = new Date(post.created_at);
        const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
        const isExpired = new Date() > expiresAt;

        return {
          ...post,
          username: profileData?.username || 'User',
          full_name: profileData?.full_name || 'Unknown User',
          avatar_url: profileData?.avatar_url || '',
          user_liked: userLiked,
          user_bookmarked: userBookmarked,
          likes_count: likesCount,
          comments_count: commentsCount,
          expires_at: expiresAt.toISOString(),
          is_expired: isExpired
        };
      }));

      // Filter out expired posts on the client side
      const validPosts = transformedPosts.filter(post => !post.is_expired);
      
      setPosts(validPosts);
      console.log('Posts set with profiles (expired filtered):', validPosts);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  // Function to notify followers about new recruitment posts
  const notifyFollowersOfRecruitmentPost = async (postId: string, content: string, isUrgent: boolean) => {
    if (!user || !userProfile) return;
    
    try {
      console.log('Creating notifications for followers...');
      
      // Get all followers of the current user
      const { data: followers, error: followersError } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', user.id);

      if (followersError) {
        console.error('Error getting followers:', followersError);
        return;
      }

      if (!followers || followers.length === 0) {
        console.log('No followers to notify');
        return;
      }

      console.log(`Found ${followers.length} followers to notify`);

      // Create a preview of the post content
      const postPreview = content.length > 25 ? content.substring(0, 25) + '...' : content;
      const posterName = userProfile.full_name || userProfile.username || 'Someone';

      // Create notifications for each follower
      const notificationPromises = followers.map(async (follower) => {
        try {
          const { data: notificationData, error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: follower.follower_id,
              type: 'new_supporter',
              title: `${posterName} posted a recruitment`,
              message: `${posterName} shared a new recruitment post: "${postPreview}"`,
              from_user_id: user.id,
              data: {
                post_id: postId,
                post_content: content,
                is_urgent: isUrgent,
                sport: 'General',
                location: 'Global'
              }
            })
            .select();

          if (notificationError) {
            console.error('Error creating notification for follower:', follower.follower_id, notificationError);
            console.error('Full error details:', JSON.stringify(notificationError, null, 2));
          } else {
            console.log('Notification created successfully for follower:', follower.follower_id);
            console.log('Notification data:', notificationData);
          }
        } catch (err) {
          console.error('Error in notification creation:', err);
        }
      });

      await Promise.all(notificationPromises);
      console.log('Finished creating notifications for all followers');

    } catch (err) {
      console.error('Error notifying followers:', err);
    }
  };

  // Create a new post with cooldown enforcement
  const createPost = async (content: string, sport: string = 'General', location: string = 'Global', isUrgent = false) => {
    try {
      console.log('Creating post with cooldown check...');
      
      if (!user) {
        throw new Error('You must be logged in to create posts');
      }

      if (!user.id) {
        throw new Error('User ID is missing');
      }

      // Use the new cooldown-enabled function
      console.log('Calling create_recruitment_post_with_cooldown...');
      const { data, error } = await supabase.rpc('create_recruitment_post_with_cooldown', {
        p_content: content,
        p_sport: sport,
        p_location: location,
        p_is_urgent: isUrgent
      });

      console.log('Cooldown-enabled create result:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const result = data[0];
      console.log('Create post result:', result);

      if (!result.success) {
        // Update cooldown state if user hit cooldown
        if (result.remaining_seconds > 0) {
          setCanPost(false);
          setRemainingCooldown(result.remaining_seconds);
          setLastPostTime(new Date());
        }
        throw new Error(result.error_message || 'Failed to create post');
      }

      // Post created successfully
      console.log('Post created successfully:', result.post_id);
      
      // Update cooldown state - user just posted so they're on cooldown
      setCanPost(false);
      setRemainingCooldown(3599); // 59:59 remaining (almost 1 hour)
      setLastPostTime(new Date());
      
      // Notify followers about the new recruitment post
      if (result.post_id) {
        await notifyFollowersOfRecruitmentPost(result.post_id, content, isUrgent);
      }
      
      // Refresh posts after creating
      await fetchPosts();
      
      return { id: result.post_id };
    } catch (err) {
      console.error('Create post error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Toggle like with database storage
  const toggleLike = async (postId: string) => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      // Check current like status from database
      const { data: existingLike } = await supabase
        .from('recruitment_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      const currentlyLiked = !!existingLike;
      const newLikedState = !currentlyLiked;

      if (newLikedState) {
        // Add like
        const { error } = await supabase
          .from('recruitment_likes')
          .insert({
            user_id: user.id,
            post_id: postId
          });
        
        if (error) {
          console.error('Error adding like:', error);
          return;
        }
      } else {
        // Remove like
        const { error } = await supabase
          .from('recruitment_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        if (error) {
          console.error('Error removing like:', error);
          return;
        }
      }

      // Update local state immediately
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? {
                ...p,
                user_liked: newLikedState,
                likes_count: newLikedState 
                  ? p.likes_count + 1 
                  : p.likes_count - 1
              }
            : p
        )
      );

      console.log(`${newLikedState ? 'Liked' : 'Unliked'} post:`, postId);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Toggle bookmark with database storage
  const toggleBookmark = async (postId: string) => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }

    try {
      // Check current bookmark status from database
      const { data: existingBookmark } = await supabase
        .from('recruitment_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      const currentlyBookmarked = !!existingBookmark;
      const newBookmarkedState = !currentlyBookmarked;

      if (newBookmarkedState) {
        // Add bookmark
        const { error } = await supabase
          .from('recruitment_bookmarks')
          .insert({
            user_id: user.id,
            post_id: postId
          });
        
        if (error) {
          console.error('Error adding bookmark:', error);
          return;
        }
      } else {
        // Remove bookmark
        const { error } = await supabase
          .from('recruitment_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        if (error) {
          console.error('Error removing bookmark:', error);
          return;
        }
      }

      // Update local state immediately
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { ...p, user_bookmarked: newBookmarkedState }
            : p
        )
      );

      console.log(`${newBookmarkedState ? 'Bookmarked' : 'Unbookmarked'} post:`, postId);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Function to notify post owner about new comments
  const notifyPostOwnerOfComment = async (postId: string, commentContent: string, commentId: string) => {
    if (!user || !userProfile) return;
    
    try {
      console.log('Creating comment notification for post owner...');
      
      // First, get the post to find the owner
      const post = posts.find(p => p.id === postId);
      if (!post) {
        console.log('Post not found');
        return;
      }
      
      // Don't notify if the commenter is the post owner (commenting on their own post)
      if (post.user_id === user.id) {
        console.log('User is commenting on their own post, no notification needed');
        return;
      }
      
      console.log('Notifying post owner:', post.user_id);
      
      // Create a preview of the comment content
      const commentPreview = commentContent.length > 25 ? commentContent.substring(0, 25) + '...' : commentContent;
      const commenterName = userProfile.full_name || userProfile.username || 'Someone';
      
      // Create notification for the post owner
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: post.user_id, // Post owner gets the notification
          type: 'new_supporter', // Using existing type that works
          title: `${commenterName} commented on your post`,
          message: `${commenterName} commented: "${commentPreview}"`,
          from_user_id: user.id, // The person who commented
          data: {
            post_id: postId,
            comment_id: commentId,
            comment_content: commentContent,
            commenter_name: commenterName
          }
        })
        .select();

      if (notificationError) {
        console.error('Error creating comment notification:', notificationError);
        console.error('Full error details:', JSON.stringify(notificationError, null, 2));
      } else {
        console.log('Comment notification created successfully for post owner:', post.user_id);
        console.log('Notification data:', notificationData);
      }

    } catch (err) {
      console.error('Error notifying post owner:', err);
    }
  };

  // Add reply with database storage
  const addReply = async (postId: string, content: string) => {
    if (!user || !content.trim()) {
      console.log('User not authenticated or empty content');
      return;
    }

    try {
      // Insert comment into database
      const { data: newComment, error } = await supabase
        .from('recruitment_comments')
        .insert({
          user_id: user.id,
          post_id: postId,
          content: content.trim()
        })
        .select(`
          id,
          content,
          created_at,
          user_id
        `)
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        return;
      }

      // Update post comment count locally
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        )
      );

      // Notify the post owner about the new comment
      await notifyPostOwnerOfComment(postId, content, newComment.id);

      console.log('Added comment to post:', postId, newComment);
      return {
        id: newComment.id,
        postId: postId,
        userId: user.id,
        username: userProfile?.username || 'User',
        fullName: userProfile?.full_name || 'Unknown User',
        avatarUrl: userProfile?.avatar_url || '',
        content: newComment.content,
        createdAt: newComment.created_at
      };
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Get replies from database
  const getReplies = async (postId: string) => {
    try {
      const { data: comments, error } = await supabase
        .from('recruitment_comments')
        .select(`
          id,
          content,
          created_at,
          user_id
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error getting comments:', error);
        return [];
      }

      // Transform comments to include user profile data
      const transformedComments = await Promise.all((comments || []).map(async (comment) => {
        // Get user profile for this comment
        const { data: profileData } = await supabase
          .from('users')
          .select('username, full_name, avatar_url')
          .eq('id', comment.user_id)
          .single();

        return {
          id: comment.id,
          postId: postId,
          userId: comment.user_id,
          username: profileData?.username || 'User',
          fullName: profileData?.full_name || 'Unknown User',
          avatarUrl: profileData?.avatar_url || '',
          content: comment.content,
          createdAt: comment.created_at
        };
      }));

      console.log('Retrieved comments for post:', postId, transformedComments);
      return transformedComments;
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  };

  // Function to check if user can post and get cooldown info
  const checkPostingCooldown = async () => {
    if (!user?.id) {
      setCanPost(false);
      setRemainingCooldown(0);
      return { canPost: false, remainingSeconds: 0 };
    }

    try {
      console.log('Checking posting cooldown for user:', user.id);
      
      const { data, error } = await supabase.rpc('can_user_post_recruitment', {
        user_id: user.id
      });

      if (error) {
        console.error('Error checking cooldown:', error);
        setCanPost(true); // Default to allowing posts if check fails
        setRemainingCooldown(0);
        return { canPost: true, remainingSeconds: 0 };
      }

      const cooldownInfo = data[0];
      console.log('Cooldown check result:', cooldownInfo);

      setCanPost(cooldownInfo.can_post);
      setRemainingCooldown(cooldownInfo.remaining_seconds || 0);
      
      if (cooldownInfo.last_post_time) {
        setLastPostTime(new Date(cooldownInfo.last_post_time));
      }

      return {
        canPost: cooldownInfo.can_post,
        remainingSeconds: cooldownInfo.remaining_seconds || 0,
        lastPostTime: cooldownInfo.last_post_time,
        nextAllowedTime: cooldownInfo.next_allowed_time
      };
    } catch (err) {
      console.error('Error in cooldown check:', err);
      setCanPost(true);
      setRemainingCooldown(0);
      return { canPost: true, remainingSeconds: 0 };
    }
  };

  // Function to manually trigger cleanup of expired posts
  const cleanupExpiredPosts = async () => {
    try {
      console.log('Cleaning up expired recruitment posts...');
      
      // Call the database function to delete expired posts
      const { data, error } = await supabase.rpc('delete_old_recruitment_posts');
      
      if (error) {
        console.error('Error cleaning up expired posts:', error);
        return 0;
      }
      
      console.log(`Cleaned up ${data || 0} expired posts`);
      
      // Refresh the posts list to remove any locally cached expired posts
      await fetchPosts();
      
      return data || 0;
    } catch (err) {
      console.error('Error in cleanup function:', err);
      return 0;
    }
  };

  // Set up periodic cleanup (every 5 minutes) and cooldown checking
  useEffect(() => {
    if (!user) return;

    // Initial cleanup when user loads
    cleanupExpiredPosts();

    // Check posting cooldown on load
    checkPostingCooldown();

    // Set up periodic cleanup
    const cleanupInterval = setInterval(() => {
      cleanupExpiredPosts();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [user]);

  // Countdown timer effect
  useEffect(() => {
    if (remainingCooldown <= 0) {
      setCanPost(true);
      return;
    }

    const timer = setInterval(() => {
      setRemainingCooldown(prev => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          setCanPost(true);
          console.log('🎉 Posting cooldown has ended! You can now create a new recruitment post.');
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingCooldown]);

  return {
    posts,
    loading,
    error,
    user,
    userProfile,
    fetchPosts,
    createPost,
    toggleLike,
    toggleBookmark,
    addReply,
    getReplies,
    cleanupExpiredPosts,
    checkPostingCooldown,
    canPost,
    remainingCooldown,
    lastPostTime
  };
};