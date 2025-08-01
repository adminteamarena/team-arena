import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, Trophy, MessageCircle, UserPlus, Check, Trash2, AlertTriangle, UserMinus, DoorOpen, MessageSquare, Send, CheckCircle, Clock } from 'lucide-react';
import { Match, MatchParticipant, matches, realtime, chat } from '../../lib/supabase';
import Button from '../ui/Button';
import ReadyCheck from './ReadyCheck';
import InviteFriendsModal from './InviteFriendsModal';

interface MatchDetailModalProps {
  match: Match;
  onClose: () => void;
  currentUser: any;
  onMatchDeleted?: () => void;
  onChatOpen?: (matchId: string) => void;
}

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ 
  match: initialMatch, 
  onClose, 
  currentUser, 
  onMatchDeleted,
  onChatOpen
}) => {
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match>(initialMatch);
  const [loading, setLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<{ position: number; team: 'A' | 'B' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [participantToKick, setParticipantToKick] = useState<MatchParticipant | null>(null);
  const [showKickConfirm, setShowKickConfirm] = useState(false);
  
  // Add join confirmation modal state
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [joinPosition, setJoinPosition] = useState<{ position: number; team: 'A' | 'B' } | null>(null);
  
  // Invite friends modal state
  const [showInviteFriends, setShowInviteFriends] = useState(false);
  
  // Chat unread state
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: 'success' | 'error';
    show: boolean;
  }>({ message: '', type: 'success', show: false });
  
  // Mobile-style edit mode states (like iOS app icons)
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState<MatchParticipant | null>(null);
  const [dragOverDoor, setDragOverDoor] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<{ position: number; team: 'A' | 'B' } | null>(null);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  
  // Update local match state when initialMatch prop changes (e.g., fresh data)
  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);
  
  // These need to be reactive to match state changes
  const isParticipant = match.participants?.some(p => p.user_id === currentUser?.id);
  const isOrganizer = currentUser && match.organizer_id === currentUser.id;

  // Function to check unread messages for this specific match
  const checkUnreadMessages = async () => {
    if (!currentUser?.id) return;
    
    try {
      // Get the last seen timestamp for this match
      const lastSeenKey = `match_chat_last_seen_${match.id}_${currentUser.id}`;
      const lastSeen = localStorage.getItem(lastSeenKey);
      
      if (!lastSeen) {
        // If no last seen timestamp, check if there are any messages
        const { data: messages } = await chat.getMessages(match.id);
        setHasUnreadMessages(Boolean(messages && messages.length > 0));
        return;
      }
      
      // Check for messages newer than last seen
      const { data: messages } = await chat.getMessages(match.id);
      if (messages) {
        const unreadCount = messages.filter(msg => 
          msg.user_id !== currentUser.id && // Not from current user
          new Date(msg.created_at) > new Date(lastSeen) // Newer than last seen
        ).length;
        setHasUnreadMessages(unreadCount > 0);
      }
    } catch (error) {
      console.error('Error checking unread messages:', error);
    }
  };

  useEffect(() => {
    // Lock body scroll when modal opens
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    // Check for unread messages
    checkUnreadMessages();
    
    // Subscribe to real-time match updates
    const subscription = realtime.subscribeToMatch(match.id, (updatedMatch) => {
      console.log('🔄 Real-time match update received:', updatedMatch);
      
      // If updatedMatch is null, it means the match was deleted
      if (updatedMatch === null) {
        console.log('🗑️ Match was deleted, closing modal');
        alert('🚨 This match has been deleted by the organizer.');
        onClose(); // Close the modal
        return;
      }
      
      setMatch(updatedMatch);
    });

    // Subscribe to chat messages to update unread status
    const chatSubscription = chat.subscribeToMessages(match.id, (message) => {
      // If message is from another user, mark as unread
      if (message.user_id !== currentUser?.id) {
        setHasUnreadMessages(true);
      }
    });

    // Real-time updates are handled by the subscription above

    return () => {
      // Restore body scroll when modal closes
      document.body.style.overflow = originalStyle;
      subscription.unsubscribe();
      chatSubscription.unsubscribe();
    };
  }, [match.id, currentUser?.id]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 [MatchDetailModal] Match data:', match);
    console.log('🔍 [MatchDetailModal] Organizer data:', match.organizer);
    console.log('🔍 [MatchDetailModal] Organizer ID:', match.organizer_id);
    console.log('🔍 [MatchDetailModal] Participants data:', match.participants);
    console.log('🔍 [MatchDetailModal] Current user is participant:', isParticipant);
    console.log('🔍 [MatchDetailModal] Current user is organizer:', isOrganizer);
    if (match.participants && match.participants.length > 0) {
      console.log('🔍 [MatchDetailModal] First participant:', match.participants[0]);
      console.log('🔍 [MatchDetailModal] First participant profile:', match.participants[0].profile);
    }
  }, [match, match.participants, isParticipant, isOrganizer]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (draggedPlayer) {
          // Cancel drag mode
          setDraggedPlayer(null);
          setDragOverSlot(null);
        } else if (isEditMode) {
          // Close edit mode
          setIsEditMode(false);
        } else {
          // Close modal
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onClose, draggedPlayer, isEditMode]);

  // Handle profile navigation
  const handleProfileClick = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent position selection
    navigate(`/profile/${userId}`);
  };

  const handleJoinMatch = async () => {
    if (!joinPosition || !currentUser) return;

    setLoading(true);
    try {
      const { error } = await matches.joinMatch(
        match.id,
        currentUser.id,
        joinPosition.position,
        joinPosition.team
      );

      if (error) {
        console.error('Error joining match:', error);
        showToast(`Failed to join match: ${error.message}`, 'error');
      } else {
        // Optimistic update: immediately add the current user to the participants
        const newParticipant: MatchParticipant = {
          id: `temp-${Date.now()}`, // Temporary ID
          match_id: match.id,
          user_id: currentUser.id,
          position_number: joinPosition.position,
          team_side: joinPosition.team,
          is_ready: false,
          is_confirmed: false,
          joined_at: new Date().toISOString(),
          profile: {
            id: currentUser.id,
            username: currentUser.email?.split('@')[0] || 'user',
            full_name: currentUser.user_metadata?.full_name || '',
            bio: undefined,
            avatar_url: currentUser.user_metadata?.avatar_url || undefined,
            followers_count: 0,
            following_count: 0,
            matches_played: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };

        setMatch(prevMatch => ({
          ...prevMatch,
          participants: [...(prevMatch.participants || []), newParticipant],
          participant_count: (prevMatch.participant_count || 0) + 1
        }));

        // Force refresh match data from server as backup
        setTimeout(async () => {
          try {
            const { data: updatedMatch } = await matches.getMatch(match.id);
            if (updatedMatch) {
              console.log('🔄 Force refreshed match data after join:', updatedMatch);
              setMatch(updatedMatch);
            }
          } catch (refreshError) {
            console.error('Error refreshing match data:', refreshError);
          }
        }, 500); // Small delay to ensure database is updated

        // Close confirmation modal and show success
        setShowJoinConfirm(false);
        setJoinPosition(null);
        setSelectedPosition(null);
        showToast('Successfully joined the match! Don\'t forget to confirm your spot.', 'success');
      }
    } catch (error) {
      console.error('Error joining match:', error);
      showToast(`Failed to join match: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveMatch = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const { error } = await matches.leaveMatch(match.id, currentUser.id);
      
      if (error) {
        console.error('Error leaving match:', error);
        alert(`❌ Failed to leave match: ${error.message}`);
      } else {
        // Optimistic update: immediately remove the current user from participants
        setMatch(prevMatch => ({
          ...prevMatch,
          participants: prevMatch.participants?.filter(p => p.user_id !== currentUser.id) || [],
          participant_count: Math.max((prevMatch.participant_count || 0) - 1, 0)
        }));

        // Force refresh match data from server as backup
        setTimeout(async () => {
          try {
            const { data: updatedMatch } = await matches.getMatch(match.id);
            if (updatedMatch) {
              console.log('🔄 Force refreshed match data after leave:', updatedMatch);
              setMatch(updatedMatch);
            }
          } catch (refreshError) {
            console.error('Error refreshing match data:', refreshError);
          }
        }, 500); // Small delay to ensure database is updated

        alert(`✅ Successfully left the match!`);
      }
    } catch (error) {
      console.error('Error leaving match:', error);
      alert(`❌ Failed to leave match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const { error } = await matches.deleteMatch(match.id, currentUser.id);
      
      if (error) {
        console.error('Error deleting match:', error);
        alert(`Failed to delete match: ${error.message}`);
      } else {
        alert('Match deleted successfully!');
        if (onMatchDeleted) {
          onMatchDeleted(); // Refresh the matches list and close modal
        } else {
          onClose(); // Close modal
          navigate('/matches'); // Navigate back to matches page
        }
      }
    } catch (error) {
      console.error('Error deleting match:', error);
      alert(`Failed to delete match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleKickParticipant = async () => {
    if (!participantToKick || !currentUser) return;

    setLoading(true);
    try {
      const { error } = await matches.kickParticipant(match.id, participantToKick.user_id, currentUser.id);
      
      if (error) {
        console.error('Error kicking participant:', error);
        alert(`❌ Failed to kick participant: ${error.message}`);
      } else {
        // Optimistic update: immediately remove the participant from the list
        setMatch(prevMatch => ({
          ...prevMatch,
          participants: prevMatch.participants?.filter(p => p.user_id !== participantToKick.user_id) || [],
          participant_count: Math.max((prevMatch.participant_count || 0) - 1, 0)
        }));

        // Force refresh match data from server as backup
        setTimeout(async () => {
          try {
            const { data: updatedMatch } = await matches.getMatch(match.id);
            if (updatedMatch) {
              console.log('🔄 Force refreshed match data after kick:', updatedMatch);
              setMatch(updatedMatch);
            }
          } catch (refreshError) {
            console.error('Error refreshing match data:', refreshError);
          }
        }, 500); // Small delay to ensure database is updated

        alert(`✅ Successfully kicked ${participantToKick.profile?.full_name || participantToKick.profile?.username || 'participant'} from the match!`);
      }
    } catch (error) {
      console.error('Error kicking participant:', error);
      alert(`❌ Failed to kick participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setShowKickConfirm(false);
      setParticipantToKick(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage({ message, type, show: true });
    setTimeout(() => {
      setToastMessage(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleToggleConfirmation = async () => {
    if (!currentUser) return;
    
    const currentParticipant = match.participants?.find(p => p.user_id === currentUser.id);
    if (!currentParticipant) return;

    const newConfirmationStatus = !currentParticipant.is_confirmed;
    
    setLoading(true);
    try {
      // Call the backend API to update confirmation status
      const { error } = await matches.updateConfirmationStatus(
        match.id, 
        currentUser.id, 
        newConfirmationStatus
      );

      if (error) {
        console.error('Error updating confirmation:', error);
        showToast('Failed to update confirmation. Please try again.', 'error');
        return;
      }
      
      // Optimistic update - the real-time subscription will handle the actual update
      setMatch(prevMatch => ({
        ...prevMatch,
        participants: prevMatch.participants?.map(p => 
          p.user_id === currentUser.id 
            ? { ...p, is_confirmed: newConfirmationStatus }
            : p
        ) || []
      }));

      // Show success message with toast
      showToast(
        newConfirmationStatus ? 
          'Spot confirmed! You\'re all set.' : 
          'Confirmation removed. Don\'t forget to confirm later.',
        'success'
      );
      
    } catch (error) {
      console.error('Error updating confirmation:', error);
      showToast('Failed to update confirmation. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Long press and drag handlers
  const handleLongPressStart = (participant: MatchParticipant, e: React.TouchEvent | React.MouseEvent) => {
    if (!isOrganizer || participant.user_id === currentUser?.id) return;
    
    e.preventDefault();
    
    longPressTimer.current = setTimeout(() => {
      // Enter edit mode - all slots become editable (like iOS)
      setIsEditMode(true);
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDragOver = (position: number, team: 'A' | 'B') => {
    if (!draggedPlayer || !isEditMode) return;
    
    // Check if slot is empty or contains the dragged player
    const targetSlot = match.participants?.find(p => p.team_side === team && p.position_number === position);
    if (!targetSlot || targetSlot.user_id === draggedPlayer.user_id) {
      setDragOverSlot({ position, team });
      setDragOverDoor(false); // Clear door hover when over slot
    }
  };

  const handleDrop = async (targetPosition: number, targetTeam: 'A' | 'B') => {
    if (!draggedPlayer || !isOrganizer || !isEditMode) return;
    
    // Check if target slot is empty
    const targetSlot = match.participants?.find(p => p.team_side === targetTeam && p.position_number === targetPosition);
    if (targetSlot && targetSlot.user_id !== draggedPlayer.user_id) {
      alert('❌ Target slot is occupied!');
      setDraggedPlayer(null);
      setDragOverSlot(null);
      return;
    }
    
    // Don't move if it's the same position
    if (draggedPlayer.team_side === targetTeam && draggedPlayer.position_number === targetPosition) {
      setDraggedPlayer(null);
      setDragOverSlot(null);
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await matches.updateParticipantPosition(
        match.id,
        draggedPlayer.user_id,
        targetPosition,
        targetTeam
      );
      
      if (error) {
        console.error('Error moving player:', error);
        alert(`❌ Failed to move player: ${error.message}`);
      } else {
        // Optimistic update
        setMatch(prevMatch => ({
          ...prevMatch,
          participants: prevMatch.participants?.map(p => 
            p.user_id === draggedPlayer.user_id 
              ? { ...p, position_number: targetPosition, team_side: targetTeam }
              : p
          ) || []
        }));
        
        // Add haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
      }
    } catch (error) {
      console.error('Error moving player:', error);
      alert(`❌ Failed to move player: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setDraggedPlayer(null);
      setDragOverSlot(null);
    }
  };

  const handleDragToDoor = async () => {
    if (!draggedPlayer || !isOrganizer || !isEditMode) return;
    
    // Show confirmation for kicking player
    setParticipantToKick(draggedPlayer);
    setShowKickConfirm(true);
    setDraggedPlayer(null);
    setDragOverDoor(false);
    setDragOverSlot(null);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setDraggedPlayer(null);
    setDragOverSlot(null);
    setDragOverDoor(false);
  };

  const renderPlayerPosition = (position: number, team: 'A' | 'B') => {
    const participant = match.participants?.find(p => p.team_side === team && p.position_number === position);
    const isSelected = selectedPosition?.position === position && selectedPosition?.team === team;
    const isCurrentUser = participant?.user_id === currentUser?.id;
    const isDraggedOver = dragOverSlot?.position === position && dragOverSlot?.team === team;
    const isBeingDragged = draggedPlayer?.user_id === participant?.user_id;
    const canManage = isOrganizer && participant && participant.user_id !== currentUser?.id;
    
    return (
      <div
        key={`${team}-${position}`}
        className={`relative group w-20 h-24 md:w-28 md:h-32 rounded-2xl border-2 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm ${
          isEditMode && participant && canManage
            ? 'animate-shake cursor-grab hover:cursor-grabbing' // Shake animation and grab cursor when in edit mode
            : 'cursor-pointer'
        } ${
          isBeingDragged
            ? 'opacity-50 scale-95 border-primary-orange border-dashed'
            : isDraggedOver
            ? 'bg-gradient-to-br from-primary-orange/40 to-primary-pink/30 border-primary-orange border-dashed scale-105'
            : participant
            ? (() => {
                const isOrganizer = participant.user_id === match.organizer_id;
                if (isOrganizer) {
                  // Organizer slot - always yellow (special role)
                  return 'bg-gradient-to-br from-yellow-400/25 via-yellow-500/20 to-yellow-400/15 border-yellow-400/60 hover:border-yellow-400 hover:shadow-yellow-400/30 hover:scale-105';
                } else if (participant.is_confirmed) {
                  // Confirmed participants - green
                  return 'bg-gradient-to-br from-green-500/25 via-green-600/20 to-green-500/15 border-green-400/60 hover:border-green-400 hover:shadow-green-400/30 hover:scale-105';
                } else {
                  // Unconfirmed participants - red
                  return 'bg-gradient-to-br from-red-500/25 via-red-600/20 to-red-500/15 border-red-400/60 hover:border-red-400 hover:shadow-red-400/30 hover:scale-105';
                }
              })()
            : isSelected
            ? 'bg-gradient-to-br from-primary-orange/35 to-primary-pink/25 border-primary-orange border-dashed hover:from-primary-orange/45 hover:to-primary-pink/35'
            : 'bg-gradient-to-br from-white/8 to-white/4 border-white/25 hover:from-white/15 hover:to-white/8 hover:border-white/50 hover:shadow-white/15 hover:scale-105'
        }`}
        onClick={(e) => {
          if (isEditMode) {
            // In edit mode, clicking does nothing - users are immediately draggable
            e.preventDefault();
            return;
          }
          
          if (participant) {
            // If slot is occupied, navigate to profile
            handleProfileClick(participant.user_id, e);
          } else if (currentUser) {
            // If slot is empty and user is logged in
            if (isParticipant || isOrganizer) {
              // If user is already participant or organizer, show invite friends
              setShowInviteFriends(true);
            } else {
              // If user is not in match, show join confirmation
              setJoinPosition({ position, team });
              setShowJoinConfirm(true);
            }
          }
        }}
        onTouchStart={(e) => {
          if (participant && !isEditMode) {
            handleLongPressStart(participant, e);
          }
        }}
        onTouchEnd={(e) => {
          if (participant && !isEditMode) {
            handleLongPressEnd();
          } else if (!participant && currentUser) {
            // For empty slots on mobile
            e.preventDefault();
            if (isParticipant || isOrganizer) {
              // If user is already participant or organizer, show invite friends
              setShowInviteFriends(true);
            } else {
              // If user is not in match, show join confirmation
              setJoinPosition({ position, team });
              setShowJoinConfirm(true);
            }
          }
        }}
        onMouseDown={(e) => {
          if (participant && !isEditMode) {
            handleLongPressStart(participant, e);
          }
        }}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onDragStart={(e) => {
          if (participant && isEditMode && canManage) {
            // Set the dragged player at the start of drag operation
            setDraggedPlayer(participant);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', participant.user_id);
            
            // Add haptic feedback if available
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
          }
        }}
        onDragEnd={() => {
          // Clear dragged player state when drag operation ends
          if (isEditMode) {
            setDraggedPlayer(null);
            setDragOverSlot(null);
            setDragOverDoor(false);
          }
        }}
        onDragOver={(e) => {
          if (isEditMode && draggedPlayer) {
            // Check if this is a valid drop target (empty slot or same player)
            const targetSlot = match.participants?.find(p => p.team_side === team && p.position_number === position);
            if (!targetSlot || targetSlot.user_id === draggedPlayer.user_id) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              handleDragOver(position, team);
            }
          }
        }}
        onDragEnter={(e) => {
          if (isEditMode && draggedPlayer) {
            e.preventDefault();
          }
        }}
        onDrop={(e) => {
          if (isEditMode && draggedPlayer) {
            e.preventDefault();
            handleDrop(position, team);
          }
        }}
        onDragLeave={(e) => {
          if (isEditMode && draggedPlayer) {
            // Only clear drag over if we're actually leaving the element
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
              setDragOverSlot(null);
            }
          }
        }}
        draggable={isEditMode && participant && canManage}
        title={
          isEditMode 
            ? participant && canManage 
              ? 'Drag to move position or drag to door to kick'
              : 'Edit mode active'
            : participant 
            ? `${canManage ? 'Long press to enter edit mode • ' : ''}View ${(participant.profile?.full_name?.trim() && participant.profile.full_name.trim() !== '') ? 
                participant.profile.full_name.trim() : 
                participant.profile?.username || 'User'}'s profile` 
            : currentUser
            ? (isParticipant || isOrganizer) 
              ? 'Click to invite friends'
              : 'Click to join this position'
            : 'Empty slot'
        }
      >
        {participant ? (
          <div className="w-full h-full flex flex-col items-center justify-between p-2 md:p-3">
            {/* Player Avatar */}
            <div className="relative flex-shrink-0">
              {(() => {
                const isOrganizer = participant.user_id === match.organizer_id;
                let avatarColors;
                if (isOrganizer) {
                  // Organizer avatar - always yellow (special role)
                  avatarColors = {
                    border: "border-yellow-400/60 ring-yellow-400/30",
                    bg: "bg-gradient-to-br from-yellow-400/35 to-yellow-500/25",
                    text: "text-yellow-100"
                  };
                } else if (participant.is_confirmed) {
                  // Confirmed participants - green
                  avatarColors = {
                    border: "border-green-400/60 ring-green-400/30",
                    bg: "bg-gradient-to-br from-green-500/35 to-green-600/25",
                    text: "text-green-100"
                  };
                } else {
                  // Unconfirmed participants - red
                  avatarColors = {
                    border: "border-red-400/60 ring-red-400/30",
                    bg: "bg-gradient-to-br from-red-500/35 to-red-600/25",
                    text: "text-red-100"
                  };
                }

                return participant.profile?.avatar_url ? (
                  <img
                    src={participant.profile.avatar_url}
                    alt={participant.profile.full_name || participant.profile.username}
                    className={`w-10 h-10 md:w-14 md:h-14 rounded-full object-cover border-3 ${avatarColors.border} shadow-xl ring-2`}
                  />
                ) : (
                  <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full ${avatarColors.bg} flex items-center justify-center border-3 ${avatarColors.border} shadow-xl ring-2`}>
                    <span className={`${avatarColors.text} font-bold text-sm md:text-lg drop-shadow-sm`}>
                      {(participant.profile?.full_name?.trim() && participant.profile.full_name.trim() !== '') ? 
                        participant.profile.full_name.trim().charAt(0).toUpperCase() : 
                        participant.profile?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                );
              })()}
              
              {/* Confirmation indicator */}
              {participant.is_confirmed && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                  <CheckCircle size={10} className="text-white" />
                </div>
              )}
              
              {/* Ready indicator */}
              {participant.is_ready && (
                <div className="absolute -top-1 -left-1 w-5 h-5 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                  <Check size={10} className="text-white" />
                </div>
              )}
              
              {/* Position number badge */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                <span className="text-white font-bold text-xs">{position}</span>
              </div>
              
              {/* Edit mode delete indicator */}
              {isEditMode && canManage && (
                <div className="absolute -top-1 -left-1 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                  <X size={10} className="text-white" />
                </div>
              )}
            </div>

            {/* Player Name */}
            <div className="text-center flex-1 flex flex-col items-center justify-end w-full">
              <div className="bg-black/20 backdrop-blur-sm rounded-lg px-2 py-1 min-w-0 max-w-full">
                <span className="text-white font-semibold text-xs md:text-sm leading-tight truncate block drop-shadow-sm">
                  {isCurrentUser ? 'You' : 
                    (participant.profile?.full_name?.trim() && participant.profile.full_name.trim() !== '') ? 
                      participant.profile.full_name.trim() : 
                      participant.profile?.username || 'User'
                  }
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 md:p-3 group-hover:scale-105 transition-transform duration-200">
            {/* Empty slot indicator */}
            <div className="relative">
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-3 border-dashed backdrop-blur-sm shadow-xl transition-all duration-300 flex items-center justify-center group-hover:border-solid ${
              currentUser && (isParticipant || isOrganizer)
                ? 'border-blue-400/40 bg-gradient-to-br from-blue-500/8 to-blue-400/4 group-hover:border-blue-400/80 group-hover:from-blue-500/15 group-hover:to-blue-400/10 group-hover:shadow-blue-400/20'
                : 'border-white/40 bg-gradient-to-br from-white/8 to-white/4 group-hover:border-primary-orange/70 group-hover:from-primary-orange/15 group-hover:to-primary-pink/10 group-hover:shadow-primary-orange/20'
            }`}>
                {currentUser ? (
                  (isParticipant || isOrganizer) ? (
                    <Send size={28} className="md:w-9 md:h-9 text-blue-400/60 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-300 drop-shadow-lg" />
                  ) : (
                    <UserPlus size={28} className="md:w-9 md:h-9 text-white/60 group-hover:text-primary-orange group-hover:scale-110 transition-all duration-300 drop-shadow-lg" />
                  )
                ) : (
                  <Users size={28} className="md:w-9 md:h-9 text-white/50 drop-shadow-lg" />
                )}
              </div>
              
              {/* Position number badge */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full flex items-center justify-center border-2 border-white/40 shadow-xl">
                <span className="text-white font-bold text-xs">{position}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTeamGrid = (team: 'A' | 'B') => {
    const teamSize = match.max_players / 2;
    const positions = [];
    
    for (let i = 1; i <= teamSize; i++) {
      positions.push(renderPlayerPosition(i, team));
    }

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${
            team === 'A' ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-gradient-to-r from-green-400 to-emerald-400'
          }`}></div>
          <h3 className={`text-lg md:text-xl font-bold ${
            team === 'A' ? 'text-blue-400' : 'text-green-400'
          }`}>
            Team {team}
          </h3>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-3 justify-items-center">
          {positions}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-2 md:p-4 z-[60] animate-in fade-in duration-300" style={{ minHeight: '100dvh' }}>
      <div className="bg-background-dark/95 backdrop-blur-lg border border-white/20 rounded-2xl w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl h-[calc(100vh-6rem)] md:h-auto md:max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/20">
          <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-primary-orange to-primary-pink flex items-center justify-center flex-shrink-0">
              <Trophy className="text-white" size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-2xl font-bold text-white break-words truncate">{match.title}</h2>
              <p className="text-sm md:text-base text-white/60 truncate">{match.sport_type} • {match.team_format}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Content - Full Width */}
        <div className="flex-1 min-h-0 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent break-words max-w-full">
          {/* Edit Mode Header */}
          {isEditMode && (
            <div className="mb-6 p-4 bg-primary-orange/20 border border-primary-orange/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-orange/30 rounded-lg flex items-center justify-center animate-pulse-soft">
                    <Users size={16} className="text-primary-orange" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Edit Mode Active</h3>
                    <p className="text-white/60 text-sm">Drag players to move • Drag to door to kick</p>
                  </div>
                </div>
                <button
                  onClick={exitEditMode}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
          
          {/* Ready Check */}
          {match.ready_check_started && (
            <div className="mb-6">
              <ReadyCheck 
                match={match}
                currentUser={currentUser}
                onReadyStatusChange={(isReady: boolean) => {
                  if (currentUser) {
                    matches.updateReadyStatus(match.id, currentUser.id, isReady);
                  }
                }}
              />
            </div>
          )}

          {/* Team Grids */}
          <div className="space-y-8">
            {renderTeamGrid('A')}
            {renderTeamGrid('B')}
          </div>

          {/* Confirmation Status Summary */}
          {(isParticipant || isOrganizer) && match.participants && match.participants.length > 0 && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center">
                <CheckCircle size={20} className="mr-2" />
                Confirmation Status
              </h3>
              
              {/* Current User Confirmation Toggle */}
              {isParticipant && (
                <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-orange/20 to-primary-pink/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">You</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">Your Confirmation</p>
                        <p className="text-white/60 text-sm">
                          {(() => {
                            const currentParticipant = match.participants?.find(p => p.user_id === currentUser?.id);
                            return currentParticipant?.is_confirmed ? 'You have confirmed your spot' : 'Please confirm your participation';
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Minimalist Confirmation Toggle */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleConfirmation();
                        }}
                        disabled={loading}
                        className={`relative w-12 h-6 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 border ${
                          (() => {
                            const currentParticipant = match.participants?.find(p => p.user_id === currentUser?.id);
                            return currentParticipant?.is_confirmed
                              ? 'bg-gradient-to-r from-primary-orange to-primary-pink border-primary-orange/50'
                              : 'bg-white/10 hover:bg-white/15 border-white/30';
                          })()
                        }`}
                        title={(() => {
                          const currentParticipant = match.participants?.find(p => p.user_id === currentUser?.id);
                          return currentParticipant?.is_confirmed ? 'Confirmed ✓ - Click to remove' : 'Click to confirm your spot';
                        })()}
                      >
                        {/* Toggle knob */}
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ease-out flex items-center justify-center ${
                            (() => {
                              const currentParticipant = match.participants?.find(p => p.user_id === currentUser?.id);
                              return currentParticipant?.is_confirmed
                                ? 'translate-x-6 bg-white'
                                : 'translate-x-0.5 bg-white/90';
                            })()
                          }`}
                        >
                          {/* Icon inside the knob */}
                          <div className={`transition-all duration-200 ${
                            (() => {
                              const currentParticipant = match.participants?.find(p => p.user_id === currentUser?.id);
                              return currentParticipant?.is_confirmed ? 'scale-100 opacity-100' : 'scale-0 opacity-0';
                            })()
                          }`}>
                            <CheckCircle size={12} className="text-primary-orange" />
                          </div>
                        </div>

                        {/* Invisible touch area for better mobile interaction */}
                        <div className="absolute -inset-3"></div>
                      </button>
                      
                      {/* Status text below toggle */}
                      <div className={`mt-1 text-center transition-all duration-300 ${
                        (() => {
                          const currentParticipant = match.participants?.find(p => p.user_id === currentUser?.id);
                          return currentParticipant?.is_confirmed 
                            ? 'text-primary-orange' 
                            : 'text-white/60';
                        })()
                      }`}>
                        <span className="text-[9px] font-medium">
                          {(() => {
                            const currentParticipant = match.participants?.find(p => p.user_id === currentUser?.id);
                            return currentParticipant?.is_confirmed ? 'CONFIRMED' : 'PENDING';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/80">Confirmed participants:</span>
                  <span className="text-blue-400 font-semibold">
                    {match.participants.filter(p => p.is_confirmed).length} / {match.participants.length}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${match.participants.length > 0 
                        ? (match.participants.filter(p => p.is_confirmed).length / match.participants.length) * 100 
                        : 0}%`
                    }}
                  />
                </div>
                {match.participants.filter(p => !p.is_confirmed).length > 0 && (
                  <p className="text-orange-400 text-sm mt-2">
                    {match.participants.filter(p => !p.is_confirmed).length} participant(s) haven't confirmed yet
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Match Info */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Match Details</h3>
            <div className="space-y-2 text-white/80">
              <p><strong>Date:</strong> {match.date} at {match.time}</p>
              <p className="break-words"><strong>Location:</strong> {match.location}</p>
              <p><strong>Organizer:</strong> {
                match.organizer?.full_name?.trim() || 
                match.organizer?.username || 
                'Unknown Organizer'
              }</p>
              <p className="flex items-center">
                <strong>Price:</strong> 
                <span className="ml-2 flex items-center">
                  <span className="mr-2">💰</span>
                  <span className="text-green-400 font-semibold">
                    {match.is_paid ? `${match.price_per_person} ${match.currency || 'MAD'} /U` : 'FREE'}
                  </span>
                </span>
              </p>
              {match.description && (
                <div className="space-y-1">
                  <p><strong>Description:</strong></p>
                  <p className="text-white/70 bg-white/5 p-3 rounded-lg break-words overflow-wrap-anywhere whitespace-pre-wrap max-w-full">
                    {match.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-center flex-wrap gap-4 pb-4">
            {!isParticipant && selectedPosition && !isOrganizer && (
              <Button
                onClick={handleJoinMatch}
                loading={loading}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <UserPlus size={16} />
                <span>Join Match</span>
              </Button>
            )}
            
            {isParticipant && !isOrganizer && (
              <Button
                variant="outline"
                onClick={handleLeaveMatch}
                loading={loading}
                disabled={loading}
                className="flex items-center space-x-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
              >
                <UserMinus size={16} />
                <span>Leave Match</span>
              </Button>
            )}
            
            {isOrganizer && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                loading={loading}
                disabled={loading}
                className="flex items-center space-x-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
              >
                <Trash2 size={16} />
                <span>Delete Match</span>
              </Button>
            )}
            
            {(isParticipant || isOrganizer) && (match.participant_count || 0) < match.max_players && (
              <Button
                onClick={() => setShowInviteFriends(true)}
                variant="outline"
                className="flex items-center space-x-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50"
              >
                <Send size={16} />
                <span>Invite Friends</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Join Confirmation Modal */}
      {showJoinConfirm && joinPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-dark border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-orange/20 to-primary-pink/20 rounded-lg flex items-center justify-center ring-2 ring-white/20">
                <UserPlus size={24} className="text-primary-orange" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Join Match</h3>
                <p className="text-white/60 text-sm">Confirm your position</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-white/80 mb-2">
                Do you want to join this match as:
              </p>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    joinPosition.team === 'A' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    <span className="font-bold text-sm">{joinPosition.position}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      Team {joinPosition.team} - Position {joinPosition.position}
                    </p>
                    <p className="text-white/60 text-sm">
                      {match.sport_type} • {match.team_format}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowJoinConfirm(false);
                  setJoinPosition(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinMatch}
                loading={loading}
                disabled={loading}
                className="bg-gradient-to-r from-primary-orange to-primary-pink hover:from-primary-orange/90 hover:to-primary-pink/90"
              >
                <UserPlus size={16} className="mr-2" />
                Join Match
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button - Always visible, but only animate when unread messages */}
      {isParticipant && onChatOpen && (
        <button
          onClick={() => {
            // Mark messages as read when opening chat
            if (currentUser?.id) {
              chat.markMatchChatAsRead(match.id, currentUser.id);
              setHasUnreadMessages(false);
            }
            onChatOpen(match.id);
          }}
          className={`fixed bottom-24 md:bottom-6 right-6 z-[70] w-14 h-14 bg-gradient-to-r from-primary-orange to-primary-pink rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 ${
            hasUnreadMessages ? 'animate-bounce' : ''
          }`}
          title={hasUnreadMessages ? "New messages in team chat" : "Open team chat"}
        >
          <MessageCircle size={24} className="text-white" />
          {hasUnreadMessages && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          )}
        </button>
      )}

      {/* Simple Door for Kicking Players */}
      {isEditMode && isOrganizer && (
        <div 
          className={`door-icon-container fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[75] transition-all duration-200 ${
            dragOverDoor ? 'scale-105' : 'scale-100'
          }`}
          onDragOver={(e) => {
            if (draggedPlayer) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverDoor(true);
              setDragOverSlot(null);
            }
          }}
          onDragLeave={() => {
            setDragOverDoor(false);
          }}
          onDrop={(e) => {
            if (draggedPlayer) {
              e.preventDefault();
              handleDragToDoor();
            }
          }}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
            dragOverDoor 
              ? 'bg-gradient-to-r from-red-600 to-red-700' 
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            <DoorOpen size={24} className="text-white" />
          </div>
          <div className="mt-2 text-center">
            <p className="text-white text-xs font-medium">
              {dragOverDoor ? 'Drop to kick' : 'Drag here to kick'}
            </p>
          </div>
        </div>
      )}

      {/* Edit Mode Drag Helper */}
      {isEditMode && draggedPlayer && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[80] bg-primary-orange/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium">
                Moving {draggedPlayer.profile?.full_name || draggedPlayer.profile?.username || 'player'}
              </p>
              <p className="text-xs opacity-80">Drop on empty slot to move • Drop on door to kick</p>
            </div>
            <button
              onClick={exitEditMode}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              title="Exit edit mode"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70]">
          <div className="bg-background-dark/95 backdrop-blur-lg border border-red-500/30 rounded-xl p-6 m-4 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Match</h3>
                <p className="text-red-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-white/80 mb-6">
              Are you sure you want to delete "{match.title}"? All participants will be removed and match data will be permanently deleted.
            </p>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteMatch}
                loading={loading}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                Delete Match
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Kick Confirmation Modal */}
      {showKickConfirm && participantToKick && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70]">
          <div className="bg-background-dark/95 backdrop-blur-lg border border-yellow-500/30 rounded-xl p-6 m-4 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <UserMinus size={24} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Kick Player</h3>
                <p className="text-yellow-400 text-sm">Remove from match</p>
              </div>
            </div>
            
            <p className="text-white/80 mb-6">
              Are you sure you want to kick "{participantToKick.profile?.full_name || participantToKick.profile?.username || 'this player'}" from the match?
            </p>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowKickConfirm(false);
                  setParticipantToKick(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleKickParticipant}
                loading={loading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                Kick Player
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        isOpen={showInviteFriends}
        onClose={() => setShowInviteFriends(false)}
        matchId={match.id}
        currentUserId={currentUser?.id || ''}
        matchTitle={match.title}
      />

      {/* Toast Notification */}
      {toastMessage.show && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[80] animate-in slide-in-from-top duration-300">
          <div className={`px-6 py-3 rounded-2xl backdrop-blur-lg shadow-2xl border-2 flex items-center space-x-3 max-w-sm ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
              : 'bg-red-500/20 border-red-400/40 text-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              toastMessage.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'
            }`} />
            <span className="text-sm font-medium">{toastMessage.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchDetailModal; 