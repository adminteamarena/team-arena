import React, { useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

// Import all the loading components
import LoadingSpinner from './LoadingSpinner';
import MatchCardSkeleton from './MatchCardSkeleton';
import ProfileSkeleton from './ProfileSkeleton';
import ChatSkeleton from './ChatSkeleton';
import LazyImage from './LazyImage';
import EnhancedAvatar from './EnhancedAvatar';
import Button from './Button';
import PageLoader from './PageLoader';
import { useLoading } from '../../context/LoadingContext';
import { useLoadingState } from '../../hooks/useLoadingState';

const LoadingDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('');
  const { showPageLoader, hidePageLoader, updateProgress } = useLoading();
  const buttonLoading = useLoadingState();

  const demos = [
    {
      id: 'spinner',
      name: 'Loading Spinner',
      component: <LoadingSpinner size="lg" text="Loading matches..." />
    },
    {
      id: 'match-skeleton',
      name: 'Match Card Skeleton',
      component: <MatchCardSkeleton />
    },
    {
      id: 'profile-skeleton',
      name: 'Profile Skeleton',
      component: <ProfileSkeleton />
    },
    {
      id: 'chat-skeleton',
      name: 'Chat List Skeleton',
      component: <ChatSkeleton variant="list" count={5} />
    },
    {
      id: 'avatar-loading',
      name: 'Avatar Loading',
      component: (
        <div className="flex space-x-4">
          <EnhancedAvatar loading alt="Loading User" size="sm" />
          <EnhancedAvatar loading alt="Loading User" size="md" />
          <EnhancedAvatar loading alt="Loading User" size="lg" />
        </div>
      )
    },
    {
      id: 'buttons',
      name: 'Button Loading States',
      component: (
        <div className="space-y-4">
          <Button loading loadingText="Joining match...">Join Match</Button>
          <Button variant="secondary" loading>Saving...</Button>
          <Button variant="outline" loading loadingText="Uploading...">Upload Image</Button>
        </div>
      )
    }
  ];

  const handlePageLoaderDemo = async () => {
    showPageLoader('Loading your dashboard...');
    
    // Simulate loading with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      updateProgress(i);
    }
    
    hidePageLoader();
  };

  const handleAsyncAction = async () => {
    await buttonLoading.execute(async () => {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 2000));
    });
  };

  return (
    <div className="space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Loading States Demo</h1>
        <p className="text-white/60">
          Comprehensive loading indicators and skeleton loaders for better UX
        </p>
      </div>

      {/* Global Loading Controls */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-xl font-semibold text-white">Global Loading Controls</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handlePageLoaderDemo} icon={<Play size={16} />}>
            Demo Page Loader
          </Button>
          <Button 
            onClick={handleAsyncAction}
            loading={buttonLoading.isLoading}
            loadingText="Processing..."
            variant="secondary"
          >
            Async Action Demo
          </Button>
        </div>
      </div>

      {/* Component Demos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {demos.map((demo) => (
          <div key={demo.id} className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{demo.name}</h3>
              <button
                onClick={() => setActiveDemo(activeDemo === demo.id ? '' : demo.id)}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                {activeDemo === demo.id ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
            
            {activeDemo === demo.id && (
              <div className="border border-white/10 rounded-lg p-4 bg-white/5">
                {demo.component}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Image Loading Demo */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Lazy Image Loading</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <LazyImage
              key={i}
              src={`https://picsum.photos/200/200?random=${i}`}
              alt={`Demo image ${i}`}
              className="rounded-lg"
              aspectRatio="square"
            />
          ))}
        </div>
      </div>

      {/* Usage Examples */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Usage Examples</h3>
        <div className="space-y-4 text-sm">
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Skeleton Loaders</h4>
            <code className="text-green-400 block">
              {`{loading ? <MatchCardSkeleton /> : <MatchCard />}`}
            </code>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Button Loading</h4>
            <code className="text-green-400 block">
              {`<Button loading={submitting} loadingText="Saving...">Save</Button>`}
            </code>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Global Page Loading</h4>
            <code className="text-green-400 block">
              {`const { showPageLoader, hidePageLoader } = useLoading();`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingDemo;