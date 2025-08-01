import React from 'react';
import Skeleton, { AvatarSkeleton, TextSkeleton, ButtonSkeleton, ImageSkeleton } from './SkeletonLoader';

export const ProfileHeaderSkeleton: React.FC = () => {
  return (
    <div className="glass-card p-6 space-y-6">
      {/* Profile header */}
      <div className="flex items-start space-x-4">
        <AvatarSkeleton size="lg" />
        <div className="flex-1 space-y-3">
          <TextSkeleton lines={1} className="w-32" />
          <TextSkeleton lines={1} className="w-24" />
          <TextSkeleton lines={2} className="w-full" />
        </div>
        <ButtonSkeleton width="100px" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="text-center space-y-2">
            <TextSkeleton lines={1} className="w-8 mx-auto" />
            <TextSkeleton lines={1} className="w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProfilePostsSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <ImageSkeleton key={index} aspectRatio="square" />
      ))}
    </div>
  );
};

export const ProfileTabsSkeleton: React.FC = () => {
  return (
    <div className="flex space-x-4 border-b border-white/10">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="pb-4">
          <TextSkeleton lines={1} className="w-16" />
        </div>
      ))}
    </div>
  );
};

const ProfileSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <ProfileHeaderSkeleton />
      <ProfileTabsSkeleton />
      <ProfilePostsSkeleton />
    </div>
  );
};

export default ProfileSkeleton;