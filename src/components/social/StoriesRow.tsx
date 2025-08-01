import React from 'react';
import { Plus } from 'lucide-react';
import { Story } from '../../data/mockInstagramData';

interface StoriesRowProps {
  stories: Story[];
  onAddStory?: () => void;
  canAddStory?: boolean;
}

const StoriesRow: React.FC<StoriesRowProps> = ({ stories, onAddStory, canAddStory = false }) => {
  const handleStoryClick = (story: Story) => {
    // TODO: Implement story viewer
    console.log('View story:', story.id);
  };

  return (
    <div className="flex space-x-4 p-4 overflow-x-auto">
      {/* Add Story Button */}
      {canAddStory && (
        <div className="flex-shrink-0 text-center">
          <button
            onClick={onAddStory}
            className="w-16 h-16 rounded-full bg-background-card border-2 border-dashed border-white/30 flex items-center justify-center hover:border-primary-orange transition-colors"
          >
            <Plus size={20} className="text-white/60" />
          </button>
          <p className="text-xs text-white/60 mt-1">Add Story</p>
        </div>
      )}

      {/* Stories */}
      {stories.map((story) => (
        <div key={story.id} className="flex-shrink-0 text-center">
          <button
            onClick={() => handleStoryClick(story)}
            className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-primary-orange to-primary-pink hover:from-primary-pink hover:to-secondary-purple transition-all duration-300"
          >
            <div className="w-full h-full rounded-full bg-background-dark p-0.5">
              <img
                src={story.image_url}
                alt={`Story by user ${story.user_id}`}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            
            {/* Viewed indicator */}
            {story.viewed && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/60"></div>
              </div>
            )}
          </button>
          <p className="text-xs text-white/60 mt-1 truncate">
            {new Date(story.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default StoriesRow; 