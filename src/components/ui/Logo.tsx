import { FC } from 'react';
import { Trophy, Target, Zap } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

const Logo: FC<LogoProps> = ({
  size = 'md',
  showTagline = true
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Trophy className={`${iconSizes[size]} text-primary-orange`} />
          <Target className={`${iconSizes[size]} text-primary-pink absolute inset-0 animate-pulse`} />
          <Zap className={`${iconSizes[size]} text-secondary-cyan absolute inset-0 animate-bounce`} />
        </div>
        <span className={`font-bold ${sizeClasses[size]} bg-gradient-to-r from-primary-orange to-primary-pink bg-clip-text text-transparent`}>
          Team Arena
        </span>
      </div>
      {showTagline && (
        <p className="text-white/60 text-sm mt-1">Where Champions Connect</p>
      )}
    </div>
  );
};

export default Logo; 