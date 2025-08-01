import React, { useState, useEffect } from 'react';
import { Clock, Check, X, Users } from 'lucide-react';
import { Match } from '../../lib/supabase';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface ReadyCheckProps {
  match: Match;
  currentUser: any;
  onReadyStatusChange: (isReady: boolean) => void;
}

const ReadyCheck: React.FC<ReadyCheckProps> = ({ match, currentUser, onReadyStatusChange }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);

  const currentUserParticipant = match.participants?.find(p => p.user_id === currentUser?.id);
  const readyParticipants = match.participants?.filter(p => p.is_ready) || [];
  const totalParticipants = match.participants?.length || 0;

  useEffect(() => {
    if (currentUserParticipant) {
      setIsReady(currentUserParticipant.is_ready);
    }
  }, [currentUserParticipant]);

  useEffect(() => {
    if (!match.ready_check_deadline) return;

    const updateTimeLeft = () => {
      const deadline = new Date(match.ready_check_deadline!);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft(0);
        return;
      }
      
      setTimeLeft(Math.floor(diff / 1000));
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [match.ready_check_deadline]);

  const handleReadyToggle = () => {
    const newReadyStatus = !isReady;
    setIsReady(newReadyStatus);
    onReadyStatusChange(newReadyStatus);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getReadyPercentage = () => {
    if (totalParticipants === 0) return 0;
    return (readyParticipants.length / totalParticipants) * 100;
  };

  if (!match.ready_check_started) return null;

  return (
    <Card className="border-2 border-yellow-500/30 bg-yellow-500/10">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Clock className="text-yellow-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Ready Check</h3>
              <p className="text-white/60">Confirm you're ready to start</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {timeLeft > 0 ? formatTime(timeLeft) : 'TIME UP'}
            </div>
            <p className="text-white/60 text-sm">Time remaining</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/60">Players Ready</span>
            <span className="text-white font-semibold">
              {readyParticipants.length}/{totalParticipants}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div 
              className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${getReadyPercentage()}%` }}
            />
          </div>
        </div>

        {/* Ready Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {match.participants?.map((participant) => (
            <div
              key={participant.id}
              className={`flex items-center space-x-2 p-2 rounded-lg ${
                participant.is_ready 
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : 'bg-white/10 border border-white/20'
              }`}
            >
              {participant.profile?.avatar_url ? (
                <img
                  src={participant.profile.avatar_url}
                  alt={participant.profile.full_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Users size={16} className="text-white/60" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">
                  {participant.profile?.full_name || 'Unknown'}
                </p>
              </div>
              <div className="flex-shrink-0">
                {participant.is_ready ? (
                  <Check className="text-green-400" size={16} />
                ) : (
                  <X className="text-white/40" size={16} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Ready Button */}
        {currentUserParticipant && timeLeft > 0 && (
          <div className="flex justify-center">
            <Button
              onClick={handleReadyToggle}
              className={`px-8 py-3 ${
                isReady 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-primary-orange hover:bg-primary-pink'
              }`}
            >
              {isReady ? (
                <>
                  <Check size={20} className="mr-2" />
                  Ready!
                </>
              ) : (
                <>
                  <Clock size={20} className="mr-2" />
                  Mark as Ready
                </>
              )}
            </Button>
          </div>
        )}

        {/* Match Status */}
        {timeLeft === 0 && (
          <div className="text-center">
            {readyParticipants.length === totalParticipants ? (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <Check className="text-green-400 mx-auto mb-2" size={32} />
                <p className="text-green-400 font-semibold">All players are ready!</p>
                <p className="text-white/60 text-sm">Match will start shortly</p>
              </div>
            ) : (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <X className="text-red-400 mx-auto mb-2" size={32} />
                <p className="text-red-400 font-semibold">Time expired</p>
                <p className="text-white/60 text-sm">
                  {totalParticipants - readyParticipants.length} players were not ready
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ReadyCheck; 