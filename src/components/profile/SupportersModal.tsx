import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, UserMinus, MessageCircle } from 'lucide-react';
import { profiles, FollowUser, supabase } from '../../lib/supabase';

interface SupportersModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'supporters' | 'supporting';
  userId: string;
  currentUserId: string;
}

const SupportersModal: React.FC<SupportersModalProps> = ({
  isOpen,
  onClose,
  type,
  userId,
  currentUserId
}) => {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingStates, setFollowingStates] = useState<{ [key: string]: boolean }>({});
  const [swipeY, setSwipeY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load users when modal opens
  useEffect(() => {
    const loadUsers = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        let result;
        
        if (type === 'supporters') {
          result = await profiles.getFollowers(userId);
        } else {
          result = await profiles.getFollowing(userId);
        }
        
        if (result.data) {
          setUsers(result.data);
        } else {
          console.error('Error loading users:', result.error);
          setUsers([]);
        }
      } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isOpen, type, userId]);

  // Reset swipe state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSwipeY(0);
      setIsDragging(false);
      setUsers([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFollow = async (targetUserId: string, currentlyFollowing: boolean) => {
    try {
      let result;
      
      if (type === 'supporters') {
        // For supporters list, we "remove" the supporter
        result = await profiles.removeFollower(targetUserId);
        
        if (!result.error) {
          // Remove the user from the supporters list
          setUsers(prev => prev.filter(user => user.id !== targetUserId));
        } else {
          console.error('Remove supporter error:', result.error);
        }
      } else {
        // For supporting list, we follow/unfollow normally
        if (currentlyFollowing) {
          result = await profiles.unfollowUser(targetUserId);
        } else {
          result = await profiles.followUser(targetUserId);
        }
        
        if (!result.error) {
          // Update local state
          setFollowingStates(prev => ({
            ...prev,
            [targetUserId]: !currentlyFollowing
          }));
          
          // Update the user in the list
          setUsers(prev => prev.map(user => 
            user.id === targetUserId 
              ? { ...user, is_following: !currentlyFollowing }
              : user
          ));
        } else {
          console.error('Follow/unfollow error:', result.error);
        }
      }
    } catch (error) {
      console.error('Follow action error:', error);
    }
  };

  const handleMessage = async (targetUserId: string) => {
    try {
      // Create or get conversation with this user
      const { data: conversationId, error } = await supabase
        .rpc('get_or_create_conversation', {
          user_one_id: currentUserId,
          user_two_id: targetUserId
        });
      
      if (error) {
        console.error('Error creating/getting conversation:', error);
        alert('Failed to start conversation');
        return;
      }
      
      // Navigate to private chat with the conversation ID
      navigate(`/messages/${conversationId}`);
      onClose();
    } catch (error) {
      console.error('Error handling message:', error);
      alert('Failed to start conversation');
    }
  };

  const handleUserClick = (targetUserId: string) => {
    navigate(`/profile/${targetUserId}`);
    onClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartY(touch.clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;
    
    // Check if the user list is scrolled to the top
    const userListElement = modalRef.current?.querySelector('.overflow-y-auto');
    const isAtTop = !userListElement || userListElement.scrollTop === 0;
    
    // Only allow downward swipes when at the top of the list
    if (deltaY > 0 && isAtTop) {
      setSwipeY(deltaY);
      // Prevent default scrolling when swiping to dismiss
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If swiped down more than 100px, close the modal
    if (swipeY > 100) {
      onClose();
    }
    
    // Reset swipe position
    setSwipeY(0);
  };

  const renderUserItem = (user: FollowUser) => {
    const isCurrentUser = user.id === currentUserId;
    const isFollowing = followingStates[user.id] !== undefined ? followingStates[user.id] : user.is_following;

    return (
      <div key={user.id} className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors duration-200">
        <div 
          onClick={() => handleUserClick(user.id)}
          className="flex items-center space-x-3 flex-1 cursor-pointer"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-orange to-primary-pink p-0.5">
            <div className="w-full h-full rounded-full bg-background-dark flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white text-xs font-bold">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-white font-medium text-xs truncate">{user.username}</h3>
            </div>
            <p className="text-white/60 text-xs truncate">{user.full_name}</p>
            {user.bio && (
              <p className="text-white/50 text-xs mt-0.5 truncate max-w-[180px]">
                {user.bio.length > 20 ? `${user.bio.slice(0, 20)}...` : user.bio}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!isCurrentUser && (
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => handleMessage(user.id)}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <MessageCircle size={14} />
            </button>
            <button
              onClick={() => handleFollow(user.id, isFollowing)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                type === 'supporters' 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
                  : isFollowing
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-gradient-to-r from-primary-orange to-primary-pink text-white hover:from-primary-orange/80 hover:to-primary-pink/80'
              }`}
            >
              {type === 'supporters' ? (
                <div className="flex items-center space-x-1">
                  <UserMinus size={12} />
                  <span>Remove</span>
                </div>
              ) : isFollowing ? (
                <div className="flex items-center space-x-1">
                  <UserMinus size={12} />
                  <span>Unsupport</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <UserPlus size={12} />
                  <span>Support</span>
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-background-dark rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-white/10 transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${swipeY}px)`,
          opacity: isDragging ? Math.max(0.3, 1 - (swipeY / 300)) : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe Indicator */}
        <div className="flex justify-center pt-2 pb-1">
          <div className={`w-10 h-1 rounded-full transition-colors duration-200 ${
            isDragging ? 'bg-white/40' : 'bg-white/20'
          }`}></div>
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <h2 className="text-white font-semibold text-base">
            {type === 'supporters' ? 'Supporters' : 'Supporting'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* User List */}
        <div className="relative">
          <div className="overflow-y-auto max-h-[calc(80vh-80px)] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-orange"></div>
              </div>
            ) : users.length > 0 ? (
              <div className="divide-y divide-white/5">
                {users.map(renderUserItem)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-white/60">
                <div className="text-4xl mb-3">
                  {type === 'supporters' ? '👥' : '🫱🏻‍🫲🏻'}
                </div>
                <p className="text-base font-medium">
                  {type === 'supporters' ? 'No supporters yet' : 'Not supporting anyone yet'}
                </p>
                <p className="text-xs mt-1 text-center px-6">
                  {type === 'supporters' 
                    ? 'When people support you, they\'ll appear here' 
                    : 'Find people to support and connect with the community'
                  }
                </p>
              </div>
            )}
          </div>
          
          {/* Scroll Indicator - Only show if there are many users */}
          {users.length > 6 && (
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background-dark to-transparent pointer-events-none"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportersModal; 