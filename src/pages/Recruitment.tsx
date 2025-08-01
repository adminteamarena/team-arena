import React, { useState, useEffect } from 'react';
import { MessageCircle, Mail, Send, Bookmark, MoreHorizontal, Zap, Trash2, Flag, Clock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRecruitmentSimple as useRecruitment, RecruitmentPost } from '../hooks/useRecruitmentSimple';
import { CountdownTimer } from '../components/ui/CountdownTimer';
import { supabase } from '../lib/supabase';

const Recruitment: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { posts, loading, error, user, userProfile, fetchPosts, createPost, toggleLike, toggleBookmark, addReply, getReplies, canPost, remainingCooldown, checkPostingCooldown } = useRecruitment();
  const [newPost, setNewPost] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<{ [key: string]: any[] }>({});
  const [isUrgent, setIsUrgent] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showCooldownMessage, setShowCooldownMessage] = useState(false);


  // Load posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Handle URL parameters for direct post navigation
  useEffect(() => {
    const postId = searchParams.get('post');
    const openComments = searchParams.get('openComments');
    
    if (postId && openComments === 'true' && posts.length > 0) {
      // Check if the post exists in our current posts
      const targetPost = posts.find(p => p.id === postId);
      if (targetPost) {
        // Auto-open comments for this post
        setReplyTo(postId);
        loadReplies(postId);
        
        // Scroll to the post after a brief delay to ensure rendering
        setTimeout(() => {
          const postElement = document.getElementById(`post-${postId}`);
          if (postElement) {
            postElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 500);
        
        // Clear URL parameters after handling
        setSearchParams({});
      }
    }
  }, [posts, searchParams, setSearchParams]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Navigate to user profile
  const handleUserProfileClick = (userId: string) => {
    console.log('Navigating to profile:', userId);
    navigate(`/profile/${userId}`);
  };

  // Handle contact - navigate to private messages
  const handleContact = async (userId: string, username: string) => {
    if (!user) {
      console.error('No user logged in');
      return;
    }

    try {
      console.log('Creating/finding conversation with:', userId, username);
      
      // Create or get conversation with this user
      const { data: conversationId, error } = await supabase
        .rpc('get_or_create_conversation', {
          user_one_id: user.id,
          user_two_id: userId
        });
      
      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }

      console.log('Navigating to conversation:', conversationId);
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error('Error handling contact:', error);
    }
  };

  const filteredPosts = posts;

  const handleLike = async (postId: string) => {
    try {
      await toggleLike(postId);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleBookmark = async (postId: string) => {
    try {
      await toggleBookmark(postId);
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  const handleReply = async (postId: string) => {
    if (replyText.trim()) {
      try {
        await addReply(postId, replyText);
        setReplyText('');
        setReplyTo(null);
        // Refresh replies for this post
        const postReplies = await getReplies(postId);
        setReplies(prev => ({ ...prev, [postId]: postReplies }));
      } catch (err) {
        console.error('Failed to add reply:', err);
      }
    }
  };

  const handleNewPost = async () => {
    if (!newPost.trim()) return;
    
    // Check if user is on cooldown
    if (!canPost && remainingCooldown > 0) {
      setShowCooldownMessage(true);
      return;
    }
    
    try {
      console.log('Attempting to create post...');
      await createPost(newPost, 'General', 'Global', isUrgent);
      setNewPost('');
      setIsUrgent(false);
      console.log('Post created successfully!');
    } catch (err) {
      console.error('Failed to create post:', err);
      // Check if error is due to cooldown
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('wait before posting')) {
        setShowCooldownMessage(true);
      }
      // Error will be shown in the UI via the error state
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    
    try {
      // Delete from recruitment_posts table
      const { error } = await supabase
        .from('recruitment_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id); // Ensure user can only delete their own posts

      if (error) {
        console.error('Error deleting post:', error);
        return;
      }

      // Refresh posts after deletion
      await fetchPosts();
      setOpenDropdown(null);
      console.log('Post deleted successfully');
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handleReportUser = (postId: string, userId: string) => {
    // Placeholder for report functionality - will be implemented later
    console.log('Reporting user:', userId, 'for post:', postId);
    setOpenDropdown(null);
    // TODO: Implement reporting functionality
  };


  // Load replies for expanded posts
  const loadReplies = async (postId: string) => {
    try {
      const postReplies = await getReplies(postId);
      setReplies(prev => ({ ...prev, [postId]: postReplies }));
    } catch (err) {
      console.error('Failed to load replies:', err);
    }
  };

  // Format time ago with better error handling
  const formatTimeAgo = (timestamp: string | Date) => {
    try {
      if (!timestamp) return 'unknown';
      
      const now = new Date();
      const time = new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(time.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'unknown';
      }
      
      const diffInMs = now.getTime() - time.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);
      
      if (diffInMinutes < 1) return 'now';
      if (diffInMinutes < 60) return `${diffInMinutes}min ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      // For older posts, show the actual date
      return time.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: time.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'unknown';
    }
  };

  // Format time until expiry and get urgency color
  const formatTimeUntilExpiry = (expiresAt: string) => {
    try {
      const now = new Date();
      const expiry = new Date(expiresAt);
      
      if (isNaN(expiry.getTime())) {
        return { text: 'unknown', color: 'text-white/50' };
      }
      
      const diffInMs = expiry.getTime() - now.getTime();
      
      if (diffInMs <= 0) {
        return { text: 'expired', color: 'text-red-400' };
      }
      
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      
      // Color based on remaining time
      let color = 'text-orange-400/80'; // default
      if (diffInHours < 1) {
        color = 'text-red-400'; // less than 1 hour - red
      } else if (diffInHours < 3) {
        color = 'text-orange-400'; // less than 3 hours - orange
      } else {
        color = 'text-orange-400/60'; // more than 3 hours - muted orange
      }
      
      if (diffInHours >= 1) {
        return { text: `${diffInHours}h left`, color };
      } else if (diffInMinutes >= 1) {
        return { text: `${diffInMinutes}min left`, color };
      } else {
        return { text: 'expiring soon', color: 'text-red-400 animate-pulse' };
      }
    } catch (error) {
      console.error('Error formatting expiry:', expiresAt, error);
      return { text: 'unknown', color: 'text-white/50' };
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 px-4 sm:px-6 overflow-x-hidden">
      {/* Post Creation Section */}
      <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 space-y-3 overflow-x-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-sm font-medium flex items-center space-x-2">
            <span>📣</span>
            <span>Create a recruitment post</span>
          </h2>
          {/* Cooldown Timer */}
          {!canPost && remainingCooldown > 0 && (
            <CountdownTimer 
              remainingSeconds={remainingCooldown}
              className="text-xs"
            />
          )}
        </div>
        
        {!user && (
          <div className="text-center text-white/60 py-4 border border-white/20 rounded-lg">
            Please log in to create posts
          </div>
        )}
        
        {user && (
        
        <div className="flex items-start space-x-3 w-full">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-orange to-primary-pink flex items-center justify-center text-sm flex-shrink-0">
            {userProfile?.avatar_url ? (
              <img 
                src={userProfile.avatar_url} 
                alt={userProfile.username || 'User'} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white">👤</span>
            )}
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            <textarea 
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share your annonce recruitment..."
              className="w-full bg-white/5 text-white text-sm placeholder-white/50 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-primary-orange/50 resize-none min-w-0"
              rows={2}
              maxLength={200}
            />
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <span className="text-white/40 text-xs">{newPost.length}/200</span>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="rounded bg-white/10 border-white/20 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
                  />
                  <span className="text-white/60 text-xs">Urgent</span>
                </label>
              </div>
              <button 
                onClick={handleNewPost}
                disabled={!newPost.trim()}
                className="bg-primary-orange hover:bg-primary-orange/80 disabled:bg-white/10 disabled:text-white/40 text-white text-sm px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Send size={14} />
                <span>Recruit</span>
              </button>
            </div>
          </div>
        </div>
        )}
      </div>


      {/* Posts Feed */}
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-sm font-medium flex items-center space-x-2">
            <span>📣</span>
            <span>Recent posts ({posts.length})</span>
          </h2>
        </div>
        
        {loading && (
          <div className="text-center text-white/60 py-8">
            Loading posts...
          </div>
        )}
        
        {error && (
          <div className="text-center text-red-400 py-8">
            Error: {error}
          </div>
        )}
        
        {posts.map((post) => (
          <div 
            key={post.id} 
            id={`post-${post.id}`}
            className={`w-full bg-gradient-to-br from-white/8 to-white/3 backdrop-blur-sm border border-white/15 rounded-xl p-4 space-y-3 transition-all duration-300 hover:bg-gradient-to-br hover:from-white/12 hover:to-white/6 hover:border-white/25 hover:shadow-lg hover:shadow-black/10 overflow-hidden ${post.is_urgent ? 'border-orange-500/60 bg-gradient-to-br from-orange-500/10 to-orange-500/5' : ''}`}
          >
            {/* Post Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <button 
                  onClick={() => handleUserProfileClick(post.user_id)}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-orange to-primary-pink flex items-center justify-center text-sm hover:scale-110 transition-all duration-300 cursor-pointer flex-shrink-0 shadow-lg hover:shadow-xl ring-2 ring-white/10 hover:ring-white/20"
                >
                  {post.avatar_url ? (
                    <img 
                      src={post.avatar_url} 
                      alt={post.username || 'User'} 
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        console.log('Avatar failed to load:', post.avatar_url);
                        e.currentTarget.style.display = 'none';
                        const sibling = e.currentTarget.nextElementSibling;
                        if (sibling) {
                          (sibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <span className={`text-white ${post.avatar_url ? 'hidden' : 'block'}`}>👤</span>
                </button>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 min-w-0 flex-1">
                  <button 
                    onClick={() => handleUserProfileClick(post.user_id)}
                    className="text-white font-semibold text-sm hover:text-primary-orange transition-colors cursor-pointer truncate text-left"
                  >
                    {post.username || post.full_name}
                  </button>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-white/40 hidden sm:inline">•</span>
                    <span className="text-white/50 font-medium">{formatTimeAgo(post.created_at)}</span>
                    {post.expires_at && (
                      <>
                        <span className="text-white/40">•</span>
                        <span className={`font-medium ${formatTimeUntilExpiry(post.expires_at).color}`}>
                          {formatTimeUntilExpiry(post.expires_at).text}
                        </span>
                      </>
                    )}
                    {post.is_urgent && (
                      <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse shadow-md">⚡ URGENT</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === post.id ? null : post.id);
                  }}
                  className="text-white/40 hover:text-white flex-shrink-0 p-1 rounded transition-colors"
                >
                  <MoreHorizontal size={16} />
                </button>
                
                {/* Dropdown Menu */}
                {openDropdown === post.id && user && (
                  <div 
                    className="absolute right-0 top-8 bg-gray-800 border border-white/20 rounded-lg shadow-xl z-10 min-w-32"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {user.id === post.user_id ? (
                      // Own post - show delete option
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors text-sm rounded-lg"
                      >
                        <Trash2 size={14} />
                        <span>Delete Post</span>
                      </button>
                    ) : (
                      // Other user's post - show report option
                      <button
                        onClick={() => handleReportUser(post.id, post.user_id)}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-yellow-400 hover:bg-yellow-500/10 transition-colors text-sm rounded-lg"
                      >
                        <Flag size={14} />
                        <span>Report User</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Post Content */}
            <div className="bg-white/5 rounded-lg p-3 border-l-4 border-primary-orange/50">
              <p className="text-white text-sm leading-relaxed break-words whitespace-pre-wrap overflow-wrap-anywhere">{post.content}</p>
            </div>
            
            
            {/* Post Actions */}
            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
              <div className="flex items-center space-x-3 sm:space-x-6">
                <button 
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-125 ${
                    post.user_liked 
                      ? 'text-orange-400' 
                      : 'text-white/60 hover:text-orange-400'
                  }`}
                >
                  <Zap 
                    size={14} 
                    className={`transition-all duration-200 ${post.user_liked ? "fill-current" : ""}`}
                  />
                  <span className="text-xs font-medium">{post.likes_count}</span>
                </button>
                
                <button 
                  onClick={() => {
                    if (replyTo === post.id) {
                      setReplyTo(null);
                    } else {
                      setReplyTo(post.id);
                      loadReplies(post.id);
                    }
                  }}
                  className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 ${
                    replyTo === post.id
                      ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
                      : 'text-white/60 hover:text-blue-400 hover:bg-blue-500/5'
                  }`}
                >
                  <MessageCircle size={14} />
                  <span className="text-xs font-medium">{post.comments_count}</span>
                </button>
                
                <button 
                  onClick={() => handleContact(post.user_id, post.username)}
                  className="flex items-center space-x-1.5 px-2 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 text-white/60 hover:text-primary-orange hover:bg-primary-orange/5"
                >
                  <Mail size={14} />
                  <span className="text-xs font-medium">Contact</span>
                </button>
              </div>
              
              <button 
                onClick={() => handleBookmark(post.id)}
                className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-105 ${
                  post.user_bookmarked 
                    ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' 
                    : 'text-white/60 hover:text-yellow-400 hover:bg-yellow-500/5'
                }`}
              >
                <Bookmark size={14} className={post.user_bookmarked ? 'fill-current' : ''} />
              </button>
            </div>

            {/* Replies */}
            {replies[post.id] && replies[post.id].length > 0 && replyTo === post.id && (
              <div className="border-t border-white/10 pt-3">
                <div className="text-white/50 text-xs font-medium mb-2 flex items-center space-x-2">
                  <MessageCircle size={14} />
                  <span>Comments ({replies[post.id].length})</span>
                </div>
                <div className="space-y-2">
                  {replies[post.id].map((reply) => (
                    <div key={reply.id} className="flex items-start space-x-2 bg-white/3 rounded-lg p-2 border border-white/5 hover:bg-white/5 transition-colors">
                      <button 
                        onClick={() => handleUserProfileClick(reply.userId)}
                        className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-xs hover:scale-105 transition-all duration-200 cursor-pointer flex-shrink-0 shadow-md"
                      >
                        {reply.avatarUrl ? (
                          <img 
                            src={reply.avatarUrl} 
                            alt={reply.username || reply.fullName} 
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const sibling = e.currentTarget.nextElementSibling;
                              if (sibling) {
                                (sibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <span className={`text-white ${reply.avatarUrl ? 'hidden' : 'block'}`}>👤</span>
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <button 
                            onClick={() => handleUserProfileClick(reply.userId)}
                            className="text-white font-medium text-xs hover:text-blue-400 transition-colors cursor-pointer truncate"
                          >
                            {reply.username || reply.fullName}
                          </button>
                          <span className="text-white/30 text-xs">•</span>
                          <span className="text-white/40 text-xs">{formatTimeAgo(reply.createdAt)}</span>
                        </div>
                        <p className="text-white/90 text-xs break-words whitespace-pre-wrap overflow-wrap-anywhere leading-relaxed">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Input */}
            {replyTo === post.id && (
              <div className="border-t border-white/10 pt-2">
                <div className="flex items-center space-x-2">
                  <input 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 bg-white/5 text-white text-sm placeholder-white/50 border border-white/10 rounded px-2 py-1.5 outline-none focus:border-primary-orange/50 min-w-0"
                    onKeyPress={(e) => e.key === 'Enter' && handleReply(post.id)}
                  />
                  <button 
                    onClick={() => handleReply(post.id)}
                    className="bg-primary-orange hover:bg-primary-orange/80 text-white p-1.5 rounded transition-colors flex-shrink-0"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cooldown Message Modal */}
      {showCooldownMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-background-dark/95 backdrop-blur-lg border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center">
                <Clock className="text-orange-400" size={32} />
              </div>
              
              <h3 className="text-white text-lg font-semibold">
                Posting Cooldown Active
              </h3>
              
              <p className="text-white/70 text-sm">
                You can only post once per hour. Please wait before creating another recruitment post.
              </p>
              
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/60 text-xs mb-2">Time remaining:</p>
                <CountdownTimer 
                  remainingSeconds={remainingCooldown}
                  className="justify-center text-lg"
                />
              </div>
              
              <button
                onClick={() => setShowCooldownMessage(false)}
                className="bg-primary-orange hover:bg-primary-orange/80 text-white px-6 py-2 rounded-lg font-medium transition-colors w-full"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Recruitment; 