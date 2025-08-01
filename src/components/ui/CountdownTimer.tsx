import React from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  remainingSeconds: number;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  remainingSeconds, 
  className = '' 
}) => {
  // Format seconds into MM:SS format
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get color based on remaining time
  const getTimeColor = (seconds: number) => {
    if (seconds <= 0) return 'text-green-400';
    if (seconds <= 300) return 'text-red-400'; // Last 5 minutes - red
    if (seconds <= 900) return 'text-orange-400'; // Last 15 minutes - orange
    return 'text-orange-400/80'; // More than 15 minutes - muted orange
  };

  // Get animation class for urgency
  const getAnimationClass = (seconds: number) => {
    if (seconds <= 60) return 'animate-pulse'; // Last minute - pulse
    if (seconds <= 300) return 'animate-bounce'; // Last 5 minutes - subtle bounce
    return '';
  };

  if (remainingSeconds <= 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Clock 
        size={16} 
        className={`${getTimeColor(remainingSeconds)} ${getAnimationClass(remainingSeconds)}`} 
      />
      <span 
        className={`font-mono text-sm font-medium ${getTimeColor(remainingSeconds)} ${getAnimationClass(remainingSeconds)}`}
      >
        {formatTime(remainingSeconds)}
      </span>
      <span className="text-white/50 text-xs">
        until next post
      </span>
    </div>
  );
};