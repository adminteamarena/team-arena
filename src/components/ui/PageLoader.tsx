import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

interface PageLoaderProps {
  isLoading: boolean;
  text?: string;
  progress?: number;
}

const PageLoader: React.FC<PageLoaderProps> = ({ 
  isLoading, 
  text = 'Loading...', 
  progress 
}) => {
  const [visible, setVisible] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
    } else {
      // Delay hiding to prevent flashing
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => {
    if (progress !== undefined) {
      // Smooth progress animation
      const targetProgress = Math.min(Math.max(progress, 0), 100);
      const startProgress = displayProgress;
      const progressDiff = targetProgress - startProgress;
      const duration = 300;
      const startTime = Date.now();

      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progressRatio = Math.min(elapsed / duration, 1);
        
        const easedProgress = startProgress + (progressDiff * progressRatio);
        setDisplayProgress(easedProgress);

        if (progressRatio < 1) {
          requestAnimationFrame(animateProgress);
        }
      };

      requestAnimationFrame(animateProgress);
    }
  }, [progress, displayProgress]);

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 bg-background-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center transition-opacity duration-300 ${
      isLoading ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="text-center space-y-6">
        {/* Animated Logo */}
        <div className="relative">
          <div className="w-16 h-16 mx-auto">
            <Trophy className="w-full h-full text-primary-orange animate-bounce" />
          </div>
          
          {/* Rotating ring */}
          <div className="absolute inset-0 w-20 h-20 mx-auto -mt-2">
            <div className="w-full h-full border-4 border-primary-orange/20 rounded-full animate-spin">
              <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary-orange rounded-full transform -translate-x-1/2 -translate-y-1"></div>
            </div>
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <p className="text-white font-medium text-lg">{text}</p>
          
          {/* Progress bar */}
          {progress !== undefined && (
            <div className="w-48 mx-auto">
              <div className="flex justify-between text-sm text-white/60 mb-1">
                <span>Loading</span>
                <span>{Math.round(displayProgress)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-orange to-primary-pink rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TopProgressBar: React.FC<{ isLoading: boolean; progress?: number }> = ({ 
  isLoading, 
  progress = 0 
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99] h-1 bg-white/10">
      <div 
        className="h-full bg-gradient-to-r from-primary-orange to-primary-pink transition-all duration-300 ease-out"
        style={{ 
          width: isLoading ? `${Math.min(progress || 30, 90)}%` : '100%',
          transition: isLoading ? 'width 0.3s ease-out' : 'width 0.5s ease-out, opacity 0.5s ease-out 0.2s',
          opacity: isLoading ? 1 : 0
        }}
      />
    </div>
  );
};

export default PageLoader;