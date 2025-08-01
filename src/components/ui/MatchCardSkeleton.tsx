import React from 'react';
import Skeleton, { AvatarSkeleton, TextSkeleton, ButtonSkeleton } from './SkeletonLoader';

const MatchCardSkeleton: React.FC = () => {
  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header with sport icon and title */}
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex items-center space-x-3">
            <Skeleton variant="circular" className="w-8 h-8" />
            <TextSkeleton lines={1} className="flex-1" />
          </div>
          <TextSkeleton lines={1} className="w-3/4" />
        </div>
        <Skeleton variant="rounded" className="w-16 h-6" />
      </div>

      {/* Match details */}
      <div className="space-y-3">
        {/* Date and time */}
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" className="w-4 h-4" />
          <TextSkeleton lines={1} className="w-32" />
        </div>
        
        {/* Location */}
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" className="w-4 h-4" />
          <TextSkeleton lines={1} className="w-40" />
        </div>

        {/* Players */}
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" className="w-4 h-4" />
          <TextSkeleton lines={1} className="w-24" />
        </div>
      </div>

      {/* Organizer */}
      <div className="flex items-center space-x-3 pt-4 border-t border-white/10">
        <AvatarSkeleton size="sm" />
        <div className="space-y-1 flex-1">
          <TextSkeleton lines={1} className="w-24" />
          <TextSkeleton lines={1} className="w-16" />
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-3">
        <TextSkeleton lines={1} className="w-20" />
        <div className="flex items-center space-x-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <AvatarSkeleton key={index} size="sm" />
          ))}
          <Skeleton variant="circular" className="w-8 h-8" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4">
        <ButtonSkeleton width="80px" />
        <div className="flex space-x-2">
          <ButtonSkeleton width="60px" />
          <ButtonSkeleton width="60px" />
        </div>
      </div>
    </div>
  );
};

export default MatchCardSkeleton;