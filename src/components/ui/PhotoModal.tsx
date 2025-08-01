import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Zap, MessageCircle, Share2, Trash2 } from 'lucide-react';
import LazyImage from './LazyImage';
import EnhancedAvatar from './EnhancedAvatar';
import { useUI } from '../../context/UIContext';

interface Photo {
  id: string;
  image_url: string;
  caption?: string;
  created_at: string;
}

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  currentIndex: number;
  username: string;
  userAvatar?: string;
  isOwnProfile?: boolean;
  onDelete?: (photoId: string) => Promise<void>;
}

const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  photos,
  currentIndex,
  username,
  userAvatar,
  isOwnProfile = false,
  onDelete
}) => {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { hideHeader, showHeader } = useUI();

  useEffect(() => {
    if (!isOpen) {
      showHeader(); // Show header when modal closes
      return;
    }

    hideHeader(); // Hide header when modal opens

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Scroll to the current photo when modal opens
    setTimeout(() => {
      const currentPhotoElement = document.getElementById(`photo-${currentIndex}`);
      if (currentPhotoElement) {
        currentPhotoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      showHeader(); // Always show header when component unmounts
    };
  }, [isOpen, currentIndex, onClose, hideHeader, showHeader]);

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set([...Array.from(prev), index]));
  };

  const handleDownload = async (photo: Photo) => {
    try {
      const response = await fetch(photo.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${username}_photo_${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!onDelete) return;
    
    try {
      setDeleting(photoId);
      await onDelete(photoId);
      
      // Close modal after successful deletion
      setShowDeleteConfirm(null);
      onClose();
    } catch (error) {
      console.error('Error deleting photo:', error);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (!isOpen || photos.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-background-dark z-[100]">
      {/* Simple header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background-dark/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => {
              console.log('Back button clicked!');
              onClose();
            }}
            onTouchStart={(e) => {
              console.log('Back button touch start!');
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onTouchEnd={(e) => {
              console.log('Back button touch end!');
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              onClose();
            }}
            className="p-2 text-white/60 hover:text-white transition-all duration-200 hover:scale-105 rounded-full"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            <ArrowLeft size={20} className="pointer-events-none" />
          </button>
          
          <h1 className="text-white font-semibold text-base">{username}</h1>
          
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Scrollable feed container */}
      <div className="h-full overflow-y-auto scrollbar-hide">
        <div className="max-w-2xl mx-auto md:px-4 pt-12 pb-8 space-y-8">
          
          {photos.map((photo, index) => (
            <div 
              key={photo.id} 
              id={`photo-${index}`}
              className="space-y-2"
            >
              {/* User Profile Info Container */}
              <div className="bg-transparent px-4 md:px-0 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                  <EnhancedAvatar
                    src={userAvatar}
                    alt={username}
                    size="md"
                    fallbackText={username}
                  />
                  <div>
                    <h3 className="text-white font-semibold">{username}</h3>
                    <p className="text-white/60 text-sm">{formatDate(photo.created_at)}</p>
                  </div>
                  </div>
                  
                  {photos.length > 1 && (
                    <div className="text-white/60 text-sm">
                      {index + 1} / {photos.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Image Container */}
              <div className="bg-black overflow-hidden md:rounded-xl">
                <div className="relative bg-black">
                  <LazyImage
                    src={photo.image_url}
                    alt={photo.caption || `Photo by ${username}`}
                    className="w-screen md:w-full max-h-[70vh] object-cover"
                    onLoad={() => handleImageLoad(index)}
                  />
                
                {/* Loading state */}
                {!loadedImages.has(index) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                </div>
              </div>

              {/* Interaction Icons Container */}
              <div className="bg-transparent px-4 md:px-0 py-2 space-y-4">
                {/* Action buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <button className="flex items-center space-x-2 text-white/70 hover:text-primary-orange transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-primary-orange/10 transition-colors">
                        <Zap size={22} className="fill-current" />
                      </div>
                      <span className="text-sm font-medium">0</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 text-white/70 hover:text-blue-400 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-blue-400/10 transition-colors">
                        <MessageCircle size={22} />
                      </div>
                      <span className="text-sm font-medium">0</span>
                    </button>
                    
                    <button className="flex items-center space-x-2 text-white/70 hover:text-green-400 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-green-400/10 transition-colors">
                        <Share2 size={22} />
                      </div>
                    </button>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleDownload(photo)}
                      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                      title="Download image"
                    >
                      <Download size={20} />
                    </button>
                    
                    {isOwnProfile && onDelete && (
                      <button 
                        onClick={() => setShowDeleteConfirm(photo.id)}
                        className="p-2 text-white/60 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                        title="Delete photo"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Caption */}
                {photo.caption && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white leading-relaxed text-sm">{photo.caption}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30">
          <div className="bg-background-dark border border-white/10 rounded-xl p-6 max-w-sm mx-4">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto">
                <Trash2 size={24} className="text-red-400" />
              </div>
              
              <div>
                <h3 className="text-white font-semibold mb-2">Delete Photo?</h3>
                <p className="text-white/60 text-sm">
                  This action cannot be undone. Your photo will be permanently deleted.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deleting !== null}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deleting !== null}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {deleting === showDeleteConfirm ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoModal;