import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Sun, Cloud, CloudRain, Trophy, Flame, Zap, Crown, UserPlus, Trash2, AlertTriangle, MoreVertical, Send, Edit } from 'lucide-react';
import { Match, matches } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LazyImage from '../ui/LazyImage';
import { useCityContext } from '../../context/CityContext';
import InviteFriendsModal from './InviteFriendsModal';

interface EnhancedMatchCardProps {
  match: Match;
  onClick: () => void;
  currentUser?: any;
  onMatchDeleted?: () => void; // Callback to refresh the matches list
}

const EnhancedMatchCard: React.FC<EnhancedMatchCardProps> = memo(({ match, onClick, currentUser, onMatchDeleted }) => {
  const navigate = useNavigate();
  const { selectedCity } = useCityContext();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOrganizerMenu, setShowOrganizerMenu] = useState(false);
  const [showInviteFriends, setShowInviteFriends] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const participantCount = useMemo(() => match.participant_count || 0, [match.participant_count]);
  const spotsLeft = useMemo(() => match.max_players - participantCount, [match.max_players, participantCount]);
  
  // Check if current user is the organizer
  const isOrganizer = useMemo(() => currentUser && match.organizer_id === currentUser.id, [currentUser?.id, match.organizer_id]);
  
  // Close organizer menu when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setShowOrganizerMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showOrganizerMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrganizerMenu, handleClickOutside]);
  
  // Check if current user is already a participant
  const isParticipant = useMemo(() => 
    currentUser && match.participants?.some(p => p.user_id === currentUser.id),
    [currentUser?.id, match.participants]
  );
  
  // Determine if user can join (not organizer, not already participant, and spots available)
  const canJoin = useMemo(() => 
    currentUser && !isOrganizer && !isParticipant && spotsLeft > 0,
    [currentUser, isOrganizer, isParticipant, spotsLeft]
  );
  
  // Sport type gradients - memoized for performance
  const sportGradients = useMemo(() => ({
    Football: 'from-green-500 to-emerald-600',
    Basketball: 'from-orange-500 to-red-500',
    Tennis: 'from-yellow-500 to-orange-500',
    Soccer: 'from-green-400 to-blue-500',
    Volleyball: 'from-blue-400 to-purple-500',
    default: 'from-primary-orange to-primary-pink'
  }), []);

  // Sport type icons/emojis for better visual identification
  const sportIcons = useMemo(() => ({
    Football: '⚽',
    Basketball: '🏀',
    Tennis: '🎾',
    Soccer: '⚽',
    Volleyball: '🏐',
    Baseball: '⚾',
    Hockey: '🏒',
    Golf: '⛳',
    Swimming: '🏊',
    Boxing: '🥊',
    default: '🏆'
  }), []);

  // Weather icons
  const weatherIcons = useMemo(() => ({
    sunny: Sun,
    cloudy: Cloud,
    rainy: CloudRain,
    indoor: Trophy
  }), []);

  // Status colors and animations - memoized for performance
  const statusConfig = useMemo(() => {
    if (match.status === 'completed') {
      return {
        badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        text: 'COMPLETED',
        icon: Trophy,
        cardEffect: 'ring-2 ring-emerald-500/20 opacity-90'
      };
    }
    if (match.status === 'live') {
      return {
        badge: 'bg-green-500/20 text-green-400 animate-pulse',
        text: 'LIVE',
        icon: Zap,
        cardEffect: 'ring-2 ring-green-500/20'
      };
    }
    if (match.ready_check_started) {
      return {
        badge: 'bg-yellow-500/20 text-yellow-400 animate-pulse',
        text: 'READY CHECK',
        icon: Clock,
        cardEffect: 'ring-2 ring-yellow-500/20'
      };
    }
    if (spotsLeft <= 2 && spotsLeft > 0) {
      return {
        badge: 'bg-red-500/20 text-red-400 animate-pulse',
        text: `${spotsLeft} SPOTS LEFT`,
        icon: Flame,
        cardEffect: 'ring-2 ring-red-500/20'
      };
    }
    if (spotsLeft === 0) {
      return {
        badge: 'bg-primary-orange/20 text-primary-orange',
        text: 'FULL',
        icon: Users,
        cardEffect: ''
      };
    }
    return {
      badge: 'bg-blue-500/20 text-blue-400',
      text: 'FILLING UP',
      icon: Users,
      cardEffect: ''
    };
  }, [match.status, match.ready_check_started, spotsLeft]);
  const WeatherIcon = useMemo(() => 
    weatherIcons[match.weather_condition as keyof typeof weatherIcons] || weatherIcons.indoor,
    [weatherIcons, match.weather_condition]
  );
  const gradient = useMemo(() => 
    sportGradients[match.sport_type as keyof typeof sportGradients] || sportGradients.default,
    [sportGradients, match.sport_type]
  );
  const sportIcon = useMemo(() => 
    sportIcons[match.sport_type as keyof typeof sportIcons] || sportIcons.default,
    [sportIcons, match.sport_type]
  );

  // Handle profile navigation - memoized callback
  const handleProfileClick = useCallback((userId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click from triggering
    navigate(`/profile/${userId}`);
  }, [navigate]);

  // Handle match deletion - memoized callback
  const handleDeleteMatch = useCallback(async () => {
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
          onMatchDeleted(); // Refresh the matches list
        }
      }
    } catch (error) {
      console.error('Error deleting match:', error);
      alert(`Failed to delete match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setShowOrganizerMenu(false);
    }
  }, [currentUser?.id, match.id, onMatchDeleted]);

  // Use the selected city from context instead of hardcoded values
  const getMatchCity = useCallback(() => {
    return selectedCity || 'Casablanca';
  }, [selectedCity]);

  return (
    <div 
      className={`cursor-pointer hover:scale-105 transition-all duration-300 ${statusConfig.cardEffect} relative overflow-hidden`}
      onClick={onClick}
    >
      <Card className="h-full">
        {/* Background gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
        
        {/* Completed Match Overlay */}
        {match.status === 'completed' && (
          <div className="absolute inset-0 bg-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl">
            <div className="absolute top-4 right-4 flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30">
              <Trophy size={16} className="text-emerald-400" />
              <span className="text-emerald-400 font-semibold text-sm">MATCH COMPLETED</span>
            </div>
          </div>
        )}
        
        <div className="relative p-6">
          {/* Organizer Menu - Top Right Corner (Very Top) */}
          {isOrganizer && (
            <div className="absolute -top-3 -right-3 z-30">
              <div className="relative" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOrganizerMenu(!showOrganizerMenu);
                  }}
                  className="w-5 h-5 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full transition-colors shadow-lg border border-white/30"
                  title="Organizer options"
                >
                  <MoreVertical size={10} className="text-white" />
                </button>
                
                {showOrganizerMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-background-dark border border-white/20 rounded-lg shadow-xl z-40 py-1 min-w-[130px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/matches/modify/${match.id}`);
                        setShowOrganizerMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center space-x-2 text-sm"
                    >
                      <Edit size={14} />
                      <span>Modify</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                        setShowOrganizerMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center space-x-2 text-sm"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* City Label - Top Right Corner */}
          <div className="absolute top-2 right-2 md:top-1 md:right-1 z-10">
            <div className="flex items-center space-x-1 md:space-x-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-full border border-blue-400/30 shadow-lg">
              <span className="text-xs md:text-sm">📍</span>
              <span className="text-xs md:text-xs text-blue-200 font-semibold tracking-wide">{getMatchCity()}</span>
            </div>
          </div>

          {/* Top Row - Sport Type */}
          <div className="flex justify-start items-center mb-6">
            {/* Sport Type Indicator */}
            <div className="absolute top-2 left-2 md:top-1 md:left-1 z-10">
              <div className="flex items-center space-x-1 md:space-x-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-gradient-to-r from-orange-500/20 to-pink-500/20 backdrop-blur-sm rounded-full border border-orange-400/30 shadow-lg">
                <span className="text-xs md:text-sm drop-shadow-sm">{sportIcon}</span>
                <span className="text-xs md:text-xs text-orange-200 font-semibold tracking-wide drop-shadow-sm">{match.sport_type}</span>
              </div>
            </div>
          </div>

          {/* Header - Organizer Profile */}
          <div className="flex items-start justify-between mb-4">
            {match.organizer ? (
              <div className="flex items-center space-x-3">
                <div 
                  className="relative cursor-pointer hover:scale-105 transition-transform"
                  onClick={(e) => handleProfileClick(match.organizer_id, e)}
                  title={`View ${match.organizer.full_name || match.organizer.username}'s profile`}
                >
                  {match.organizer.avatar_url ? (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-orange to-primary-pink p-0.5 shadow-lg">
                      <LazyImage
                        src={match.organizer.avatar_url}
                        alt={match.organizer.full_name || match.organizer.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-orange to-primary-pink flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">
                        {(match.organizer.full_name || match.organizer.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <Crown size={12} className="text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <span 
                    className="text-xl font-bold text-white cursor-pointer hover:text-primary-orange transition-colors"
                    onClick={(e) => handleProfileClick(match.organizer_id, e)}
                  >
                    {match.organizer.full_name || match.organizer.username}
                  </span>
                  <p className="text-white/60">Match Organizer</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">?</span>
                </div>
                <div className="flex-1">
                  <span className="text-xl font-bold text-white">Unknown Organizer</span>
                  <p className="text-white/60">Match Organizer</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <WeatherIcon className="text-white/60" size={20} />
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.badge} flex items-center space-x-1`}>
                <statusConfig.icon size={12} />
                <span>{statusConfig.text}</span>
              </div>
            </div>
          </div>

          {/* Key Match Details - Moved up for better visibility */}
          <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-2">
            <div className="flex items-center text-white font-medium">
              <Calendar size={18} className="mr-3 text-primary-orange" />
              <span className="text-lg">{match.date} at {match.time}</span>
            </div>
            
            <div className="flex items-center text-white font-medium">
              <MapPin size={18} className="mr-3 text-secondary-cyan" />
              <span className="text-lg">{match.location.split(',')[0]}</span>
            </div>
            
            <div className="flex items-center text-white font-medium">
              <span className="text-xl mr-2">{sportIcon}</span>
              <span className="text-lg">{match.team_format} Format</span>
            </div>
            
            {/* Payment Status */}
            <div className="flex items-center text-white font-medium">
              <span className="text-xl mr-3">💰</span>
              <span className="text-lg text-green-400">
                {match.is_paid ? `${match.price_per_person} ${match.currency || 'MAD'} /U` : 'FREE'}
              </span>
            </div>
          </div>



          {/* Player Count Summary with Participants Preview */}
          <div className="bg-white/5 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Users className="text-white/60" size={18} />
                <span className="text-white/80 font-medium">Players</span>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold">{participantCount}/{match.max_players}</div>
                <div className="text-white/60 text-sm">
                  {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
                </div>
              </div>
            </div>
            
            {/* Participants Preview */}
            {match.participants && match.participants.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-white/60 text-sm">Joined:</span>
                  <div className="flex items-center space-x-1 flex-wrap">
                    {match.participants.slice(0, 6).map((participant, index) => {
                      // Determine slot colors based on user role
                      const isOrganizer = participant.user_id === match.organizer_id;
                      const isCurrentUser = participant.user_id === currentUser?.id;
                      
                      let slotColors;
                      if (isOrganizer) {
                        // Organizer slot - yellow (matching host button)
                        slotColors = {
                          bg: "bg-gradient-to-br from-yellow-400/30 to-yellow-500/30",
                          border: "border-yellow-400/50",
                          text: "text-yellow-100"
                        };
                      } else if (isCurrentUser) {
                        // Current user slot - green (matching participant button)
                        slotColors = {
                          bg: "bg-gradient-to-br from-green-500/30 to-green-600/30",
                          border: "border-green-400/50",
                          text: "text-green-100"
                        };
                      } else {
                        // Other users slot - blue
                        slotColors = {
                          bg: "bg-gradient-to-br from-blue-400/30 to-blue-500/30",
                          border: "border-blue-400/50",
                          text: "text-blue-100"
                        };
                      }

                      return (
                        <div
                          key={participant.id}
                          className="relative cursor-pointer hover:scale-110 transition-transform"
                          onClick={(e) => handleProfileClick(participant.user_id, e)}
                          title={(participant.profile?.full_name?.trim() && participant.profile.full_name.trim() !== '') ? 
                            participant.profile.full_name.trim() : 
                            participant.profile?.username || 'Unknown User'}
                          style={{ zIndex: match.participants!.length - index }}
                        >
                          {participant.profile?.avatar_url ? (
                            <div className={`w-8 h-8 rounded-full ${slotColors.bg} p-0.5 border-2 ${slotColors.border} shadow-sm`}>
                              <LazyImage
                                src={participant.profile.avatar_url}
                                alt={(participant.profile?.full_name?.trim() && participant.profile.full_name.trim() !== '') ? 
                                  participant.profile.full_name.trim() : 
                                  participant.profile?.username || 'User Avatar'}
                                className="w-full h-full rounded-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className={`w-8 h-8 rounded-full ${slotColors.bg} flex items-center justify-center border-2 ${slotColors.border} shadow-sm`}>
                              <span className={`${slotColors.text} font-bold text-xs`}>
                                {(participant.profile?.full_name?.trim() && participant.profile.full_name.trim() !== '') ? 
                                  participant.profile.full_name.trim().charAt(0).toUpperCase() : 
                                  participant.profile?.username?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          )}
                          {participant.is_ready && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full border border-white/20">
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Show empty slots for joining/inviting - show if spots are available */}
                    {spotsLeft > 0 && Array.from({ length: Math.min(spotsLeft, 6 - Math.min(match.participants.length, 6)) }, (_, index) => (
                      <div
                        key={`empty-slot-${index}`}
                        className="relative cursor-pointer hover:scale-110 transition-all duration-200 group"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isParticipant || isOrganizer) {
                            setShowInviteFriends(true);
                          } else {
                            onClick(); // Trigger the match detail modal which handles join logic
                          }
                        }}
                        onTouchEnd={(e) => {
                          // Handle touch end for mobile to ensure it works on touch devices
                          e.stopPropagation();
                          if (isParticipant || isOrganizer) {
                            setShowInviteFriends(true);
                          } else {
                            onClick(); // Trigger the match detail modal
                          }
                        }}
                        title={!currentUser ? "Click to join this match" : 
                               isParticipant || isOrganizer ? "Click to invite friends" :
                               "Click to join this match"}
                      >
                        <div className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center shadow-sm transition-all duration-200 ${
                          isParticipant || isOrganizer 
                            ? 'border-blue-400/40 group-hover:border-blue-400/80 group-hover:bg-blue-400/10' 
                            : 'border-white/30 group-hover:border-primary-orange/60 group-hover:bg-primary-orange/10'
                        }`}>
                          {isParticipant || isOrganizer ? (
                            <Send size={12} className="text-blue-400/60 group-hover:text-blue-400/90" />
                          ) : (
                            <UserPlus size={12} className="text-white/40 group-hover:text-primary-orange/80" />
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {match.participants.length > 6 && (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 shadow-sm">
                        <span className="text-white/80 font-bold text-xs">
                          +{match.participants.length - 6}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Team breakdown if participants exist */}
                {match.participants.length > 0 && (
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-white/60">
                        Team A: {match.participants.filter(p => p.team_side === 'A').length}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-white/60">
                        Team B: {match.participants.filter(p => p.team_side === 'B').length}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-3">
            
            {isOrganizer && (
              <>
                <button
                  className="px-4 py-2 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 text-yellow-200 font-medium rounded-lg border border-yellow-400/30 hover:bg-gradient-to-r hover:from-yellow-400/30 hover:to-yellow-500/30 transition-all duration-200 flex items-center space-x-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  <Crown size={16} />
                  <span>You're the Host</span>
                </button>
                {spotsLeft > 0 && (
                  <button
                    className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-200 font-medium rounded-lg border border-blue-400/30 hover:bg-gradient-to-r hover:from-blue-500/30 hover:to-blue-600/30 transition-all duration-200 flex items-center space-x-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInviteFriends(true);
                    }}
                  >
                    <Send size={16} />
                    <span>Invite Friends</span>
                  </button>
                )}
              </>
            )}
            
            {isParticipant && !isOrganizer && (
              <>
                <button
                  className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-200 font-medium rounded-lg border border-green-400/30 hover:bg-gradient-to-r hover:from-green-500/30 hover:to-green-600/30 transition-all duration-200 flex items-center space-x-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  <Users size={16} />
                  <span>You're a Participant</span>
                </button>
                {spotsLeft > 0 && (
                  <button
                    className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-200 font-medium rounded-lg border border-blue-400/30 hover:bg-gradient-to-r hover:from-blue-500/30 hover:to-blue-600/30 transition-all duration-200 flex items-center space-x-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInviteFriends(true);
                    }}
                  >
                    <Send size={16} />
                    <span>Invite Friends</span>
                  </button>
                )}
              </>
            )}
            
            {canJoin && (
              <button
                className="px-6 py-2 bg-gradient-to-r from-primary-orange to-primary-pink text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <UserPlus size={16} />
                <span>Join Match</span>
              </button>
            )}
            
            {!currentUser && spotsLeft > 0 && (
              <button
                className="px-6 py-2 bg-gradient-to-r from-primary-orange to-primary-pink text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <UserPlus size={16} />
                <span>Join Match</span>
              </button>
            )}
          </div>

          {/* Ready Check Indicator */}
          {match.ready_check_started && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-yellow-400">
              <Clock size={16} className="animate-pulse" />
              <span className="text-sm font-medium">Ready Check in Progress</span>
            </div>
          )}
        </div>
      </Card>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-dark border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Delete Match</h3>
                <p className="text-white/60 text-sm">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-white/80 mb-2">
                Are you sure you want to delete "{match.title}"?
              </p>
              <p className="text-white/60 text-sm">
                This will remove the match and all its data, including chat messages and participant information.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteMatch}
                loading={loading}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Match
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
    </div>
  );
});

export default EnhancedMatchCard; 