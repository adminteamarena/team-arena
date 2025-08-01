import React, { useState, useRef, useEffect, memo } from 'react';
import Skeleton from './SkeletonLoader';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string | React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  skeletonClassName?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
}

const LazyImage: React.FC<LazyImageProps> = memo(({ 
  src, 
  alt, 
  className = '', 
  placeholder,
  onLoad,
  onError,
  skeletonClassName = '',
  aspectRatio = 'auto'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    auto: ''
  };

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${aspectClasses[aspectRatio]} ${className}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0">
          {placeholder ? (
            <div className="w-full h-full flex items-center justify-center bg-white/10">
              {typeof placeholder === 'string' ? (
                <span className="text-white/60 font-medium">{placeholder}</span>
              ) : (
                placeholder
              )}
            </div>
          ) : (
            <Skeleton 
              variant="rectangular" 
              className={`w-full h-full ${skeletonClassName}`}
            />
          )}
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
          <svg 
            className="w-8 h-8 text-white/40" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>
      )}
      
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;