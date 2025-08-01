import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, Users, Check } from 'lucide-react';
import { profiles, FollowUser, supabase } from '../../lib/supabase';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  currentUserId: string;
  matchTitle: string;
}

const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  isOpen,
  onClose,
  matchId,
  currentUserId,
  matchTitle
}) => {
  const [supporters, setSupporters] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  const [matchParticipants, setMatchParticipants] = useState<Set<string>>(new Set());
  const [swipeY, setSwipeY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load supporters and match participants when modal opens
  useEffect(() => {
    const loadSupportersAndParticipants = async () => {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        
        // Load supporters
        const supportersResult = await profiles.getFollowing(currentUserId);
        if (supportersResult.data) {
          setSupporters(supportersResult.data);
        } else {
          console.error('Error loading supporters:', supportersResult.error);
          setSupporters([]);
        }
        
        // Load match participants
        const { data: participants, error: participantsError } = await supabase
          .from('match_participants')
          .select('user_id')
          .eq('match_id', matchId);
        
        if (participantsError) {
          console.error('Error loading match participants:', participantsError);
        } else if (participants) {
          setMatchParticipants(new Set(participants.map(p => p.user_id)));
        }
        
      } catch (error) {
        console.error('Error loading data:', error);
        setSupporters([]);
      } finally {
        setLoading(false);
      }
    };

    loadSupportersAndParticipants();
  }, [isOpen, currentUserId, matchId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSwipeY(0);
      setIsDragging(false);
      setSupporters([]);
      setSentInvites(new Set());
      setMatchParticipants(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInvite = async (targetUserId: string) => {
    try {
      console.log(`Inviting user ${targetUserId} to match ${matchId}`);
      
      // Get current user profile info for the notification
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', currentUserId)
        .single();
      
      if (profileError) {
        console.error('Error fetching current user profile:', profileError);
        throw new Error('Failed to fetch user profile');
      }

      const inviterName = currentUserProfile?.full_name || currentUserProfile?.username || 'Someone';
      
      // Create match invitation notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'match_invitation',
          title: 'Match Invitation',
          message: `${inviterName} invited you to join "${matchTitle}"`,
          from_user_id: currentUserId,
          match_id: matchId,
          is_read: false,
          is_seen: false,
          data: {
            inviter_name: inviterName,
            inviter_id: currentUserId,
            match_id: matchId,
            match_title: matchTitle,
            invitation_status: 'pending'
          }
        });
      
      if (notificationError) {
        console.error('Error creating invitation notification:', notificationError);
        throw new Error('Failed to send invitation');
      }
      
      // Add to sent invites
      setSentInvites(prev => new Set(Array.from(prev).concat(targetUserId)));
      
      console.log(`✅ Successfully sent match invitation to user ${targetUserId}`);
      
    } catch (error) {
      console.error('Invite error:', error);
      alert(`❌ Failed to send invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  const renderSupporterItem = (supporter: FollowUser) => {
    const hasBeenInvited = sentInvites.has(supporter.id);
    const isInMatch = matchParticipants.has(supporter.id);

    return (
      <div key={supporter.id} className={`flex items-center justify-between p-3 transition-colors duration-200 ${
        isInMatch 
          ? 'bg-green-500/5 border-l-2 border-l-green-500/50 hover:bg-green-500/8' 
          : 'hover:bg-white/5'
      }`}>
        <div className="flex items-center space-x-3 flex-1">
          {/* Avatar */}
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary-orange to-primary-pink p-0.5">
            <div className="w-full h-full rounded-full bg-background-dark flex items-center justify-center overflow-hidden">
              {supporter.avatar_url ? (
                <img
                  src={supporter.avatar_url}
                  alt={supporter.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white text-xs font-bold">
                  {supporter.full_name ? supporter.full_name.charAt(0).toUpperCase() : supporter.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isInMatch && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-background-dark">
                <Check size={8} className="text-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-white font-medium text-xs truncate">{supporter.username}</h3>
            </div>
            <p className="text-white/60 text-xs truncate">{supporter.full_name}</p>
            {supporter.bio && (
              <p className="text-white/50 text-xs mt-0.5 truncate max-w-[180px]">
                {supporter.bio.length > 20 ? `${supporter.bio.slice(0, 20)}...` : supporter.bio}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {isInMatch ? (
            <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
              <div className="flex items-center space-x-1">
                <Users size={12} />
                <span>In Match</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleInvite(supporter.id)}
              disabled={hasBeenInvited}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                hasBeenInvited
                  ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              <div className="flex items-center space-x-1">
                {hasBeenInvited ? <Check size={12} /> : <Send size={12} />}
                <span>{hasBeenInvited ? 'Invited' : 'Invite'}</span>
              </div>
            </button>
          )}
        </div>
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
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-base">
              Invite Friends
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-white/60 text-xs mt-1 truncate">
            to "{matchTitle}"
          </p>
        </div>

        {/* User List */}
        <div className="relative">
          <div className="overflow-y-auto max-h-[calc(80vh-100px)] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-orange"></div>
              </div>
            ) : supporters.length > 0 ? (
              <div className="divide-y divide-white/5">
                {supporters.map(renderSupporterItem)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-white/60">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-base font-medium">No friends to invite</p>
                <p className="text-xs mt-1 text-center px-6">
                  Start supporting other players to invite them to your matches
                </p>
              </div>
            )}
          </div>
          
          {/* Scroll Indicator - Only show if there are many users */}
          {supporters.length > 6 && (
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background-dark to-transparent pointer-events-none"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteFriendsModal;