import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Clock, User, MessageSquare, Users, Wifi, WifiOff, Volume2, VolumeX, Mic, MicOff, Play, Pause, Square, Check, CheckCheck, MoreHorizontal, Smile } from 'lucide-react';
import { MatchChatMessage, chat } from '../../lib/supabase';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

interface MatchChatProps {
  matchId: string;
  currentUser: any;
  participants?: any[];
  hideHeader?: boolean;
}

const MatchChat: React.FC<MatchChatProps> = ({ matchId, currentUser, participants = [], hideHeader = false }) => {
  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecordingPermission, setHasRecordingPermission] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Initialize audio for notifications
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
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
      
      // Check if we have new messages when polling
      if (pollingEnabled && data) {
        setMessages(prev => {
          const newMessages = data.filter(newMsg => 
            !prev.some(existingMsg => existingMsg.id === newMsg.id)
          );
          
          if (newMessages.length > 0) {
            console.log('📨 Found new messages via polling:', newMessages.length);
            
            // Play sound for new messages from other users
            newMessages.forEach(msg => {
              if (msg.user_id !== currentUser?.id && soundEnabled && audioRef.current) {
                try {
                  audioRef.current.play();
                } catch (error) {
                  console.error('Error playing notification sound:', error);
                }
              }
            });
            
            return data;
          }
          
          return prev;
        });
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setInitialLoading(false);
    }
  }, [matchId, pollingEnabled, currentUser?.id, soundEnabled]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    console.log('🔄 Starting message polling...');
    pollingIntervalRef.current = setInterval(() => {
      loadMessages();
    }, 3000); // Poll every 3 seconds
  }, [loadMessages]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('🔄 Stopping message polling...');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const togglePolling = () => {
    if (pollingEnabled) {
      setPollingEnabled(false);
      stopPolling();
    } else {
      setPollingEnabled(true);
      startPolling();
    }
  };

  const setupRealtimeSubscription = useCallback(() => {
    console.log('🔔 Setting up real-time subscription for match:', matchId);
    
    if (subscriptionRef.current) {
      console.log('🔔 Unsubscribing from previous subscription...');
      subscriptionRef.current.unsubscribe();
    }

    console.log('🔔 Creating new subscription...');
    subscriptionRef.current = chat.subscribeToMessages(matchId, (message: MatchChatMessage) => {
      console.log('🔔 New message received:', message);
      
      // Check if message is from another user to play sound
      const isFromOtherUser = message.user_id !== currentUser?.id;
      
      setMessages(prev => {
        console.log('🔔 Current messages count:', prev.length);
        console.log('🔔 New message ID:', message.id);
        
        // Check if message already exists (by ID or temporary ID replacement)
        const messageExists = prev.some(m => 
          m.id === message.id || 
          (m.id.startsWith('temp-') && m.user_id === message.user_id && m.message === message.message && Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000)
        );
        
        if (messageExists) {
          console.log('🔔 Message already exists or is optimistic update, replacing...');
          // Replace optimistic message with real message, or skip if real message already exists
          const updatedMessages = prev.map(m => {
            if (m.id === message.id) {
              console.log('🔔 Message already exists with same ID, keeping existing');
              return message; // Already the real message
            }
            if (m.id.startsWith('temp-') && m.user_id === message.user_id && m.message === message.message && Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000) {
              console.log('🔔 Replacing optimistic message with real message');
              return message; // Replace optimistic with real
            }
            return m;
          });
          return updatedMessages;
        }
        
        // Play notification sound for messages from other users (not optimistic updates)
        if (isFromOtherUser && soundEnabled && audioRef.current && !message.id.startsWith('temp-')) {
          console.log('🔔 Playing notification sound for message from other user');
          try {
            audioRef.current.play();
          } catch (error) {
            console.error('Error playing notification sound:', error);
          }
        }
        
        console.log('🔔 Adding new message to state');
        const newMessages = [...prev, message];
        console.log('🔔 New messages count:', newMessages.length);
        return newMessages;
      });
      
      setIsConnected(true);
    });

    // Handle connection status
    const handleOnline = () => {
      console.log('🌐 Connection online');
      setIsConnected(true);
      // Reconnect subscription when coming back online
      setTimeout(() => setupRealtimeSubscription(), 1000);
    };
    
    const handleOffline = () => {
      console.log('🌐 Connection offline');
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [matchId, currentUser?.id, soundEnabled]);

  useEffect(() => {
    loadMessages();
    setupRealtimeSubscription();
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      // Cleanup polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
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
    };
  }, [loadMessages, setupRealtimeSubscription]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mobile keyboard handling
  useEffect(() => {
    const handleResize = () => {
      // On mobile, when keyboard opens, adjust the view
      if (window.innerHeight < 500) {
        // Keyboard is likely open
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };

    const handleFocus = () => {
      // When input is focused, scroll to bottom after a delay
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    if (inputRef.current) {
      inputRef.current.addEventListener('focus', handleFocus);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (inputRef.current) {
        inputRef.current.removeEventListener('focus', handleFocus);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (message: string, messageType: 'text' | 'quick_action' = 'text') => {
    if (!message.trim() || !currentUser) return;

    console.log('📤 Sending message:', message);
    setLoading(true);
    setError(null);

    // Create optimistic message (temporary ID)
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

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await chat.sendMessage(matchId, currentUser.id, message, messageType);
      if (error) throw error;
      
      // Replace optimistic message with real message when available
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
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
      // Show error for 3 seconds
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
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
    
    setTypingTimeout(timeout);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const toggleDebug = () => {
    setDebugMode(!debugMode);
  };

  const testMessage = async () => {
    const testMsg = `Test message ${new Date().toLocaleTimeString()}`;
    await sendMessage(testMsg);
  };

  const testConnection = async () => {
    console.log('🧪 Testing real-time connection...');
    
    // Send a test system message directly to database to test real-time
    try {
      const { data, error } = await chat.sendSystemMessage(matchId, `🧪 Connection test at ${new Date().toLocaleTimeString()}`);
      if (error) {
        console.error('🧪 Test failed:', error);
        setError(`Connection test failed: ${error.message}`);
      } else {
        console.log('🧪 Test message sent:', data);
      }
    } catch (error) {
      console.error('🧪 Connection test error:', error);
      setError('Connection test failed');
    }
  };

  const checkRealtimeStatus = async () => {
    console.log('🔍 Checking real-time status...');
    setError(null);
    
    try {
      const isWorking = await chat.checkRealtimeStatus();
      if (isWorking) {
        setError('✅ Real-time is working!');
        setTimeout(() => setError(null), 3000);
      } else {
        setError('❌ Real-time connection failed. Check Supabase settings.');
      }
    } catch (error) {
      console.error('🔍 Real-time check error:', error);
      setError('❌ Real-time check failed');
    }
  };

  const reloadMessages = async () => {
    console.log('🔄 Manually reloading messages...');
    setInitialLoading(true);
    await loadMessages();
  };

  // Voice recording functions
  const requestMicrophonePermission = async () => {
    try {
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasRecordingPermission(true);
      console.log('🎤 Microphone permission granted');
      
      // Stop the stream since we just needed permission
      stream.getTracks().forEach(track => track.stop());
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
    if (!currentUser) return;

    console.log('🎤 Sending voice message...', { size: audioBlob.size, duration });
    setLoading(true);
    setError(null);

    try {
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

    // Debug logging for message types
    if (isInformativeMessage) {
      console.log('🟢🔴 INFORMATIVE MESSAGE DEBUG:', {
        message_id: message.id,
        message: message.message,
        message_type: message.message_type,
        isJoinInfo,
        isLeaveInfo,
        isInformativeMessage,
        isSystemMessage
      });
    }

    // Debug voice messages
    if (isVoiceMessage) {
      console.log('🎤 Voice message detected:', {
        id: message.id,
        message_type: message.message_type,
        voice_url: message.voice_url,
        voice_duration: message.voice_duration,
        message: message.message
      });
    }

    if (isSystemMessage || isInformativeMessage) {
      // For join/leave messages, display as simple italic text
      if (isInformativeMessage) {
        console.log('🎨 RENDERING INFORMATIVE MESSAGE (MatchChat):', { isJoinInfo, isLeaveInfo, message: message.message, hasSeparator: message.message.includes('|') });
        
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
      const bgGradient = "from-blue-500/20 to-purple-500/20";
      const borderColor = "border-blue-500/30";
      const textColor = "text-blue-300";
      const icon = <MessageSquare size={14} className="inline mr-2 mb-0.5" />;

      return (
        <div key={message.id} className="flex justify-center my-4 animate-fadeIn">
          <div className={`bg-gradient-to-r ${bgGradient} border ${borderColor} px-6 py-3 rounded-full ${textColor} text-sm max-w-md text-center backdrop-blur-sm shadow-lg transform transition-all duration-300 hover:scale-105`}>
            {icon}
            <span className="font-medium">{message.message}</span>
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3 px-3 sm:px-4 animate-slideIn`}>
        <div className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] ${isCurrentUser ? 'order-2' : 'order-1'} min-w-0`}>
          {/* Show username and avatar for other users' messages only */}
          {!isCurrentUser && (
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
              {/* Always show avatar for other users */}
              {message.profile?.avatar_url ? (
                <img
                  src={message.profile.avatar_url}
                  alt={message.profile.full_name}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-white/20"
                />
              ) : (
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary-orange/40 to-primary-pink/40 flex items-center justify-center ring-2 ring-white/20">
                  <User size={12} className="text-white/90 sm:w-4 sm:h-4" />
                </div>
              )}
              
              {/* Always show username for other users */}
              <div className="flex flex-col">
                <span className="text-white/90 text-xs sm:text-sm font-bold">
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
              className={`relative p-3 sm:p-4 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl break-words overflow-hidden ${
                isCurrentUser
                  ? 'bg-gradient-to-r from-primary-orange to-primary-pink text-white ml-4 sm:ml-8 rounded-br-md'
                  : isQuickAction
                  ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/40 mr-4 sm:mr-8 rounded-bl-md'
                  : 'bg-white/15 text-white border border-white/20 mr-4 sm:mr-8 rounded-bl-md backdrop-blur-md'
              } ${isOptimistic ? 'opacity-70' : ''}`}
            >              
              {/* Message content */}
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
            
            {/* Message actions (visible on hover) */}
            <div className={`absolute top-2 ${isCurrentUser ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
              <button className="p-1 rounded-full bg-black/20 hover:bg-black/40 transition-colors">
                <MoreHorizontal size={14} className="text-white/60" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background-dark/50 to-background-dark/80">
        <div className="text-center">
          <LoadingSpinner size="md" />
          <p className="text-white/60 mt-4 text-sm">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background-dark/50 to-background-dark/80 relative">
      {/* Enhanced Header - Only show when hideHeader is false */}
      {!hideHeader && (
        <div className="flex-shrink-0 p-6 border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-orange to-primary-pink flex items-center justify-center shadow-lg">
                <MessageSquare size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Team Chat</h3>
                <div className="text-white/60 text-sm flex items-center space-x-2">
                  <Users size={14} />
                  <span>{participants.length} members</span>
                  <span className="mx-1">•</span>
                  {isConnected ? (
                    <span className="flex items-center space-x-1 text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Online</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-red-400">
                      <WifiOff size={14} />
                      <span>Offline</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleSound}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 hover:scale-105"
                title={soundEnabled ? "Disable sound notifications" : "Enable sound notifications"}
              >
                {soundEnabled ? (
                  <Volume2 size={18} className="text-white/80" />
                ) : (
                  <VolumeX size={18} className="text-white/60" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-8 sm:py-12 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-primary-orange/20 to-primary-pink/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <MessageSquare size={24} className="text-white/40 sm:w-8 sm:h-8" />
              </div>
              <h4 className="text-white/80 text-base sm:text-lg font-semibold mb-2">No messages yet</h4>
              <p className="text-white/50 text-sm">Start the conversation with your team!</p>
            </div>
          </div>
        ) : (
          <div className="py-2 sm:py-4">
            {messages.map((message, index) => renderMessage(message, index))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex-shrink-0 mx-4 mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm animate-slideIn">
          {error}
        </div>
      )}

      {/* Enhanced Input Section - Fixed to bottom */}
      <div className="flex-shrink-0 p-3 sm:p-6 border-t border-white/10 bg-white/5 backdrop-blur-sm">
        {/* Debug toggle */}
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={toggleDebug}
            className="text-xs text-white/30 hover:text-white/50 transition-colors"
            title="Toggle debug mode"
          >
            {debugMode ? 'Hide Debug' : 'Debug'}
          </button>
        </div>

        {/* Input area */}
        <div className="flex items-end space-x-2 sm:space-x-3">
          <div className="flex-1">
            <div className="relative">
              <div className="flex items-center space-x-2 sm:space-x-3 bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/20 focus-within:border-white/40 transition-all duration-200">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 500) {
                      handleTyping(value);
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent text-white placeholder-white/50 focus:outline-none text-sm"
                  disabled={loading || isRecording}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  style={{ fontSize: '16px' }}
                />
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span className="text-xs text-white/40 font-medium hidden sm:block">
                    {newMessage.length}/500
                  </span>
                  <button className="p-1 rounded-full hover:bg-white/20 transition-colors">
                    <Smile size={16} className="text-white/60 sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="absolute -top-8 left-4 text-xs text-white/60 animate-pulse">
                  Typing...
                </div>
              )}
            </div>
          </div>
          
          {/* Voice Recording */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {isRecording ? (
              <div className="flex items-center space-x-2 sm:space-x-3 bg-red-500/20 text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl border border-red-500/30 animate-pulse">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm font-bold">{formatDuration(recordingDuration)}</span>
                <button
                  onClick={stopRecording}
                  className="p-1 hover:bg-red-500/20 rounded-full transition-colors"
                >
                  <Square size={14} className="text-red-400 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={startRecording}
                disabled={loading}
                className="p-2 sm:p-3 bg-gradient-to-r from-primary-orange to-primary-pink hover:from-primary-orange/80 hover:to-primary-pink/80 text-white rounded-full transition-all duration-200 disabled:opacity-50 hover:scale-105 shadow-lg"
                title="Record voice message"
              >
                <Mic size={16} className="sm:w-5 sm:h-5" />
              </button>
            )}
            
            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={loading || newMessage.trim() === '' || isRecording}
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

      {/* Debug Panel */}
      {debugMode && (
        <div className="flex-shrink-0 px-6 py-4 bg-purple-500/20 border-t border-purple-500/30 text-purple-300 text-sm">
          <div className="mb-3">
            <strong>Debug Information:</strong>
          </div>
          <div className="text-xs space-y-1 mb-4">
            <div>Match ID: {matchId}</div>
            <div>Messages: {messages.length}</div>
            <div>User ID: {currentUser?.id}</div>
            <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
            <div>Subscription: {subscriptionRef.current ? 'Active' : 'Inactive'}</div>
            <div>Polling: {pollingEnabled ? 'Enabled' : 'Disabled'}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testMessage}
              className="px-3 py-1 bg-purple-500/30 rounded-full text-xs hover:bg-purple-500/40 transition-colors"
            >
              Test Message
            </button>
            <button
              onClick={testConnection}
              className="px-3 py-1 bg-blue-500/30 rounded-full text-xs hover:bg-blue-500/40 transition-colors"
            >
              Test Real-time
            </button>
            <button
              onClick={checkRealtimeStatus}
              className="px-3 py-1 bg-yellow-500/30 rounded-full text-xs hover:bg-yellow-500/40 transition-colors"
            >
              Check Status
            </button>
            <button
              onClick={reloadMessages}
              className="px-3 py-1 bg-green-500/30 rounded-full text-xs hover:bg-green-500/40 transition-colors"
            >
              Reload
            </button>
            <button
              onClick={togglePolling}
              className="px-3 py-1 bg-indigo-500/30 rounded-full text-xs hover:bg-indigo-500/40 transition-colors"
            >
              {pollingEnabled ? 'Stop Polling' : 'Start Polling'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchChat; 