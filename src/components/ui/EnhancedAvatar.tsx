import React, { memo } from 'react';
import LazyImage from './LazyImage';
import { AvatarSkeleton } from './SkeletonLoader';

interface EnhancedAvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fallbackText?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  loading?: boolean;
}

const EnhancedAvatar: React.FC<EnhancedAvatarProps> = memo(({
  src,
  alt,
  size = 'md',
  className = '',
  fallbackText,
  showOnlineStatus = false,
  isOnline = false,
  loading = false
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg'
  };

  const statusSizeClasses = {
    sm: 'w-2 h-2 -bottom-0 -right-0',
    md: 'w-3 h-3 -bottom-0.5 -right-0.5',
    lg: 'w-4 h-4 -bottom-0.5 -right-0.5'
  };

  if (loading) {
    return (
      <div className="relative">
        <AvatarSkeleton size={size} className={className} />
        {showOnlineStatus && (
          <div className={`absolute rounded-full bg-white/10 ${statusSizeClasses[size]}`} />
        )}
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
        {src ? (
          <LazyImage
            src={src}
            alt={alt}
            className="rounded-full"
            placeholder={fallbackText ? getInitials(fallbackText) : alt.charAt(0).toUpperCase()}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-orange to-primary-pink flex items-center justify-center text-white font-medium">
            {fallbackText ? getInitials(fallbackText) : alt.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      {showOnlineStatus && (
        <div 
          className={`absolute rounded-full border-2 border-background-dark ${statusSizeClasses[size]} ${
            isOnline ? 'bg-green-400' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  );
});

EnhancedAvatar.displayName = 'EnhancedAvatar';

export default EnhancedAvatar;