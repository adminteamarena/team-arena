import { FC } from 'react';
import { Trophy } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = 'md',
  text = 'Loading...'
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <Trophy className="w-full h-full text-primary-orange" />
      </div>
      {text && (
        <p className="text-white/80 text-sm font-medium">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner; 