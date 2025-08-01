import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Highlight } from '../../data/mockInstagramData';
import StoryViewer from './StoryViewer';

interface HighlightsRowProps {
  highlights: Highlight[];
  onAddHighlight?: () => void;
  canAddHighlight?: boolean;
}

const HighlightsRow: React.FC<HighlightsRowProps> = ({ highlights, onAddHighlight, canAddHighlight = false }) => {
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const handleHighlightClick = (highlight: Highlight) => {
    setSelectedHighlight(highlight);
    setCurrentStoryIndex(0);
    setShowStoryViewer(true);
  };

  const handleCloseStoryViewer = () => {
    setShowStoryViewer(false);
    setSelectedHighlight(null);
    setCurrentStoryIndex(0);
  };

  const handleStoryChange = (index: number) => {
    setCurrentStoryIndex(index);
  };

  return (
    <>
      <div className="flex flex-col space-y-6">
        <h3 className="text-lg font-semibold text-white">Highlights</h3>
        
        <div className="flex flex-wrap gap-6">
          {/* Add Highlight Button */}
          {canAddHighlight && (
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={onAddHighlight}
                className="w-20 h-20 rounded-full bg-background-card border-2 border-dashed border-white/30 flex items-center justify-center hover:border-primary-orange transition-colors hover:scale-105 duration-200"
              >
                <Plus size={24} className="text-white/60" />
              </button>
              <p className="text-xs text-white/60 text-center w-20 truncate font-medium">
                New
              </p>
            </div>
          )}

          {/* Highlights */}
          {highlights.map((highlight) => (
            <div key={highlight.id} className="flex flex-col items-center space-y-2">
              <button
                onClick={() => handleHighlightClick(highlight)}
                className="relative w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-white/20 to-white/10 hover:from-primary-orange hover:to-primary-pink transition-all duration-300 hover:scale-105 group"
              >
                <div className="w-full h-full rounded-full bg-background-dark p-1">
                  <img
                    src={highlight.cover_image}
                    alt={highlight.title}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                
                {/* Hover overlay */}
                <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{highlight.stories.length}</span>
                  </div>
                </div>
              </button>
              
              <p className="text-xs text-white/80 text-center w-20 truncate font-medium">
                {highlight.title}
              </p>
            </div>
          ))}
        </div>

        {/* Empty state message */}
        {highlights.length === 0 && !canAddHighlight && (
          <div className="text-center py-8">
            <p className="text-white/60">No highlights yet</p>
          </div>
        )}
      </div>

      {/* Story Viewer Modal */}
      {showStoryViewer && selectedHighlight && (
        <StoryViewer
          stories={selectedHighlight.stories}
          currentStoryIndex={currentStoryIndex}
          onClose={handleCloseStoryViewer}
          onStoryChange={handleStoryChange}
        />
      )}
    </>
  );
};

export default HighlightsRow; 