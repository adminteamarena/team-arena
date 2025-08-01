import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../ui/Logo';
import NotificationCenter from '../ui/NotificationCenter';
import { auth, privateMessages, notifications, chat, Notification, supabase } from '../../lib/supabase';

const TopNavigation: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [matchChatUnreadCount, setMatchChatUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const notificationRef = useRef<HTMLDivElement>(null);
  
  
  // Format unread count (max 9+)
  const formatUnreadCount = (count: number): string => {
    if (count === 0) return '';
    if (count > 9) return '9+';
    return count.toString();
  };
  
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
  
  // Update unread count from database
  const updateUnreadCount = async () => {
    if (!currentUser?.id) return;
    
    try {
      const { data, error } = await privateMessages.getUnreadCount(currentUser.id);
      if (!error && data !== null) {
        setUnreadCount(data);
      }
    } catch (error) {
      console.error('Error getting unread count:', error);
    }
  };

  // Update match chat unread count
  const updateMatchChatUnreadCount = async () => {
    if (!currentUser?.id) return;
    
    try {
      const { data, error } = await chat.getUnreadMatchChatCount(currentUser.id);
      if (!error && data !== null) {
        setMatchChatUnreadCount(data);
      }
    } catch (error) {
      console.error('Error getting match chat unread count:', error);
    }
  };

  // Update notification count from database
  const updateNotificationCount = async () => {
    if (!currentUser?.id) return;
    
    try {
      const { data, error } = await notifications.getUnreadCount(currentUser.id);
      if (!error && data !== null) {
        setNotificationCount(data);
      }
    } catch (error) {
      console.error('Error getting notification count:', error);
    }
  };

  // Handle notification count changes from NotificationCenter
  const handleNotificationCountChange = React.useCallback((count: number) => {
    setNotificationCount(count);
  }, []);


  // Initialize unread count and listen for changes
  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    updateUnreadCount();
    updateMatchChatUnreadCount();
    updateNotificationCount();
    
    // Subscribe to conversations changes to update unread count
    const messagesSubscription = privateMessages.subscribeToConversations(
      currentUser.id,
      updateUnreadCount
    );

    // Subscribe to match chat changes for unread count
    const matchChatSubscription = chat.subscribeToAllMatchChats(
      currentUser.id,
      () => {
        // Update match chat unread count when new messages arrive
        updateMatchChatUnreadCount();
      }
    );

    // Subscribe to notifications for real-time count updates
    const notificationsSubscription = notifications.subscribeToNotifications(
      currentUser.id,
      (notification) => {
        // Update count immediately when new notification arrives
        setNotificationCount(prev => prev + 1);
        
        // Trigger refresh of NotificationCenter
        setRefreshTrigger(prev => prev + 1);
        
        // Play notification sound for unread notifications
        if (!notification.is_read) {
          try {
            // Create a pleasant notification sound
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Create a two-tone notification sound
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
          } catch (error) {
            console.error('Error playing notification sound:', error);
          }
        }
        
        // Also update the database count (with delay to avoid race conditions)
        setTimeout(() => {
          updateNotificationCount();
        }, 100);
      }
    );
    
    return () => {
      messagesSubscription.unsubscribe();
      matchChatSubscription.then(subscription => subscription?.unsubscribe());
      notificationsSubscription.unsubscribe();
    };
  }, [currentUser]);

  // Handle click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);
  
  // Handle messages click
  const handleMessagesClick = () => {
    navigate('/messages');
  };

  // Handle notifications click
  const handleNotificationsClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Logo size="sm" showTagline={false} />
          </div>

          {/* Search Bar - Hidden on mobile */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
              <input
                type="text"
                placeholder="Search users, teams, matches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Icon - Mobile only */}
            <button 
              className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
              onClick={() => navigate('/search')}
            >
              <Search size={24} />
            </button>
            
            {/* Messages */}
            <button 
              className="p-2 text-white/60 hover:text-white transition-all duration-200 relative hover:scale-105"
              onClick={handleMessagesClick}
              title="Messages"
            >
              <MessageCircle size={24} />
              {(unreadCount + matchChatUnreadCount) > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary-orange text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {formatUnreadCount(unreadCount + matchChatUnreadCount)}
                </span>
              )}
            </button>
            
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                className="p-2 text-white/60 hover:text-white transition-all duration-200 relative hover:scale-105"
                onClick={handleNotificationsClick}
                title="Notifications"
              >
                <Bell size={24} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary-orange text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                    {formatUnreadCount(notificationCount)}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] z-50">
                  <NotificationCenter 
                    onClose={() => setShowNotifications(false)}
                    onNotificationCountChange={handleNotificationCountChange}
                    refreshTrigger={refreshTrigger}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavigation; 