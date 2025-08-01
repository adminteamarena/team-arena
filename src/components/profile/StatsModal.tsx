import React, { useState } from 'react';
import { X, TrendingUp, Trophy, Calendar, Target, ChevronDown, ChevronUp } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

// Mock data for sports statistics
const sportsStats = [
  { sport: 'Football', matches: 23, icon: '⚽', color: 'from-green-500 to-green-600' },
  { sport: 'Tennis', matches: 2, icon: '🎾', color: 'from-yellow-400 to-yellow-500' },
  { sport: 'Basketball', matches: 5, icon: '🏀', color: 'from-orange-500 to-orange-600' },
  { sport: 'Volleyball', matches: 1, icon: '🏐', color: 'from-blue-500 to-blue-600' },
  { sport: 'Footing', matches: 3, icon: '🏃', color: 'from-purple-500 to-purple-600' },
  { sport: 'Padel', matches: 1, icon: '🏓', color: 'from-pink-500 to-pink-600' }
];

// Mock data for weekly evolution (last 8 weeks)
const weeklyData = [
  { week: 'W1', matches: 2 },
  { week: 'W2', matches: 4 },
  { week: 'W3', matches: 3 },
  { week: 'W4', matches: 6 },
  { week: 'W5', matches: 5 },
  { week: 'W6', matches: 8 },
  { week: 'W7', matches: 4 },
  { week: 'W8', matches: 7 }
];

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, username }) => {
  const [showSportsBreakdown, setShowSportsBreakdown] = useState(false);
  
  if (!isOpen) return null;

  const totalMatches = sportsStats.reduce((sum, stat) => sum + stat.matches, 0);
  const maxWeeklyMatches = Math.max(...weeklyData.map(d => d.matches));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background-dark border border-white/20 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto">
        <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-primary-orange to-primary-red rounded-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Stats Overview</h2>
              <p className="text-sm text-white/60">@{username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-white/60" />
          </button>
        </div>

        {/* Total Matches Card */}
        <button
          onClick={() => setShowSportsBreakdown(!showSportsBreakdown)}
          className="w-full bg-gradient-to-r from-primary-orange/20 to-primary-red/20 border border-primary-orange/30 rounded-xl p-4 mb-4 hover:from-primary-orange/30 hover:to-primary-red/30 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm text-white/80">Total Matches</p>
              <p className="text-2xl font-bold text-white">{totalMatches}</p>
              <p className="text-xs text-white/60 mt-1">
                {showSportsBreakdown ? 'Click to hide breakdown' : 'Click to see breakdown'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-3 bg-white/10 rounded-full">
                <Target className="h-6 w-6 text-primary-orange" />
              </div>
              {showSportsBreakdown ? (
                <ChevronUp className="h-5 w-5 text-white/60" />
              ) : (
                <ChevronDown className="h-5 w-5 text-white/60" />
              )}
            </div>
          </div>
        </button>

                {/* Sports Statistics */}
        {showSportsBreakdown && (
          <div className="mb-4 animate-in slide-in-from-top-2 duration-300">
            <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center space-x-2">
              <Trophy className="h-4 w-4" />
              <span>Matches by Sport</span>
            </h3>
            <div className="space-y-3">
              {sportsStats.map((stat, index) => {
                const percentage = Math.round((stat.matches / totalMatches) * 100);
                return (
                  <div key={index} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{stat.icon}</span>
                        <span className="text-sm font-medium text-white">{stat.sport}</span>
                      </div>
                      <span className="text-sm font-bold text-white">{stat.matches}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${stat.color} transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-white/70 text-center">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Evolution Chart */}
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Weekly Evolution</span>
          </h3>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-end justify-between h-24 space-x-2">
              {weeklyData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center justify-end h-16">
                    <span className="text-xs text-white/80 mb-1">{data.matches}</span>
                    <div
                      className="w-full bg-gradient-to-t from-primary-orange to-primary-red rounded-t-sm transition-all duration-1000 ease-out"
                      style={{ 
                        height: `${(data.matches / maxWeeklyMatches) * 100}%`,
                        minHeight: '4px'
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/60 mt-2">{data.week}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white/90 mb-3 flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>This Week</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-primary-orange">{weeklyData[weeklyData.length - 1].matches}</p>
              <p className="text-xs text-white/60">Matches Played</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">+{weeklyData[weeklyData.length - 1].matches - weeklyData[weeklyData.length - 2].matches}</p>
              <p className="text-xs text-white/60">vs Last Week</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default StatsModal; 