import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, User, Phone, Video, MoreVertical, Smile, Mic, MicOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, privateMessages, PrivateMessage, UserProfile } from '../../lib/supabase';

interface PrivateChatProps {
  conversationId?: string;
  currentUser: any;
}

const PrivateChat: React.FC<PrivateChatProps> = ({ conversationId, currentUser }) => {
  const navigate = useNavigate();
  const { conversationId: paramConversationId } = useParams();
  const activeConversationId = conversationId || paramConversationId;
  
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [participant, setParticipant] = useState<UserProfile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecordingPermission, setHasRecordingPermission] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBackClick = () => {
    navigate('/messages');
  };

  // Mobile keyboard handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        const viewportHeight = window.innerHeight;
        const documentHeight = document.documentElement.clientHeight;
        
        // If the viewport height is significantly smaller than document height,
        // the keyboard is likely open
        if (viewportHeight < documentHeight * 0.75) {
          // Keyboard is open - ensure input is in view
          if (inputRef.current) {
            setTimeout(() => {
              inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { user: currentUser } = await auth.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // Load conversation details and messages
  useEffect(() => {
    const loadConversationData = async () => {
      if (!activeConversationId || !user?.id) {
        return;
      }

      try {
        // Get conversation details to find the other participant
        const { data: conversations } = await privateMessages.getConversations(user.id);
        
        const conversation = conversations?.find(conv => conv.id === activeConversationId);
        
        if (conversation?.participant) {
          setParticipant(conversation.participant);
        }

        // Load messages
        const { data: messagesData, error } = await privateMessages.getConversationMessages(activeConversationId);
        
        if (error) {
          console.error('Error loading messages:', error);
        } else {
          setMessages(messagesData || []);
        }

        // Mark conversation as read
        // await privateMessages.markConversationAsRead(activeConversationId, user.id);
      } catch (error) {
        console.error('Error loading conversation data:', error);
      }
    };

    loadConversationData();
  }, [activeConversationId, user]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!activeConversationId) return;

    const subscription = privateMessages.subscribeToConversationMessages(
      activeConversationId,
      (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        
        // Auto-mark as read if it's from the other user
        if (newMessage.sender_id !== user?.id && user?.id) {
          privateMessages.markConversationAsRead(activeConversationId, user.id);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [activeConversationId, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || loading || !participant?.id || !user?.id) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setLoading(true);

    try {
      await privateMessages.sendMessage(participant.id, user.id, messageText);
      // Message will be added via real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message text on error
      setNewMessage(messageText);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 7 * 24) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  // Voice recording functions
  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasRecordingPermission(true);
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setHasRecordingPermission(false);
      return false;
    }
  };

  const startRecording = async () => {
    if (!hasRecordingPermission) {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Calculate actual recording duration (ensure minimum 1 second)
        const finalDuration = Math.max(recordingDuration, 1);
        
        // For now, just show that voice message functionality is available
        // Voice messages in private chat would need additional implementation
        
        // Reset recording state
        setIsRecording(false);
        setRecordingDuration(0);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Recording start error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessage = (message: PrivateMessage, index: number) => {
    const isCurrentUser = message.sender_id === user?.id;
    const showSenderName = !isCurrentUser && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);

    return (
      <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3 px-3 sm:px-4 animate-fadeIn`}>
        <div className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] ${isCurrentUser ? 'order-2' : 'order-1'} min-w-0`}>
          {/* Show username for all messages */}
          <div className="mb-1 ml-1 sm:ml-2">
            <div className="flex flex-col">
              <span className="text-white/90 text-xs sm:text-sm font-bold">
                {isCurrentUser 
                  ? 'You' 
                  : (participant?.full_name || participant?.username || 'User')
                }
              </span>
              <span className="text-white/50 text-xs font-medium">
                {formatTime(message.created_at)}
              </span>
            </div>
          </div>
          
          {/* Message bubble */}
          <div className={`relative px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-lg break-words overflow-hidden ${
            isCurrentUser
              ? 'bg-gradient-to-r from-primary-orange to-primary-pink text-white ml-4 sm:ml-8'
              : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white mr-4 sm:mr-8'
          }`}>
            <p className="text-xs sm:text-sm leading-relaxed break-words overflow-wrap-anywhere hyphens-auto">{message.message}</p>
            
            {/* Read status for current user messages */}
            {isCurrentUser && (
              <div className="flex items-center justify-end mt-2 pt-2 border-t border-white/20">
                <div className="text-white/70">
                  {message.is_read ? (
                    <div className="flex items-center space-x-1">
                      <div className="flex">
                        <div className="w-3 h-3 rounded-full bg-blue-400 opacity-80"></div>
                        <div className="w-3 h-3 rounded-full bg-blue-400 opacity-80 -ml-1"></div>
                      </div>
                      <span className="text-xs">Read</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded-full bg-white/50"></div>
                      <span className="text-xs">Sent</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!participant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background-dark">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <button
            onClick={handleBackClick}
            className="p-1 sm:p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          </button>
          
          {participant.avatar_url ? (
            <img
              src={participant.avatar_url}
              alt={participant.full_name}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-white/20"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary-orange/40 to-primary-pink/40 flex items-center justify-center ring-2 ring-white/20">
              <User size={16} className="text-white/90 sm:w-5 sm:h-5" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold text-sm sm:text-base truncate">{participant.full_name}</h2>
            <p className="text-white/60 text-xs sm:text-sm truncate">@{participant.username}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button className="p-1 sm:p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10">
            <Phone size={16} className="sm:w-5 sm:h-5" />
          </button>
          <button className="p-1 sm:p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10">
            <Video size={16} className="sm:w-5 sm:h-5" />
          </button>
          <button className="p-1 sm:p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10">
            <MoreVertical size={16} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <div className="py-2 sm:py-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-gradient-to-br from-primary-orange/20 to-primary-pink/20 rounded-full flex items-center justify-center">
                <User size={24} className="text-primary-orange sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-white/60 text-base sm:text-lg font-medium">Start the conversation</h3>
              <p className="text-white/40 mt-2 text-sm sm:text-base">Send a message to {participant.full_name}</p>
            </div>
          ) : (
            messages.map((message, index) => renderMessage(message, index))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-end space-x-2 sm:space-x-3">
          <div className="flex-1">
            <div className="relative">
              <div className="flex items-center space-x-2 sm:space-x-3 bg-white/20 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/30 focus-within:border-primary-orange/60 focus-within:bg-white/25 transition-all duration-200 shadow-lg">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${participant.full_name}...`}
                  className="flex-1 bg-transparent text-white placeholder-white/70 focus:outline-none text-sm sm:text-base font-medium"
                  disabled={loading}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button className="p-1 sm:p-2 rounded-full hover:bg-white/20 transition-colors">
                    <Smile size={16} className="text-white/70 hover:text-white sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Voice Recording Button */}
          {isRecording ? (
            <div className="flex items-center space-x-1 sm:space-x-2 bg-red-500/20 text-red-400 px-2 sm:px-3 py-2 rounded-full border border-red-500/30 animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold">{formatDuration(recordingDuration)}</span>
              <button
                onClick={stopRecording}
                className="p-1 hover:bg-red-500/20 rounded-full transition-colors"
              >
                <MicOff size={14} className="text-red-400 sm:w-4 sm:h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={startRecording}
              className="p-2 sm:p-3 bg-white/20 hover:bg-white/30 border border-white/30 rounded-full transition-all duration-200 shadow-lg"
              disabled={loading}
              title="Record voice message"
            >
              <Mic size={16} className="text-white/70 sm:w-5 sm:h-5" />
            </button>
          )}
          
          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={loading || newMessage.trim() === ''}
            className="p-2 sm:p-3 bg-gradient-to-r from-primary-orange to-primary-pink hover:from-primary-orange/80 hover:to-primary-pink/80 text-white rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-105 shadow-lg"
          >
            {loading ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} className="sm:w-5 sm:h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivateChat; 