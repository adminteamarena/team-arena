import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Clock, User, MessageSquare, Users, Wifi, WifiOff, Volume2, VolumeX, Mic, MicOff, Play, Pause, Square, CheckCheck, MoreHorizontal, Smile, X, ArrowLeft, Minimize2 } from 'lucide-react';
import { MatchChatMessage, chat } from '../../lib/supabase';
import LoadingSpinner from '../ui/LoadingSpinner';

interface FloatingChatProps {
  matchId: string;
  currentUser: any;
  participants?: any[];
  matchTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

const FloatingChat: React.FC<FloatingChatProps> = ({ 
  matchId, 
  currentUser, 
  participants = [], 
  matchTitle,
  isOpen,
  onClose
}) => {
  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecordingPermission, setHasRecordingPermission] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize audio for notifications
  useEffect(() => {
    const createNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.error('Error creating notification sound:', error);
      }
    };

    audioRef.current = { play: createNotificationSound } as any;
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      console.log('📨 Loading messages for match:', matchId);
      setError(null);
      const { data, error } = await chat.getMessages(matchId);
      if (error) throw error;
      console.log('📨 Messages loaded:', data?.length || 0);
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setInitialLoading(false);
    }
  }, [matchId]);

  const setupRealtimeSubscription = useCallback(() => {
    console.log('🔔 Setting up real-time subscription for match:', matchId);
    
    if (subscriptionRef.current) {
      console.log('🔔 Unsubscribing from previous subscription...');
      subscriptionRef.current.unsubscribe();
    }

    console.log('🔔 Creating new subscription...');
    subscriptionRef.current = chat.subscribeToMessages(matchId, (message: MatchChatMessage) => {
      console.log('🔔 New message received:', message);
      
      const isFromOtherUser = message.user_id !== currentUser?.id;
      
      setMessages(prev => {
        const messageExists = prev.some(m => 
          m.id === message.id || 
          (m.id.startsWith('temp-') && m.user_id === message.user_id && m.message === message.message && Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000)
        );
        
        if (messageExists) {
          const updatedMessages = prev.map(m => {
            if (m.id === message.id) {
              return message;
            }
            if (m.id.startsWith('temp-') && m.user_id === message.user_id && m.message === message.message && Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000) {
              return message;
            }
            return m;
          });
          return updatedMessages;
        }
        
        if (isFromOtherUser && soundEnabled && audioRef.current && !message.id.startsWith('temp-')) {
          try {
            audioRef.current.play();
          } catch (error) {
            console.error('Error playing notification sound:', error);
          }
        }
        
        return [...prev, message];
      });
      
      setIsConnected(true);
    });
  }, [matchId, currentUser?.id, soundEnabled]);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      setupRealtimeSubscription();
      
      // Lock body scroll when chat is open on mobile
      if (window.innerWidth < 768) {
        document.body.style.overflow = 'hidden';
      }
    }
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      // Restore body scroll
      document.body.style.overflow = '';
    };
  }, [isOpen, loadMessages, setupRealtimeSubscription]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (message: string, messageType: 'text' | 'quick_action' = 'text') => {
    if (!message.trim() || !currentUser) return;

    console.log('📤 Sending message:', message);
    setLoading(true);
    setError(null);

    const optimisticMessage: MatchChatMessage = {
      id: `temp-${Date.now()}`,
      match_id: matchId,
      user_id: currentUser.id,
      message: message.trim(),
      message_type: messageType,
      created_at: new Date().toISOString(),
      profile: {
        id: currentUser.id,
        username: currentUser.email?.split('@')[0] || 'user',
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
        bio: undefined,
        avatar_url: currentUser.user_metadata?.avatar_url || undefined,
        followers_count: 0,
        following_count: 0,
        matches_played: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await chat.sendMessage(matchId, currentUser.id, message, messageType);
      if (error) throw error;
      
      if (data) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id ? data : msg
          )
        );
      }
      
      if (messageType === 'text') {
        setNewMessage('');
      }
      
      console.log('📤 Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    sendMessage(newMessage);
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (!isTyping) {
      setIsTyping(true);
    }
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
    
    setTypingTimeout(timeout);
  };

  const handleClose = () => {
    document.body.style.overflow = '';
    onClose();
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Voice recording functions
  const requestMicrophonePermission = async () => {
    try {
      console.log('🎤 Requesting microphone permission...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasRecordingPermission(true);
      console.log('🎤 Microphone permission granted');
      return true;
    } catch (error) {
      console.error('🎤 Microphone permission denied:', error);
      setHasRecordingPermission(false);
      setError('Microphone permission required for voice messages');
      setTimeout(() => setError(null), 3000);
      return false;
    }
  };

  const startRecording = async () => {
    if (!hasRecordingPermission) {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
    }

    try {
      console.log('🎤 Starting voice recording...');
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
        console.log('🎤 Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Calculate actual recording duration (ensure minimum 1 second)
        const finalDuration = Math.max(recordingDuration, 1);
        console.log('🎤 Final recording duration:', finalDuration);
        
        // Send voice message
        await sendVoiceMessage(audioBlob, finalDuration);
        
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
      console.error('🎤 Recording start error:', error);
      setError('Failed to start recording. Check microphone permissions.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('🎤 Stopping recording...');
      mediaRecorderRef.current.stop();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    try {
      setLoading(true);
      console.log('🎤 Sending voice message...', { size: audioBlob.size, duration });
      
      // Send voice message using the Supabase chat service
      const { data, error } = await chat.sendVoiceMessage(matchId, currentUser.id, audioBlob, duration);
      
      if (error) throw error;
      console.log('🎤 Voice message sent successfully');
    } catch (error) {
      console.error('Error sending voice message:', error);
      setError('Failed to send voice message');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const VoicePlayer: React.FC<{ voiceUrl: string; duration: number }> = ({ voiceUrl, duration }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioLoaded, setAudioLoaded] = useState(false);
    const voiceAudioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
      const audio = voiceAudioRef.current;
      if (!audio) return;

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handleLoadedMetadata = () => {
        setAudioLoaded(true);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }, []);

    const togglePlayback = () => {
      const audio = voiceAudioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="flex items-center space-x-2">
        <audio ref={voiceAudioRef} src={voiceUrl} preload="metadata" />
        
        {/* Mic icon */}
        <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
          <Mic size={10} className="text-white/80" />
        </div>
        
        {/* Play button */}
        <button
          onClick={togglePlayback}
          className="flex-shrink-0 w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          disabled={!audioLoaded}
        >
          {isPlaying ? (
            <Pause size={10} className="text-white" />
          ) : (
            <Play size={10} className="text-white ml-0.5" />
          )}
        </button>
        
        {/* Waveform with integrated progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-0.5 h-4">
            {[...Array(15)].map((_, i) => {
              const isActive = (i / 15) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={`w-0.5 rounded-full transition-all duration-200 ${
                    isActive ? 'bg-white' : 'bg-white/30'
                  } ${isPlaying && isActive ? 'animate-pulse' : ''}`}
                  style={{
                    height: `${Math.random() * 12 + 4}px`,
                    animationDelay: `${i * 60}ms`
                  }}
                />
              );
            })}
          </div>
        </div>
        
        {/* Time display */}
        <span className="text-xs text-white/60 flex-shrink-0">
          {formatDuration(Math.floor(currentTime))}
        </span>
      </div>
    );
  };

  const renderMessage = (message: MatchChatMessage, index: number) => {
    const isCurrentUser = message.user_id === currentUser?.id;
    const isSystemMessage = message.message_type === 'system';
    const isQuickAction = message.message_type === 'quick_action';
    const isVoiceMessage = message.message_type === 'voice';
    const isJoinInfo = message.message_type === 'join_info';
    const isLeaveInfo = message.message_type === 'leave_info';
    const isInformativeMessage = isJoinInfo || isLeaveInfo;
    const isOptimistic = message.id.startsWith('temp-');
    const showAvatar = !isCurrentUser && (index === 0 || messages[index - 1]?.user_id !== message.user_id);

    if (isSystemMessage || isInformativeMessage) {
      // For join/leave messages, display as simple italic text
      if (isInformativeMessage) {
        console.log('🎨 RENDERING INFORMATIVE MESSAGE (FloatingChat):', { isJoinInfo, isLeaveInfo, message: message.message, hasSeparator: message.message.includes('|') });
        
        return (
          <div key={message.id} className="flex justify-center my-3 px-4 sm:px-6 animate-fadeIn">
            <div className={`${isJoinInfo ? 'text-green-400' : 'text-red-400'} text-sm italic font-medium px-4 py-3 rounded-lg bg-black/20 backdrop-blur-sm border ${isJoinInfo ? 'border-green-500/30' : 'border-red-500/30'} text-center max-w-sm sm:max-w-md`}>
              {(() => {
                const messageText = message.message || '';
                const hasSeparator = messageText.includes('|');
                
                if (hasSeparator) {
                  const parts = messageText.split('|');
                  const firstPart = parts[0]?.trim() || '';
                  const secondPart = parts[1]?.trim() || '';
                  
                  return (
                    <div>
                      <div className="font-semibold">{firstPart}</div>
                      <div className="text-xs opacity-80 mt-1">({secondPart})</div>
                    </div>
                  );
                } else {
                  return <div>{messageText}</div>;
                }
              })()}
            </div>
          </div>
        );
      }
      
      // For other system messages, keep the original bubble design
      return (
        <div key={message.id} className="flex justify-center my-4 md:my-6 animate-fadeIn">
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 px-4 md:px-6 py-2 md:py-3 rounded-full text-blue-300 text-xs md:text-sm max-w-xs text-center backdrop-blur-sm shadow-lg">
            <MessageSquare size={12} className="md:w-3.5 md:h-3.5 inline mr-1 md:mr-2 mb-0.5" />
            {message.message}
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2 md:mb-3 px-3 md:px-4 animate-slideIn`}>
        <div className={`max-w-[90%] sm:max-w-[85%] md:max-w-[75%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
          {/* Show username and avatar for other users' messages only */}
          {!isCurrentUser && (
            <div className="flex items-center space-x-2 md:space-x-3 mb-1 md:mb-2">
              {/* Always show avatar for other users */}
              {message.profile?.avatar_url ? (
                <img
                  src={message.profile.avatar_url}
                  alt={message.profile.full_name}
                  className="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover ring-2 ring-white/20"
                />
              ) : (
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary-orange/40 to-primary-pink/40 flex items-center justify-center ring-2 ring-white/20">
                  <User size={14} className="md:w-4 md:h-4 text-white/90" />
                </div>
              )}
              
              {/* Always show username for other users */}
              <div className="flex flex-col">
                <span className="text-white/90 text-xs md:text-sm font-bold">
                  {(message.profile?.username && message.profile.username.trim()) || 
                   (message.profile?.full_name && message.profile.full_name.trim()) || 
                   `User ${message.user_id.slice(-4)}`}
                </span>
              </div>
            </div>
          )}
          
          {/* Message bubble */}
          <div className="group relative">
            <div
              className={`relative p-3 md:p-4 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl ${
                isCurrentUser
                  ? 'bg-gradient-to-r from-primary-orange to-primary-pink text-white ml-6 md:ml-8 rounded-br-md'
                  : isQuickAction
                  ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/40 mr-6 md:mr-8 rounded-bl-md'
                  : 'bg-white/15 text-white border border-white/20 mr-6 md:mr-8 rounded-bl-md backdrop-blur-md'
              } ${isOptimistic ? 'opacity-70' : ''}`}
            >              
              <div className="relative z-10">
                {isVoiceMessage && message.voice_url && message.voice_duration !== null && message.voice_duration !== undefined ? (
                  <VoicePlayer voiceUrl={message.voice_url} duration={message.voice_duration} />
                ) : (
                  <p className="text-xs sm:text-sm leading-relaxed font-medium break-words overflow-wrap-anywhere hyphens-auto">
                    {message.message.length > 500 ? `${message.message.substring(0, 500)}...` : message.message}
                  </p>
                )}
              </div>
              
              {/* Footer with status for current user */}
              {isCurrentUser && (
                <div className="flex items-center justify-end mt-2 pt-2 border-t border-white/20">
                  <div className="flex items-center space-x-1">
                    {isOptimistic ? (
                      <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCheck size={12} className="text-white/60" />
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Timestamp below message bubble for all messages */}
            <div className={`mt-1 px-2 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
              <span className="text-white/40 text-xs font-medium">
                {formatTime(message.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  if (initialLoading) {
    return (
      <div className={`fixed inset-0 z-[80] ${window.innerWidth < 768 ? 'bg-background-dark' : 'bg-black/50 backdrop-blur-sm'}`}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="md" />
            <p className="text-white/60 mt-4 text-sm">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[80] ${window.innerWidth < 768 ? '' : 'bg-black/50 backdrop-blur-sm'}`}>
      <div className={`
        ${window.innerWidth < 768 
          ? 'w-full h-full pb-24' 
          : 'absolute bottom-4 right-4 w-[480px] h-[600px] rounded-2xl shadow-2xl border border-white/20'
        }
        ${isMinimized && window.innerWidth >= 768 ? 'h-16' : ''}
        bg-gradient-to-br from-background-dark/95 to-background-dark/90 backdrop-blur-lg
        flex flex-col
        transform transition-all duration-300 ease-out
        ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      `}>
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors md:hidden touch-manipulation"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-primary-orange to-primary-pink flex items-center justify-center shadow-lg flex-shrink-0">
                <MessageSquare size={16} className="md:w-[18px] md:h-[18px] text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base md:text-lg font-bold text-white truncate">{matchTitle || 'Team Chat'}</h3>
                <p className="text-white/60 text-xs md:text-sm flex items-center space-x-1 md:space-x-2">
                  <Users size={10} className="md:w-3 md:h-3 flex-shrink-0" />
                  <span className="flex-shrink-0">{participants.length} members</span>
                  <span className="mx-1 hidden sm:inline">•</span>
                  {isConnected ? (
                    <span className="flex items-center space-x-1 text-green-400">
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0 block"></span>
                      <span className="hidden sm:inline">Online</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-red-400">
                      <WifiOff size={10} className="md:w-3 md:h-3 flex-shrink-0" />
                      <span className="hidden sm:inline">Offline</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
              <button
                onClick={toggleSound}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 touch-manipulation"
                title={soundEnabled ? "Disable sound notifications" : "Enable sound notifications"}
              >
                {soundEnabled ? (
                  <Volume2 size={14} className="md:w-4 md:h-4 text-white/80" />
                ) : (
                  <VolumeX size={14} className="md:w-4 md:h-4 text-white/60" />
                )}
              </button>
              
              {window.innerWidth >= 768 && (
                <>
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 touch-manipulation"
                    title="Minimize chat"
                  >
                    <Minimize2 size={14} className="md:w-4 md:h-4 text-white/80" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 touch-manipulation"
                    title="Close chat"
                  >
                    <X size={14} className="md:w-4 md:h-4 text-white/80" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Messages Container */}
        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent min-h-0">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-8 md:py-12 px-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-primary-orange/20 to-primary-pink/20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                      <MessageSquare size={24} className="md:w-8 md:h-8 text-white/40" />
                    </div>
                    <h4 className="text-white/80 text-base md:text-lg font-semibold mb-2">No messages yet</h4>
                    <p className="text-white/50 text-sm">Start the conversation with your team!</p>
                  </div>
                </div>
              ) : (
                <div className="py-2 md:py-4">
                  {messages.map((message, index) => renderMessage(message, index))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-3 md:mx-4 mb-3 md:mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm animate-slideIn">
                {error}
              </div>
            )}

            {/* Input Section - Fixed to bottom */}
            <div className="p-3 md:p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm flex-shrink-0 sticky bottom-0 z-20">
              <div className="flex items-end space-x-2 md:space-x-3">
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <div className="flex items-center space-x-2 md:space-x-3 bg-white/10 backdrop-blur-sm rounded-2xl p-3 md:p-3 border border-white/20 focus-within:border-white/40 transition-all duration-200">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 500) {
                            handleTyping(value);
                          }
                        }}
                        placeholder="Type your message..."
                        className="flex-1 bg-transparent text-white placeholder-white/50 focus:outline-none text-sm md:text-sm min-w-0"
                        disabled={loading || isRecording}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                        <span className="text-xs text-white/40 font-medium hidden sm:inline">
                          {newMessage.length}/500
                        </span>
                        <button className="p-1 md:p-1 rounded-full hover:bg-white/20 transition-colors touch-manipulation">
                          <Smile size={16} className="text-white/60" />
                        </button>
                      </div>
                    </div>
                    
                    {isTyping && (
                      <div className="absolute -top-8 left-4 text-xs text-white/60 animate-pulse">
                        Typing...
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Voice Recording */}
                <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                  {isRecording ? (
                    <div className="flex items-center space-x-1 md:space-x-2 bg-red-500/20 text-red-400 px-2 md:px-3 py-2 rounded-full border border-red-500/30 animate-pulse">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-bold">{formatDuration(recordingDuration)}</span>
                      <button
                        onClick={stopRecording}
                        className="p-1 hover:bg-red-500/20 rounded-full transition-colors touch-manipulation"
                      >
                        <Square size={14} className="text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startRecording}
                      disabled={loading}
                      className="p-3 md:p-3 bg-gradient-to-r from-primary-orange to-primary-pink hover:from-primary-orange/80 hover:to-primary-pink/80 text-white rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-105 shadow-lg flex-shrink-0 touch-manipulation"
                      title="Record voice message"
                    >
                      <Mic size={18} className="md:w-5 md:h-5" />
                    </button>
                  )}
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || newMessage.trim() === '' || isRecording}
                    className="p-3 md:p-3 bg-gradient-to-r from-primary-orange to-primary-pink hover:from-primary-orange/80 hover:to-primary-pink/80 text-white rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-105 shadow-lg flex-shrink-0 touch-manipulation"
                  >
                    {loading ? (
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={18} className="md:w-5 md:h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FloatingChat; 