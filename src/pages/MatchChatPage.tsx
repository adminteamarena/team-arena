import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Trophy, Calendar, MapPin, Crown, MessageSquare } from 'lucide-react';
import { auth, matches, Match, chat } from '../lib/supabase';
import MatchChat from '../components/matches/MatchChat';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const MatchChatPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mobile viewport fix for match chat page
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
    
    const cleanup = () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };

    const loadData = async () => {
      try {
        // Get current user
        const { user } = await auth.getCurrentUser();
        setCurrentUser(user);

        // Get match details
        if (matchId) {
          const { data: matchData, error: matchError } = await matches.getMatch(matchId);
          if (matchError) {
            setError('Failed to load match details');
            console.error('Error loading match:', matchError);
          } else {
            setMatch(matchData);
            // Mark match chat as read when user visits the page
            if (user?.id) {
              await chat.markMatchChatAsRead(matchId, user.id);
            }
          }
        }
      } catch (err) {
        setError('Failed to load match data');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    return cleanup;
  }, [matchId]);

  // Check if user is a participant in the match
  const isParticipant = match?.participants?.some(p => p.user_id === currentUser?.id) || match?.organizer_id === currentUser?.id;

  // Mark match chat as read when user views it
  useEffect(() => {
    if (matchId && currentUser?.id && isParticipant) {
      chat.markMatchChatAsRead(matchId, currentUser.id);
    }
  }, [matchId, currentUser?.id, isParticipant]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading match..." />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <Trophy className="mx-auto text-white/40 mb-4" size={48} />
          <h2 className="text-white text-xl font-semibold mb-2">
            {error || 'Match not found'}
          </h2>
          <p className="text-white/60 mb-4">
            This match may have been deleted or you don't have access to it.
          </p>
          <button
            onClick={() => navigate('/matches')}
            className="px-6 py-3 bg-gradient-to-r from-primary-orange to-primary-pink text-white font-semibold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  if (!isParticipant) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto text-white/40 mb-4" size={48} />
          <h2 className="text-white text-xl font-semibold mb-2">
            Access Restricted
          </h2>
          <p className="text-white/60 mb-4">
            You can only view chat messages for matches you're participating in.
          </p>
          <button
            onClick={() => navigate('/matches')}
            className="px-6 py-3 bg-gradient-to-r from-primary-orange to-primary-pink text-white font-semibold rounded-xl hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-500/20 text-green-400';
      case 'upcoming':
        return 'bg-blue-500/20 text-blue-400';
      case 'completed':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-red-500/20 text-red-400';
    }
  };

  return (
    <div className="h-screen bg-background-dark flex flex-col overflow-hidden">
      {/* Fixed Header Block */}
      <div className="flex-shrink-0 bg-white/5 backdrop-blur-sm">
        {/* Navigation Header */}
        <div className="border-b border-white/10">
          <div className="px-2 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/messages?tab=matches')}
                className="flex items-center space-x-1 px-2 py-1 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
              >
                <ArrowLeft size={16} />
                <span className="text-sm hidden sm:inline">Back to Messages</span>
                <span className="text-sm sm:hidden">Back</span>
              </button>
              
              <div className="flex items-center space-x-2">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                  {match.status}
                </div>
                <button
                  onClick={() => navigate(`/matches?match=${matchId}`)}
                  className="flex items-center space-x-1 px-2 py-1 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                >
                  <Trophy size={14} />
                  <span className="text-sm">View Match</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Match Info */}
        <div className="border-b border-white/10">
          <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1 min-w-0">
                <h1 className="text-sm sm:text-2xl font-bold text-white mb-1 sm:mb-2 truncate">{match.title}</h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/60 text-xs sm:text-sm">
                  <div className="flex items-center space-x-1">
                    <Calendar size={12} className="sm:w-4 sm:h-4" />
                    <span className="truncate">{formatDate(match.date)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>{formatTime(match.time)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin size={12} className="sm:w-4 sm:h-4" />
                    <span className="truncate">{match.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users size={12} className="sm:w-4 sm:h-4" />
                    <span>{match.participant_count || 0}/{match.max_players}</span>
                  </div>
                </div>
              </div>
              
              {/* Organizer Info */}
              {match.organizer && (
                <div className="flex items-center space-x-2 text-white/60 text-xs sm:text-sm">
                  <Crown size={12} className="text-primary-orange sm:w-4 sm:h-4" />
                  <span className="truncate">
                    Organized by {match.organizer.full_name || match.organizer.username || 'Unknown'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team Chat Header */}
        <div className="border-b border-white/10">
          <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-primary-orange to-primary-pink flex items-center justify-center shadow-lg">
                  <MessageSquare size={14} className="text-white sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-xl font-bold text-white">Team Chat</h3>
                  <div className="text-white/60 text-xs sm:text-sm flex items-center space-x-2">
                    <Users size={10} className="sm:w-3.5 sm:h-3.5" />
                    <span>{match.participants?.length || 0} members</span>
                    <span className="mx-1">•</span>
                    <span className="flex items-center space-x-1 text-green-400">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Online</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Chat Component - Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MatchChat
          matchId={matchId!}
          currentUser={currentUser}
          participants={match.participants || []}
          hideHeader={true}
        />
      </div>
    </div>
  );
};

export default MatchChatPage; 