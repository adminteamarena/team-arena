import React, { useState } from 'react';
import { Heart, MessageCircle, Share, Bookmark, MapPin, MoreHorizontal } from 'lucide-react';
import { Post } from '../../data/mockInstagramData';
import Card from '../ui/Card';

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment, onShare }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    onLike?.(post.id);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % post.images.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + post.images.length) % post.images.length);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  return (
    <Card className="p-0 overflow-hidden">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <img
            src={post.user_avatar}
            alt={post.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <div className="flex items-center space-x-2">
              <p className="font-semibold text-white">{post.username}</p>
              {post.sport && (
                <span className="text-xs bg-primary-orange/20 text-primary-orange px-2 py-1 rounded-full">
                  {post.sport}
                </span>
              )}
            </div>
            {post.location && (
              <div className="flex items-center space-x-1 text-xs text-white/60">
                <MapPin size={12} />
                <span>{post.location}</span>
              </div>
            )}
          </div>
        </div>
        <button className="text-white/60 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Post Images */}
      <div className="relative">
        <div className="aspect-square overflow-hidden">
          <img
            src={post.images[currentImageIndex]}
            alt={`Post by ${post.username}`}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Image Navigation */}
        {post.images.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 rounded-full p-2 text-white hover:bg-black/70 transition-colors"
            >
              <div className="w-4 h-4 border-l-2 border-t-2 border-white transform rotate-[-45deg]"></div>
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 rounded-full p-2 text-white hover:bg-black/70 transition-colors"
            >
              <div className="w-4 h-4 border-r-2 border-t-2 border-white transform rotate-[45deg]"></div>
            </button>
            
            {/* Image Indicators */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {post.images.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Post Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              className={`transition-colors ${isLiked ? 'text-red-500' : 'text-white/60 hover:text-white'}`}
            >
              <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => onComment?.(post.id)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <MessageCircle size={24} />
            </button>
            <button
              onClick={() => onShare?.(post.id)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <Share size={24} />
            </button>
          </div>
          <button className="text-white/60 hover:text-white transition-colors">
            <Bookmark size={24} />
          </button>
        </div>

        {/* Likes Count */}
        <div className="mb-2">
          <p className="text-white font-semibold text-sm">
            {likesCount.toLocaleString()} likes
          </p>
        </div>

        {/* Caption */}
        <div className="mb-2">
          <p className="text-white text-sm">
            <span className="font-semibold mr-2">{post.username}</span>
            {post.caption}
          </p>
        </div>

        {/* Comments Count */}
        {post.comments_count > 0 && (
          <button
            onClick={() => onComment?.(post.id)}
            className="text-white/60 hover:text-white transition-colors text-sm mb-2"
          >
            View all {post.comments_count} comments
          </button>
        )}

        {/* Time Ago */}
        <p className="text-white/40 text-xs">
          {formatTimeAgo(post.created_at)}
        </p>
      </div>
    </Card>
  );
};

export default PostCard; 