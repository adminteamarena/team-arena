import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Story } from '../../data/mockInstagramData';

interface StoryViewerProps {
  stories: Story[];
  currentStoryIndex: number;
  onClose: () => void;
  onStoryChange: (index: number) => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ 
  stories, 
  currentStoryIndex, 
  onClose, 
  onStoryChange 
}) => {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const STORY_DURATION = 5000; // 5 seconds per story

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (STORY_DURATION / 100));
        if (newProgress >= 100) {
          // Story finished, go to next
          handleNextStory();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStoryIndex, isPlaying]);

  useEffect(() => {
    setProgress(0);
  }, [currentStoryIndex]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      onStoryChange(currentStoryIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      onStoryChange(currentStoryIndex - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      handlePrevStory();
    } else if (e.key === 'ArrowRight') {
      handleNextStory();
    } else if (e.key === ' ') {
      e.preventDefault();
      setIsPlaying(!isPlaying);
    }
  };

  const currentStory = stories[currentStoryIndex];

  return (
    <div 
      className="fixed inset-0 bg-black z-[70] flex items-center justify-center"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 z-10 flex space-x-1">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ 
                width: index < currentStoryIndex ? '100%' : 
                       index === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
      >
        <X size={20} className="text-white" />
      </button>

      {/* Navigation areas */}
      <div className="absolute inset-0 flex">
        {/* Left side - previous story */}
        <div 
          className="w-1/3 h-full cursor-pointer"
          onClick={handlePrevStory}
        />
        
        {/* Middle - pause/play */}
        <div 
          className="w-1/3 h-full cursor-pointer"
          onClick={() => setIsPlaying(!isPlaying)}
        />
        
        {/* Right side - next story */}
        <div 
          className="w-1/3 h-full cursor-pointer"
          onClick={handleNextStory}
        />
      </div>

      {/* Story content */}
      <div className="relative max-w-md w-full h-full md:h-auto md:max-h-[90vh] md:aspect-[9/16] bg-black md:rounded-lg overflow-hidden">
        <img
          src={currentStory.image_url}
          alt={`Story ${currentStoryIndex + 1}`}
          className="w-full h-full object-cover"
        />
        
        {/* Story info */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">{currentStoryIndex + 1}</span>
            </div>
            <span className="text-sm opacity-80">
              {new Date(currentStory.created_at).toLocaleDateString()}
            </span>
          </div>
          
          {!isPlaying && (
            <div className="text-center">
              <p className="text-sm opacity-80">Paused</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop navigation arrows */}
      <div className="hidden md:flex">
        <button
          onClick={handlePrevStory}
          disabled={currentStoryIndex === 0}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors disabled:opacity-50"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
        
        <button
          onClick={handleNextStory}
          disabled={currentStoryIndex === stories.length - 1}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors disabled:opacity-50"
        >
          <ChevronRight size={24} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default StoryViewer; 