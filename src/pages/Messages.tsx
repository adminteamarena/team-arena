import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, User, Check, CheckCheck, ChevronRight, Send, Users, Trophy, CheckSquare } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, privateMessages, PrivateConversation, matches, Match, chat, supabase } from '../lib/supabase';
import ChatSkeleton from '../components/ui/ChatSkeleton';
import EnhancedAvatar from '../components/ui/EnhancedAvatar';

type MessageCategory = 'matches' | 'personal';

// Helper function to get unread count for a specific match
const getMatchUnreadCount = async (matchId: string, userId: string): Promise<number> => {
  try {
    // Get last seen timestamp for this match
    const lastSeenKey = `match_chat_last_seen_${matchId}_${userId}`;
    const lastSeenTimestamp = localStorage.getItem(lastSeenKey);

    // Get count of messages after last seen time
    let query = supabase
      .from('match_chat')
      .select('id', { count: 'exact' })
      .eq('match_id', matchId)
      .neq('user_id', userId); // Don't count user's own messages

    if (lastSeenTimestamp) {
      query = query.gt('created_at', lastSeenTimestamp);
    }

    const { count, error } = await query;
    
    if (error) {
      console.error('Error getting match unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getMatchUnreadCount:', error);
    return 0;
  }
};

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<MessageCategory>(
    searchParams.get('tab') === 'matches' ? 'matches' : 'personal'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [matchLastMessages, setMatchLastMessages] = useState<Record<string, any>>({});
  const [matchChatUnreadCount, setMatchChatUnreadCount] = useState(0);
  const [matchUnreadCounts, setMatchUnreadCounts] = useState<Record<string, number>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  // Mobile viewport fix for Messages screen
  useEffect(() => {
    // Ensure proper viewport on mobile devices
    const handleViewportFix = () => {
      if (window.innerWidth <= 768) {
        // Reset any potential zoom issues
        window.scrollTo(0, 0);
        
        // Ensure viewport is properly set
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
        }
      }
    };

    handleViewportFix();
    
    // Handle orientation changes
    const handleOrientationChange = () => {
      setTimeout(handleViewportFix, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
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

  // Load conversations and matches
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.id) return;

      try {
        setLoading(true);
        
        // Load private conversations
        const { data: conversationsData, error: conversationsError } = await privateMessages.getConversations(currentUser.id);
        if (conversationsError) {
          console.error('Error loading conversations:', conversationsError);
        } else {
          setConversations(conversationsData || []);
        }

        // Load recent matches that user participated in
        const { data: matchesData, error: matchesError } = await matches.getMatches();
        if (matchesError) {
          console.error('Error loading matches:', matchesError);
        } else {
          // Filter to only matches from the last 30 days and where user is a participant
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const recentMatchesData = (matchesData || []).filter((match: Match) => {
            const isParticipant = match.participants?.some(p => p.user_id === currentUser.id) || match.organizer_id === currentUser.id;
            const isRecent = new Date(match.created_at) > thirtyDaysAgo;
            return isParticipant && isRecent;
          }).slice(0, 10); // Limit to 10 most recent
          
          setRecentMatches(recentMatchesData);
          
          // Load last messages and unread counts for each match
          const lastMessages: Record<string, any> = {};
          const unreadCounts: Record<string, number> = {};
          await Promise.all(
            recentMatchesData.map(async (match: Match) => {
              const { data: lastMessage } = await chat.getLastMessage(match.id);
              if (lastMessage) {
                lastMessages[match.id] = lastMessage;
              }
              
              // Get unread count for this specific match using helper function
              const matchUnreadCount = await getMatchUnreadCount(match.id, currentUser.id);
              unreadCounts[match.id] = matchUnreadCount;
            })
          );
          setMatchLastMessages(lastMessages);
          setMatchUnreadCounts(unreadCounts);
        }

        // Load match chat unread count
        const { data: unreadCount } = await chat.getUnreadMatchChatCount(currentUser.id);
        if (unreadCount !== null) {
          setMatchChatUnreadCount(unreadCount);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Subscribe to real-time conversation updates
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const subscription = privateMessages.subscribeToConversations(
      currentUser.id,
      async () => {
        try {
          const { data } = await privateMessages.getConversations(currentUser.id);
          if (data) {
            setConversations(data);
          }
        } catch (error) {
          console.error('Error refreshing conversations:', error);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]);

  // Subscribe to match chat updates for real-time unread count
  useEffect(() => {
    if (!currentUser?.id || recentMatches.length === 0) return;

    const subscriptions: any[] = [];

    // Subscribe to each individual match chat
    recentMatches.forEach(match => {
      const subscription = supabase
        .channel(`match_chat:${match.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'match_chat',
            filter: `match_id=eq.${match.id}`
          },
          async (payload) => {
            console.log('New message received for match:', match.id, payload);
            
            if (payload.new) {
              // Update last message for this match - use payload data first, then fetch enriched data
              const newMessage = payload.new;
              
              // Set basic message data immediately for responsiveness
              setMatchLastMessages(prev => ({
                ...prev,
                [match.id]: {
                  ...newMessage,
                  profile: { username: 'Loading...', full_name: 'Loading...' }
                }
              }));
              
              // Then fetch enriched data asynchronously
              setTimeout(async () => {
                const { data: lastMessage } = await chat.getLastMessage(match.id);
                if (lastMessage) {
                  setMatchLastMessages(prev => ({
                    ...prev,
                    [match.id]: lastMessage
                  }));
                }
              }, 100);
              
              // Only update unread count if the message is not from the current user
              if (newMessage.user_id !== currentUser.id) {
                // Increment unread count immediately for responsiveness
                setMatchUnreadCounts(prev => ({
                  ...prev,
                  [match.id]: (prev[match.id] || 0) + 1
                }));
                
                // Update global unread count
                setMatchChatUnreadCount(prev => prev + 1);
                
                // Then get accurate count asynchronously
                setTimeout(async () => {
                  const newUnreadCount = await getMatchUnreadCount(match.id, currentUser.id);
                  setMatchUnreadCounts(prev => ({
                    ...prev,
                    [match.id]: newUnreadCount
                  }));
                  
                  const { data: globalUnreadCount } = await chat.getUnreadMatchChatCount(currentUser.id);
                  if (globalUnreadCount !== null) {
                    setMatchChatUnreadCount(globalUnreadCount);
                  }
                }, 500);
              }
            }
          }
        )
        .subscribe();

      subscriptions.push(subscription);
    });

    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [currentUser, recentMatches]);

  // Filter data based on search query and active category
  const filteredConversations = conversations.filter(conv => {
    const fullName = conv.participant?.full_name?.trim();
    const username = conv.participant?.username;
    const displayName = fullName || username || '';
    
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.participant?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredMatches = recentMatches.filter(match =>
    match.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.sport_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format timestamp relative to now with detailed descriptions
  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - messageTime.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);

    // Handle very recent messages
    if (diffInSeconds < 30) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    
    // Handle minutes
    if (diffInMinutes === 1) return '1 minute ago';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    // Handle hours
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    // Handle days
    if (diffInDays === 1) return '1 DAY AGO';
    if (diffInDays < 7) return `${diffInDays} DAYS AGO`;
    
    // Handle weeks
    if (diffInWeeks === 1) return '1 WEEK AGO';
    if (diffInWeeks < 4) return `${diffInWeeks} WEEKS AGO`;
    
    // Handle months
    if (diffInMonths === 1) return '1 MONTH AGO';
    if (diffInMonths < 12) return `${diffInMonths} MONTHS AGO`;
    
    // Handle years
    const diffInYears = Math.floor(diffInMonths / 12);
    if (diffInYears === 1) return '1 YEAR AGO';
    if (diffInYears > 1) return `${diffInYears} YEARS AGO`;
    
    // Fallback to formatted date
    return messageTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleConversationClick = async (conversationId: string) => {
    // Mark conversation as read
    // if (currentUser?.id) {
    //   await privateMessages.markConversationAsRead(conversationId, currentUser.id);
    // }
    
    // Navigate to private chat
    navigate(`/messages/${conversationId}`);
  };

  // Calculate total unread count
  const unreadConversationsCount = conversations.filter(conv => conv.unread_count > 0).length;

  const handleMatchClick = async (matchId: string) => {
    // Mark match chat as read when clicked
    if (currentUser?.id) {
      await chat.markMatchChatAsRead(matchId, currentUser.id);
      // Update individual match unread count
      setMatchUnreadCounts(prev => ({ ...prev, [matchId]: 0 }));
      // Update global unread count
      const { data: unreadCount } = await chat.getUnreadMatchChatCount(currentUser.id);
      if (unreadCount !== null) {
        setMatchChatUnreadCount(unreadCount);
      }
    }
    navigate(`/matches/${matchId}/chat`);
  };

  // Mark all messages as read
  const handleMarkAllAsRead = async () => {
    if (!currentUser?.id) return;
    
    setMarkingAllAsRead(true);
    try {
      if (activeCategory === 'personal') {
        // Mark all private conversations as read
        await Promise.all(
          conversations
            .filter(conv => conv.unread_count > 0)
            .map(conv => privateMessages.markConversationAsRead(conv.id, currentUser.id))
        );
        
        // Refresh conversations to update UI
        const { data } = await privateMessages.getConversations(currentUser.id);
        if (data) {
          setConversations(data);
        }
      } else {
        // Mark all match chats as read
        await Promise.all(
          recentMatches.map(match => chat.markMatchChatAsRead(match.id, currentUser.id))
        );
        
        // Update individual match unread counts to 0
        const resetUnreadCounts: Record<string, number> = {};
        recentMatches.forEach(match => {
          resetUnreadCounts[match.id] = 0;
        });
        setMatchUnreadCounts(resetUnreadCounts);
        
        // Update global unread count
        const { data: unreadCount } = await chat.getUnreadMatchChatCount(currentUser.id);
        if (unreadCount !== null) {
          setMatchChatUnreadCount(unreadCount);
        }
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  return (
    <div className="w-screen max-w-screen min-w-0 mx-auto px-4 sm:px-6 lg:px-8 space-y-6 overflow-x-hidden box-border" style={{maxWidth: 'min(100vw, 56rem)'}}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">Messages</h1>
          <p className="text-white/60 mt-1 text-sm sm:text-base">
            {activeCategory === 'personal' 
              ? (unreadConversationsCount > 0 ? `${unreadConversationsCount} unread conversation${unreadConversationsCount > 1 ? 's' : ''}` : 'All caught up!')
              : `${filteredMatches.length} recent match${filteredMatches.length !== 1 ? 'es' : ''}`
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Mark All as Read button - only show if there are unread messages */}
          {((activeCategory === 'personal' && unreadConversationsCount > 0) || 
            (activeCategory === 'matches' && matchChatUnreadCount > 0)) && (
            <button 
              onClick={handleMarkAllAsRead}
              disabled={markingAllAsRead}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Mark all messages as read"
            >
              {markingAllAsRead ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <CheckSquare size={16} />
              )}
              <span className="text-xs sm:text-sm">Mark All Read</span>
            </button>
          )}
          
          <button 
            onClick={() => navigate('/search')}
            className="p-3 bg-gradient-to-r from-primary-orange to-primary-pink rounded-xl text-white hover:scale-105 transition-all duration-200 shadow-lg"
            title="Find people to message"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1 text-sm sm:text-base">
        <button
          onClick={() => setActiveCategory('personal')}
          className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-medium transition-all duration-200 ${
            activeCategory === 'personal'
              ? 'bg-gradient-to-r from-primary-orange to-primary-pink text-white shadow-lg'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="text-xs sm:text-sm">Personal Messages</span>
          {unreadConversationsCount > 0 && (
            <div className="w-5 h-5 bg-primary-orange rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs font-bold">{unreadConversationsCount}</span>
            </div>
          )}
        </button>
        <button
          onClick={() => setActiveCategory('matches')}
          className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-medium transition-all duration-200 ${
            activeCategory === 'matches'
              ? 'bg-gradient-to-r from-primary-orange to-primary-pink text-white shadow-lg'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trophy size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="text-xs sm:text-sm">Matches Messages</span>
          {matchChatUnreadCount > 0 && (
            <div className="w-5 h-5 bg-primary-orange rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs font-bold">{matchChatUnreadCount > 9 ? '9+' : matchChatUnreadCount}</span>
            </div>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={18} />
        <input
          type="text"
          placeholder={activeCategory === 'personal' ? "Search conversations..." : "Search matches..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent text-sm sm:text-base"
        />
      </div>

      {/* Content Based on Active Category */}
      <div className="space-y-2 w-full overflow-hidden min-w-0 max-w-full">
        {loading ? (
          <ChatSkeleton variant="list" count={8} />
        ) : activeCategory === 'personal' ? (
          // Personal Messages
          filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="mx-auto text-white/40 mb-4" size={48} />
              <h3 className="text-white/60 text-lg font-medium">
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </h3>
              <p className="text-white/40 mt-2">
                {searchQuery ? 'Try searching for a different name' : 'Start a conversation with your teammates!'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation, index) => (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation.id)}
                  className="p-3 sm:p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-200 cursor-pointer group overflow-hidden w-full max-w-full min-w-0 box-border"
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 w-full">
                    {/* Avatar */}
                    <div className="relative">
                      {conversation.participant?.avatar_url ? (
                        <img
                          src={conversation.participant.avatar_url}
                          alt={conversation.participant.full_name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-white/20"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary-orange/40 to-primary-pink/40 flex items-center justify-center ring-2 ring-white/20">
                          <User size={18} className="text-white/90 sm:w-5 sm:h-5" />
                        </div>
                      )}
                      {conversation.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-orange rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-white text-xs font-bold">•</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between mb-1 min-w-0">
                        <h3 className="text-white font-semibold truncate text-sm sm:text-base flex-1 min-w-0 pr-2">
                          {(() => {
                            const fullName = conversation.participant?.full_name?.trim();
                            const username = conversation.participant?.username;
                            return fullName || username || 'Unknown User';
                          })()}
                        </h3>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {conversation.last_message && (
                          <span className="text-white/40 text-xs sm:text-sm whitespace-nowrap">
                            {formatTimestamp(conversation.last_message.created_at)}
                          </span>
                        )}
                        {conversation.last_message?.sender_id === currentUser?.id && (
                          <div className="text-white/60">
                            {conversation.last_message?.is_read ? (
                              <CheckCheck size={16} className="text-blue-400" />
                            ) : (
                              <Check size={16} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between min-w-0 w-full overflow-hidden">
                      <p className={`text-xs sm:text-sm overflow-hidden text-ellipsis whitespace-nowrap break-all flex-1 min-w-0 ${
                        conversation.unread_count > 0 ? 'text-white font-medium' : 'text-white/60'
                      }`}>
                        {conversation.last_message?.sender_id === currentUser?.id && (
                          <span className="text-white/40 mr-1">You: </span>
                        )}
                        {conversation.last_message?.message 
                          ? (conversation.last_message.message.length > 50 
                              ? conversation.last_message.message.substring(0, 50) + '...' 
                              : conversation.last_message.message)
                          : 'No messages yet'}
                      </p>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        {conversation.unread_count > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              privateMessages.markConversationAsRead(conversation.id, currentUser.id);
                              // Update the conversation in state
                              setConversations(prev => prev.map(conv => 
                                conv.id === conversation.id 
                                  ? { ...conv, unread_count: 0 }
                                  : conv
                              ));
                            }}
                            className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="Mark as read"
                          >
                            <CheckSquare size={14} />
                          </button>
                        )}
                        <ChevronRight size={16} className="text-white/40 group-hover:text-white/60 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          // Matches Messages
          filteredMatches.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="mx-auto text-white/40 mb-4" size={48} />
              <h3 className="text-white/60 text-lg font-medium">
                {searchQuery ? 'No matches found' : 'No recent matches'}
              </h3>
              <p className="text-white/40 mt-2">
                {searchQuery ? 'Try searching for a different match' : 'Join a match to start chatting with your team!'}
              </p>
            </div>
          ) : (
            filteredMatches.map((match) => {
              const hasUnreadMessages = matchUnreadCounts[match.id] > 0;
              return (
                <div
                  key={match.id}
                  onClick={() => handleMatchClick(match.id)}
                  className="p-3 sm:p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-200 cursor-pointer group overflow-hidden w-full max-w-full min-w-0 box-border"
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 w-full">
                    {/* Match Icon */}
                    <div className="relative">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500/40 to-purple-500/40 flex items-center justify-center ring-2 ring-white/20">
                        <Users size={18} className="text-white/90 sm:w-5 sm:h-5" />
                      </div>
                      {hasUnreadMessages && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-orange rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-white text-xs font-bold">
                            {matchUnreadCounts[match.id] > 9 ? '9+' : matchUnreadCounts[match.id]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between mb-1 min-w-0">
                        <h3 className={`truncate text-sm sm:text-base flex-1 min-w-0 pr-2 ${hasUnreadMessages ? 'text-white font-bold' : 'text-white font-semibold'}`}>
                          {match.title}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-white/40 text-xs sm:text-sm whitespace-nowrap">
                            {matchLastMessages[match.id] 
                              ? formatTimestamp(matchLastMessages[match.id].created_at)
                              : `Created ${formatTimestamp(match.created_at)}`
                            }
                          </span>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            match.status === 'live' ? 'bg-green-500/20 text-green-400' :
                            match.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                            match.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {match.status}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between min-w-0 w-full overflow-hidden">
                        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                          <p className="text-white/60 text-xs sm:text-sm truncate">
                            {match.sport_type} • {match.location} • {match.participant_count || 0}/{match.max_players} players
                          </p>
                          <p className={`text-xs sm:text-sm mt-1 overflow-hidden text-ellipsis whitespace-nowrap break-all ${
                            hasUnreadMessages ? 'text-white font-medium' : 'text-white/40'
                          }`}>
                            {matchLastMessages[match.id] 
                              ? (() => {
                                  const lastMessage = matchLastMessages[match.id];
                                  const username = lastMessage.profile?.username || 
                                                 lastMessage.profile?.full_name || 
                                                 'Unknown User';
                                  
                                  if (lastMessage.message_type === 'voice') {
                                    return lastMessage.user_id === currentUser?.id 
                                      ? 'You: 🎤 Voice message'
                                      : `${username}: 🎤 Voice message`;
                                  } else if (lastMessage.message_type === 'system') {
                                    return lastMessage.message.length > 50 
                                      ? lastMessage.message.substring(0, 50) + '...' 
                                      : lastMessage.message;
                                  } else {
                                    const messageText = lastMessage.message.length > 40 
                                      ? lastMessage.message.substring(0, 40) + '...' 
                                      : lastMessage.message;
                                    return lastMessage.user_id === currentUser?.id 
                                      ? `You: ${messageText}`
                                      : `${username}: ${messageText}`;
                                  }
                                })()
                              : 'No messages yet - be the first to chat!'
                            }
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                          {hasUnreadMessages && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                chat.markMatchChatAsRead(match.id, currentUser.id);
                                // Update individual match unread count
                                setMatchUnreadCounts(prev => ({ ...prev, [match.id]: 0 }));
                                // Update global unread count
                                setMatchChatUnreadCount(prev => Math.max(0, prev - (matchUnreadCounts[match.id] || 0)));
                              }}
                              className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                              title="Mark as read"
                            >
                              <CheckSquare size={14} />
                            </button>
                          )}
                          <ChevronRight size={16} className="text-white/40 group-hover:text-white/60 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Empty state when no conversations and not loading */}
      {!loading && conversations.length === 0 && !searchQuery && (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-orange/20 to-primary-pink/20 rounded-full flex items-center justify-center">
            <MessageCircle size={40} className="text-primary-orange" />
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Start Your First Conversation</h3>
          <p className="text-white/60 mb-6 max-w-md mx-auto">
            Connect with your teammates and coaches. Send messages, share strategies, and coordinate your next game!
          </p>
          <button 
            onClick={() => navigate('/search')}
            className="px-6 py-3 bg-gradient-to-r from-primary-orange to-primary-pink text-white font-semibold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Find Teammates
          </button>
        </div>
      )}
    </div>
  );
};

export default Messages; 