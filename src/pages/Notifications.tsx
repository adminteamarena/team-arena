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
  ArrowLeft,
  Check,
  Trash2,
  Filter,
  Search
} from 'lucide-react';
import { notifications, auth, Notification } from '../lib/supabase';

const Notifications: React.FC = () => {
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'match' | 'social' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
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

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setError(null);
      const { data, error } = await notifications.getNotifications(currentUser.id, 100, 0);
      if (error) throw error;
      setNotificationsList(data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Setup real-time subscription
  useEffect(() => {
    if (!currentUser?.id) return;

    loadNotifications();

    console.log('🔔 [Notifications] Setting up real-time notification subscription');
    
    const subscription = notifications.subscribeToNotifications(
      currentUser.id,
      (notification: Notification) => {
        console.log('🔔 [Notifications] New notification received:', notification);
        
        setNotificationsList(prev => {
          // Play notification sound for new unread notifications
          if (audioRef.current && !notification.is_read) {
            try {
              console.log('🔊 [Notifications] Playing notification sound');
              audioRef.current.play();
            } catch (error) {
              console.error('Error playing notification sound:', error);
            }
          }
          
          return [notification, ...prev];
        });
      }
    );

    return () => {
      console.log('🔔 [Notifications] Cleaning up notification subscription');
      subscription.unsubscribe();
    };
  }, [currentUser, loadNotifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match_created':
        return <Trophy className="w-6 h-6 text-green-500" />;
      case 'match_joined':
        return <UserPlus className="w-6 h-6 text-blue-500" />;
      case 'match_left':
        return <UserMinus className="w-6 h-6 text-yellow-500" />;
      case 'match_ready_check':
        return <CheckCircle className="w-6 h-6 text-purple-500" />;
      case 'match_status_changed':
        return <AlertCircle className="w-6 h-6 text-orange-500" />;
      case 'match_cancelled':
      case 'match_deleted':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'kicked_from_match':
        return <UserMinus className="w-6 h-6 text-red-500" />;
      case 'position_changed':
        return <Users className="w-6 h-6 text-blue-500" />;
      case 'new_message':
        return <MessageCircle className="w-6 h-6 text-green-500" />;
      case 'new_supporter':
        return <UserPlus className="w-6 h-6 text-primary-orange" />;
      case 'support_request':
        return <UserPlus className="w-6 h-6 text-blue-400" />;
      case 'recruitment_post':
        return <Users className="w-6 h-6 text-purple-500" />;
      case 'system_announcement':
        return <Settings className="w-6 h-6 text-gray-500" />;
      default:
        return <Bell className="w-6 h-6 text-gray-500" />;
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

  // Format full date
  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await notifications.markAsRead(notificationId);
      setNotificationsList(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!currentUser?.id) return;
    
    try {
      await notifications.markAllAsRead(currentUser.id);
      setNotificationsList(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await notifications.deleteNotification(notificationId);
      setNotificationsList(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Delete selected notifications
  const deleteSelected = async () => {
    if (selectedNotifications.size === 0) return;
    
    try {
      await notifications.deleteMultiple(Array.from(selectedNotifications));
      setNotificationsList(prev => 
        prev.filter(n => !selectedNotifications.has(n.id))
      );
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  // Mark selected as read
  const markSelectedAsRead = async () => {
    if (selectedNotifications.size === 0) return;
    
    try {
      await notifications.markMultipleAsRead(Array.from(selectedNotifications));
      setNotificationsList(prev => prev.map(n => 
        selectedNotifications.has(n.id) ? { ...n, is_read: true } : n
      ));
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Error marking notifications as read:', error);
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
          return;
        }
      }
      
      // Default: Navigate to the follower's profile
      if (notification.from_user_id) {
        navigate(`/profile/${notification.from_user_id}`);
      }
    } else if (notification.match_id) {
      navigate(`/matches`);
    }
  };

  // Filter and search notifications
  const filteredNotifications = notificationsList.filter(notification => {
    // Filter by type
    let typeMatch = true;
    switch (filter) {
      case 'unread':
        typeMatch = !notification.is_read;
        break;
      case 'match':
        typeMatch = notification.type.startsWith('match_');
        break;
      case 'social':
        typeMatch = notification.type === 'new_supporter' || notification.type === 'support_request' || notification.type === 'recruitment_post';
        break;
      case 'system':
        typeMatch = notification.type === 'system_announcement';
        break;
      default:
        typeMatch = true;
    }

    // Filter by search query
    const searchMatch = searchQuery === '' || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.match?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.from_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return typeMatch && searchMatch;
  });

  // Toggle notification selection
  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  // Select all filtered notifications
  const selectAll = () => {
    const allIds = new Set(filteredNotifications.map(n => n.id));
    setSelectedNotifications(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedNotifications(new Set());
  };

  const unreadCount = notificationsList.filter(n => !n.is_read).length;
  const totalCount = notificationsList.length;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-background-dark/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 mb-6 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-primary-orange/10 to-primary-pink/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <ArrowLeft className="w-5 h-5 text-white/80 hover:text-white" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">Notifications</h1>
                  <p className="text-sm text-white/60">
                    {totalCount} total • {unreadCount} unread
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-4 py-2 bg-gradient-to-r from-primary-orange to-primary-pink text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
                  >
                    Mark All Read
                  </button>
                )}
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 font-medium"
                >
                  {showBulkActions ? 'Cancel' : 'Select'}
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Filter className="w-5 h-5 text-white/60 flex-shrink-0" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/20 transition-all duration-200 text-sm sm:text-base"
                >
                  <option value="all" className="bg-background-dark text-white">All</option>
                  <option value="unread" className="bg-background-dark text-white">Unread</option>
                  <option value="match" className="bg-background-dark text-white">Matches</option>
                  <option value="social" className="bg-background-dark text-white">Social</option>
                  <option value="system" className="bg-background-dark text-white">System</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {showBulkActions && (
              <div className="flex items-center justify-between mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={selectAll}
                    className="text-sm text-primary-orange hover:text-primary-pink transition-colors font-medium"
                  >
                    Select All ({filteredNotifications.length})
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-white/60 hover:text-white transition-colors font-medium"
                  >
                    Clear Selection
                  </button>
                </div>
                {selectedNotifications.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={markSelectedAsRead}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all duration-200 border border-green-500/20 font-medium"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark Read ({selectedNotifications.size})</span>
                    </button>
                    <button
                      onClick={deleteSelected}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-200 border border-red-500/20 font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete ({selectedNotifications.size})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-background-dark/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-orange mx-auto"></div>
              <p className="text-white/60 mt-4">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium">{error}</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-white/60">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No notifications found</h3>
              <p>
                {searchQuery ? 'Try adjusting your search terms' : 'You\'re all caught up!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-white/5 transition-all duration-200 ${
                    !notification.is_read 
                      ? notification.type === 'new_supporter' 
                        ? 'bg-gradient-to-r from-primary-orange/10 to-orange-500/5 border-l-4 border-l-primary-orange' 
                        : 'bg-gradient-to-r from-primary-orange/5 to-primary-pink/5 border-l-2 border-l-primary-orange'
                      : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {showBulkActions && (
                      <input
                        type="checkbox"
                        checked={selectedNotifications.has(notification.id)}
                        onChange={() => toggleSelection(notification.id)}
                        className="mt-3 rounded border-white/20 bg-white/10 text-primary-orange focus:ring-primary-orange focus:ring-offset-0 focus:ring-2"
                      />
                    )}
                    
                    <div className={`flex-shrink-0 mt-2 p-3 rounded-full ${
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
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-medium ${
                          notification.is_read ? 'text-white/70' : 'text-white'
                        }`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-white/50">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary-orange rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      <p className={`text-base mb-3 ${
                        notification.is_read ? 'text-white/50' : 'text-white/70'
                      }`}>
                        {notification.type === 'new_supporter' ? (
                          <span className="flex items-center space-x-2">
                            <span>{notification.message}</span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-orange/20 text-primary-orange font-medium">
                              Follow
                            </span>
                          </span>
                        ) : (
                          notification.message
                        )}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-white/50">
                          {notification.match?.title && (
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 bg-primary-orange rounded-full"></div>
                              <span>Match: {notification.match.title}</span>
                            </div>
                          )}
                          {notification.from_user && (
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 bg-primary-pink rounded-full"></div>
                              <span>From: {notification.from_user.full_name || notification.from_user.username}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-white/40">
                            {formatFullDate(notification.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-105"
                          title="Mark as read"
                        >
                          <Check className="w-5 h-5 text-green-400" />
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-105"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications; 