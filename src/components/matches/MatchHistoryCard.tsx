import React from 'react';
import { Calendar, Clock, MapPin, Users, Trophy, Crown, CheckCircle, XCircle, Clock3 } from 'lucide-react';
import Card from '../ui/Card';

interface MatchHistory {
  match_title: string;
  sport_type: string;
  team_format: string;
  final_status: string;
  match_date: string;
  match_time: string;
  location: string;
  user_role: 'organizer' | 'participant';
  team_side?: 'A' | 'B';
  position_number?: number;
  participant_count: number;
  organizer_name?: string;
  archived_at: string;
}

interface MatchHistoryCardProps {
  history: MatchHistory;
  className?: string;
}

const MatchHistoryCard: React.FC<MatchHistoryCardProps> = ({ 
  history, 
  className = '' 
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'expired':
        return <Clock3 className="w-5 h-5 text-yellow-500" />;
      default:
        return <Trophy className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'expired':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    // Convert time string to 12-hour format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <Card className={`p-4 hover:bg-white/5 transition-all duration-200 border-white/10 ${className}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">
              {history.match_title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-white/60 capitalize">
                {history.sport_type}
              </span>
              <span className="text-white/40">•</span>
              <span className="text-sm text-white/60">
                {history.team_format}
              </span>
            </div>
          </div>
          
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-sm font-medium ${getStatusColor(history.final_status)}`}>
            {getStatusIcon(history.final_status)}
            <span className="capitalize">{history.final_status}</span>
          </div>
        </div>

        {/* Match Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 text-white/70">
            <Calendar className="w-4 h-4 text-primary-orange" />
            <span className="text-sm">{formatDate(history.match_date)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-white/70">
            <Clock className="w-4 h-4 text-primary-orange" />
            <span className="text-sm">{formatTime(history.match_time)}</span>
          </div>
        </div>

        <div className="flex items-start space-x-2 text-white/70">
          <MapPin className="w-4 h-4 text-primary-orange mt-0.5 flex-shrink-0" />
          <span className="text-sm truncate">{history.location}</span>
        </div>

        {/* Role and Team Info */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center space-x-3">
            {history.user_role === 'organizer' ? (
              <div className="flex items-center space-x-2 text-primary-orange">
                <Crown className="w-4 h-4" />
                <span className="text-sm font-medium">Organizer</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-blue-400">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Team {history.team_side} - Position {history.position_number}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-white/60">
            <Users className="w-4 h-4" />
            <span className="text-sm">{history.participant_count} players</span>
          </div>
        </div>

        {/* Organizer Info (for participants) */}
        {history.user_role === 'participant' && history.organizer_name && (
          <div className="text-xs text-white/50">
            Organized by {history.organizer_name}
          </div>
        )}

        {/* Archived Date */}
        <div className="text-xs text-white/40">
          Archived {new Date(history.archived_at).toLocaleDateString()}
        </div>
      </div>
    </Card>
  );
};

export default MatchHistoryCard;