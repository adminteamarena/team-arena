import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Users, 
  UserPlus, 
  UserMinus, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Trophy, 
  MessageCircle, 
  Settings,
  X,
  Check,
  MoreVertical,
  Trash2,
  Eye,
  Send,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { notifications, auth, Notification, matches, supabase } from '../../lib/supabase';

interface NotificationCenterProps {
  onClose: () => void;
  className?: string;
  onNotificationCountChange?: (count: number) => void;
  refreshTrigger?: number; // Used to trigger refresh when new notifications arrive
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  onClose, 
  className = '', 
  onNotificationCountChange,
  refreshTrigger = 0
}) => {
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'match' | 'social' | 'system'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showActions, setShowActions] = useState(false);
  const navigate = useNavigate();

  // Audio for notification sounds
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    const createNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a pleasant notification sound (two-tone)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
      } catch (error) {
        console.error('Error creating notification sound:', error);
      }
    };

    audioRef.current = { play: createNotificationSound } as any;
  }, []);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    getCurrentUser();
  }, []);

  // Update notification count and notify parent
  const updateNotificationCount = useCallback((notifications: Notification[]) => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    if (onNotificationCountChange) {
      setTimeout(() => {
        onNotificationCountChange(unreadCount);
      }, 0);
    }
  }, [onNotificationCountChange]);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setError(null);
      const { data, error } = await notifications.getNotifications(currentUser.id, 50, 0);
      if (error) throw error;
      const notificationsData = data || [];
      setNotificationsList(notificationsData);
      updateNotificationCount(notificationsData);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [currentUser, updateNotificationCount]);

  // Setup real-time subscription
  useEffect(() => {
    if (!currentUser?.id) return;

    loadNotifications();

    // Note: Real-time subscription is now handled by TopNavigation
    // NotificationCenter just loads and displays notifications
    
  }, [currentUser, loadNotifications]);

  // Refresh when refreshTrigger changes (new notification arrived)
  useEffect(() => {
    if (refreshTrigger > 0 && currentUser?.id) {
      loadNotifications();
    }
  }, [refreshTrigger, currentUser, loadNotifications]);


  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match_created':
        return <Trophy className="w-5 h-5 text-green-500" />;
      case 'match_joined':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'match_left':
        return <UserMinus className="w-5 h-5 text-yellow-500" />;
      case 'match_ready_check':
        return <CheckCircle className="w-5 h-5 text-purple-500" />;
      case 'match_status_changed':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'match_cancelled':
      case 'match_deleted':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'kicked_from_match':
        return <UserMinus className="w-5 h-5 text-red-500" />;
      case 'player_removed':
        return <UserMinus className="w-5 h-5 text-red-600" />;
      case 'position_changed':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'new_message':
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      case 'new_supporter':
        return <UserPlus className="w-5 h-5 text-primary-orange" />;
      case 'support_request':
        return <UserPlus className="w-5 h-5 text-blue-400" />;
      case 'match_invitation':
        return <Send className="w-5 h-5 text-blue-500" />;
      case 'match_modified':
        return <Settings className="w-5 h-5 text-orange-500" />;
      case 'system_announcement':
        return <Settings className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await notifications.markAsRead(notificationId);
      setNotificationsList(prev => {
        const updatedList = prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n);
        updateNotificationCount(updatedList);
        return updatedList;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!currentUser?.id) return;
    
    try {
      await notifications.markAllAsRead(currentUser.id);
      setNotificationsList(prev => {
        const updatedList = prev.map(n => ({ ...n, is_read: true }));
        updateNotificationCount(updatedList);
        return updatedList;
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await notifications.deleteNotification(notificationId);
      setNotificationsList(prev => {
        const updatedList = prev.filter(n => n.id !== notificationId);
        updateNotificationCount(updatedList);
        return updatedList;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Delete selected notifications
  const deleteSelected = async () => {
    if (selectedNotifications.size === 0) return;
    
    try {
      await notifications.deleteMultiple(Array.from(selectedNotifications));
      setNotificationsList(prev => {
        const updatedList = prev.filter(n => !selectedNotifications.has(n.id));
        updateNotificationCount(updatedList);
        return updatedList;
      });
      setSelectedNotifications(new Set());
      setShowActions(false);
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  // Accept match invitation
  const acceptInvitation = async (notification: Notification) => {
    if (!currentUser?.id || !notification.match_id) return;
    
    try {
      // First, get the match details to find available positions
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          participants:match_participants(
            id,
            user_id,
            position_number,
            team_side
          )
        `)
        .eq('id', notification.match_id)
        .single();
      
      if (matchError || !match) {
        console.error('Error fetching match:', matchError);
        alert('❌ Failed to fetch match details');
        return;
      }
      
      // Find an available position
      const occupiedPositions = new Set();
      if (match.participants) {
        match.participants.forEach((p: any) => {
          occupiedPositions.add(`${p.team_side}-${p.position_number}`);
        });
      }
      
      const teamSize = match.max_players / 2;
      let availablePosition = null;
      
      // Try to find an available position, preferring team A first
      for (const team of ['A', 'B']) {
        for (let pos = 1; pos <= teamSize; pos++) {
          if (!occupiedPositions.has(`${team}-${pos}`)) {
            availablePosition = { position: pos, team: team as 'A' | 'B' };
            break;
          }
        }
        if (availablePosition) break;
      }
      
      if (!availablePosition) {
        alert('❌ Match is full - no available positions');
        return;
      }
      
      // Join the match with the found available position
      const { error } = await matches.joinMatch(
        notification.match_id,
        currentUser.id,
        availablePosition.position,
        availablePosition.team
      );
      
      if (error) {
        console.error('Error joining match:', error);
        alert(`❌ Failed to join match: ${error.message}`);
        return;
      }
      
      // Update notification data to mark as accepted
      await supabase
        .from('notifications')
        .update({
          data: {
            ...notification.data,
            invitation_status: 'accepted'
          }
        })
        .eq('id', notification.id);
      
      // Mark notification as read
      await markAsRead(notification.id);
      
      // Refresh notifications
      loadNotifications();
      
      alert('✅ Successfully joined the match!');
      
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert(`❌ Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Refuse match invitation
  const refuseInvitation = async (notification: Notification) => {
    try {
      // Update notification data to mark as refused
      await supabase
        .from('notifications')
        .update({
          data: {
            ...notification.data,
            invitation_status: 'refused'
          }
        })
        .eq('id', notification.id);
      
      // Mark notification as read
      await markAsRead(notification.id);
      
      // Refresh notifications
      loadNotifications();
      
    } catch (error) {
      console.error('Error refusing invitation:', error);
      alert(`❌ Failed to refuse invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to related content
    if (notification.type === 'new_supporter' || notification.type === 'support_request') {
      // Check if this is actually a recruitment post or comment notification
      if (notification.data && typeof notification.data === 'object') {
        const data = notification.data as any;
        
        // If it has post_id, it's a recruitment-related notification
        if (data.post_id) {
          // Navigate to recruitment page with post ID to auto-open comments
          navigate(`/recruitment?post=${data.post_id}&openComments=true`);
          onClose();
          return;
        }
      }
      
      // Default: Navigate to the follower's profile
      if (notification.from_user_id) {
        navigate(`/profile/${notification.from_user_id}`);
        onClose();
      }
    } else if (notification.type === 'match_invitation') {
      // For match invitations, we need to open the match details modal
      // We'll navigate to matches page and trigger the modal to open
      if (notification.match_id) {
        // Store the match ID to open in localStorage for the matches page to pick up
        localStorage.setItem('openMatchDetails', notification.match_id);
        navigate(`/matches`);
        onClose();
      }
    } else if (notification.type === 'match_modified') {
      // For match modifications, we need to open the match details modal
      // We'll navigate to matches page and trigger the modal to open
      if (notification.match_id) {
        // Store the match ID to open in localStorage for the matches page to pick up
        localStorage.setItem('openMatchDetails', notification.match_id);
        navigate(`/matches`);
        onClose();
      }
    } else if (notification.match_id) {
      navigate(`/matches`);
      onClose();
    }
  };

  // Filter notifications
  const filteredNotifications = notificationsList.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.is_read;
      case 'match':
        return notification.type.startsWith('match_') || notification.type === 'match_invitation' || notification.type === 'match_modified' || notification.type === 'kicked_from_match' || notification.type === 'player_removed';
      case 'social':
        return notification.type === 'new_supporter' || notification.type === 'support_request' || notification.type === 'recruitment_post';
      case 'system':
        return notification.type === 'system_announcement';
      default:
        return true;
    }
  });

  // Toggle notification selection
  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const unreadCount = notificationsList.filter(n => !n.is_read).length;

  return (
    <div className={`bg-background-dark/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 ${className} overflow-hidden`}>
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-gradient-to-r from-primary-orange/10 to-primary-pink/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-full">
              <Bell className="w-5 h-5 text-primary-orange" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <span className="text-xs text-white/60">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-105"
          >
            <X className="w-5 h-5 text-white/60 hover:text-white" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-full transition-all duration-200 font-medium ${
              filter === 'all' 
                ? 'bg-gradient-to-r from-primary-orange to-primary-pink text-white shadow-lg' 
                : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-full transition-all duration-200 font-medium ${
              filter === 'unread' 
                ? 'bg-gradient-to-r from-primary-orange to-primary-pink text-white shadow-lg' 
                : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter('match')}
            className={`px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-full transition-all duration-200 font-medium ${
              filter === 'match' 
                ? 'bg-gradient-to-r from-primary-orange to-primary-pink text-white shadow-lg' 
                : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
            }`}
          >
            Matches
          </button>
          <button
            onClick={() => setFilter('social')}
            className={`px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-full transition-all duration-200 font-medium ${
              filter === 'social' 
                ? 'bg-gradient-to-r from-primary-orange to-primary-pink text-white shadow-lg' 
                : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
            }`}
          >
            Social
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
          <div className="flex items-center space-x-2">
            {selectedNotifications.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center space-x-2 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-all duration-200 border border-red-500/20"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Delete ({selectedNotifications.size})</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-white/10 rounded-full transition-all duration-200"
            >
              <MoreVertical className="w-4 h-4 text-white/60 hover:text-white" />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs sm:text-sm text-primary-orange hover:text-primary-pink transition-all duration-200 font-medium whitespace-nowrap"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-orange mx-auto"></div>
            <p className="text-white/60 mt-3">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-3" />
            <p>{error}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-white/60">
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No notifications found</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 sm:p-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all duration-200 ${
                !notification.is_read 
                  ? notification.type === 'new_supporter' 
                    ? 'bg-gradient-to-r from-primary-orange/8 to-orange-500/3 border-l-3 border-l-primary-orange' 
                    : 'bg-gradient-to-r from-primary-orange/5 to-primary-pink/5 border-l-2 border-l-primary-orange'
                  : ''
              }`}
            >
              <div className="flex items-start space-x-2 sm:space-x-3">
                {showActions && (
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={() => toggleSelection(notification.id)}
                    className="mt-1 rounded border-white/20 bg-white/10 text-primary-orange focus:ring-primary-orange focus:ring-offset-0 focus:ring-2"
                  />
                )}
                
                <div className={`flex-shrink-0 mt-1 p-1.5 sm:p-2 rounded-full ${
                  notification.type === 'new_supporter' 
                    ? 'bg-gradient-to-br from-primary-orange/20 to-orange-500/20 border border-primary-orange/30' 
                    : 'bg-white/10'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-xs sm:text-sm font-medium leading-tight ${
                      notification.is_read ? 'text-white/70' : 'text-white'
                    }`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-white/50 flex-shrink-0">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  
                  <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                    notification.is_read ? 'text-white/50' : 'text-white/70'
                  }`}>
                    {notification.message}
                  </p>

                  {notification.match?.title && (
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="w-1 h-1 bg-primary-orange rounded-full"></div>
                      <span className="text-xs text-white/50">
                        Match: {notification.match.title}
                      </span>
                    </div>
                  )}

                  {notification.from_user && (
                    <div className="mt-1 flex items-center space-x-2">
                      <div className="w-1 h-1 bg-primary-pink rounded-full"></div>
                      <span className="text-xs text-white/50">
                        From: {notification.from_user.full_name || notification.from_user.username}
                      </span>
                    </div>
                  )}

                  {/* Match Invitation Accept/Refuse Buttons */}
                  {notification.type === 'match_invitation' && notification.data && (
                    (() => {
                      const data = notification.data as any;
                      const invitationStatus = data?.invitation_status;
                      
                      if (invitationStatus === 'accepted') {
                        return (
                          <div className="mt-3 flex items-center space-x-2">
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                              <Check className="w-4 h-4 text-green-400" />
                              <span className="text-sm text-green-400 font-medium">Accepted</span>
                            </div>
                          </div>
                        );
                      } else if (invitationStatus === 'refused') {
                        return (
                          <div className="mt-3 flex items-center space-x-2">
                            <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-500/30">
                              <X className="w-4 h-4 text-red-400" />
                              <span className="text-sm text-red-400 font-medium">Refused</span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                acceptInvitation(notification);
                              }}
                              className="flex items-center justify-center space-x-2 px-3 py-2 sm:px-4 text-xs sm:text-sm bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg border border-green-500/30 hover:border-green-500/50 transition-all duration-200 font-medium"
                            >
                              <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                refuseInvitation(notification);
                              }}
                              className="flex items-center justify-center space-x-2 px-3 py-2 sm:px-4 text-xs sm:text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 hover:border-red-500/50 transition-all duration-200 font-medium"
                            >
                              <ThumbsDown className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>Refuse</span>
                            </button>
                          </div>
                        );
                      }
                    })()
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  {!notification.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="p-1 sm:p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-105"
                      title="Mark as read"
                    >
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="p-1 sm:p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-105"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-white/10 bg-white/5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => navigate('/notifications')}
            className="text-xs text-primary-orange hover:text-primary-pink transition-colors font-medium whitespace-nowrap"
          >
            View all
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter; 