import React from 'react';
import Skeleton, { AvatarSkeleton, TextSkeleton } from './SkeletonLoader';

export const ChatMessageSkeleton: React.FC<{ isOwn?: boolean }> = ({ isOwn = false }) => {
  return (
    <div className={`flex items-start space-x-3 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
      {!isOwn && <AvatarSkeleton size="sm" />}
      <div className={`max-w-xs space-y-1 ${isOwn ? 'items-end' : ''}`}>
        {!isOwn && <TextSkeleton lines={1} className="w-16" />}
        <div className={`p-3 rounded-2xl ${isOwn ? 'bg-white/10' : 'bg-white/5'}`}>
          <TextSkeleton lines={Math.floor(Math.random() * 3) + 1} />
        </div>
      </div>
    </div>
  );
};

export const ChatHeaderSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/10">
      <div className="flex items-center space-x-3">
        <Skeleton variant="circular" className="w-6 h-6" />
        <TextSkeleton lines={1} className="w-32" />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton variant="circular" className="w-8 h-8" />
        <Skeleton variant="circular" className="w-8 h-8" />
      </div>
    </div>
  );
};

export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3">
          <AvatarSkeleton size="md" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <TextSkeleton lines={1} className="w-24" />
              <TextSkeleton lines={1} className="w-12" />
            </div>
            <TextSkeleton lines={1} className="w-40" />
          </div>
        </div>
      ))}
    </div>
  );
};

const ChatSkeleton: React.FC<{ 
  variant?: 'messages' | 'list' | 'header';
  count?: number;
}> = ({ 
  variant = 'messages',
  count = 8
}) => {
  if (variant === 'list') return <ChatListSkeleton count={count} />;
  if (variant === 'header') return <ChatHeaderSkeleton />;
  
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <ChatMessageSkeleton key={index} isOwn={index % 3 === 0} />
      ))}
    </div>
  );
};

export default ChatSkeleton;