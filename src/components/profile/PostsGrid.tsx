import React, { useState, useEffect } from 'react';
import { Camera, Plus, Heart, MessageCircle, Trash2, X, Grid3X3, Image, Video, Tag } from 'lucide-react';
import { posts, UserPost, auth } from '../../lib/supabase';
import ImageCropper, { AspectRatio } from '../ui/ImageCropper';
import SimpleFilePicker from '../ui/SimpleFilePicker';
import PhotoModal from '../ui/PhotoModal';

interface PostsGridProps {
  userId: string;
  isOwnProfile: boolean;
  username?: string;
  userAvatar?: string;
}

const PostsGrid: React.FC<PostsGridProps> = ({ userId, isOwnProfile, username, userAvatar }) => {
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'shots' | 'tagged'>('posts');
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Load posts when component mounts or userId changes
  useEffect(() => {
    loadPosts();
    loadCurrentUser();
  }, [userId]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showUploadModal || showDeleteConfirm || showCropper || showFilePicker || showFullscreen) {
      // Disable body scroll
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollBarWidth}px`;
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.documentElement.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.documentElement.style.overflow = '';
    };
  }, [showUploadModal, showDeleteConfirm, showCropper, showFilePicker, showFullscreen]);

  const loadCurrentUser = async () => {
    const { user } = await auth.getCurrentUser();
    setCurrentUser(user);
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await posts.getUserPosts(userId);
      
      if (error) {
        console.error('Error loading posts:', error);
        setUserPosts([]);
      } else {
        setUserPosts(data || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      setUserPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle photo selection from SimpleFilePicker
  const handlePhotoSelect = (file: File) => {
    setUploadFile(file);
    setShowCropper(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadFile(file);
      setShowCropper(true);
    } else {
      alert('Please select a valid image file');
    }
  };

  const handleCropComplete = (croppedBlob: Blob, aspectRatio: AspectRatio) => {
    setCroppedImageBlob(croppedBlob);
    setSelectedAspectRatio(aspectRatio);
    setShowCropper(false);
    setShowUploadModal(true);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setUploadFile(null);
    setCroppedImageBlob(null);
    setSelectedAspectRatio(null);
  };

  const triggerFileInput = () => {
    setShowFilePicker(true);
  };


  const handleUpload = async () => {
    if (!croppedImageBlob || !currentUser) return;

    try {
      setUploading(true);
      
      console.log('🚀 Starting upload process...');
      
      // Convert blob to file for upload
      const croppedFile = new File([croppedImageBlob], `cropped_${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });
      
      // Upload image to storage
      const { data: uploadData, error: uploadError } = await posts.uploadImage(croppedFile, currentUser.id);
      
      if (uploadError || !uploadData) {
        console.error('❌ Upload failed:', uploadError);
        alert(`Failed to upload image: ${(uploadError as any)?.message || 'Unknown error'}`);
        return;
      }

      console.log('✅ Image uploaded, creating post...');

      // Create post record with aspect ratio metadata
      const { error: createError } = await posts.createPost(uploadData.publicUrl, uploadCaption);
      
      if (createError) {
        console.error('❌ Post creation failed:', createError);
        alert(`Failed to create post: ${(createError as any)?.message || 'Unknown error'}`);
        return;
      }

      console.log('✅ Post created successfully!');

      // Reset form and reload posts
      setUploadFile(null);
      setCroppedImageBlob(null);
      setSelectedAspectRatio(null);
      setUploadCaption('');
      setShowUploadModal(false);
      loadPosts();
      
    } catch (error) {
      console.error('❌ Upload process error:', error);
      alert(`Failed to upload post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await posts.deletePost(postId);
      
      if (error) {
        alert('Failed to delete post');
        return;
      }

      setShowDeleteConfirm(null);
      loadPosts();
      
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  // Handler for deleting photos from modal
  const handleDeletePhotoFromModal = async (photoId: string) => {
    try {
      const { error } = await posts.deletePost(photoId);
      
      if (error) {
        throw new Error('Failed to delete photo');
      }

      // Reload posts to refresh the grid
      await loadPosts();
      
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error; // Re-throw to let PhotoModal handle the error display
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-orange"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hidden File Input */}
      <input
        id="photo-upload-input"
        type="file"
        accept="image/*,image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        multiple={false}
      />

      {/* Instagram-style Tabs */}
      <div className="mb-4 sm:mb-6 px-4">
        <div className="flex items-center justify-center space-x-4 sm:space-x-8 mb-4">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 transition-all duration-200 ${
              activeTab === 'posts'
                ? 'text-white border-b-2 border-primary-orange'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <Image size={18} className="sm:w-5 sm:h-5" />
            <span className="font-medium text-sm sm:text-base">Posts</span>
          </button>
          <button
            onClick={() => setActiveTab('shots')}
            className={`flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 transition-all duration-200 ${
              activeTab === 'shots'
                ? 'text-white border-b-2 border-primary-orange'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <Video size={18} className="sm:w-5 sm:h-5" />
            <span className="font-medium text-sm sm:text-base">Shots</span>
          </button>
          <button
            onClick={() => setActiveTab('tagged')}
            className={`flex items-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-4 transition-all duration-200 ${
              activeTab === 'tagged'
                ? 'text-white border-b-2 border-primary-orange'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <Tag size={18} className="sm:w-5 sm:h-5" />
            <span className="font-medium text-sm sm:text-base">Tagged</span>
          </button>
        </div>
        
        {/* Tab divider */}
        <div className="h-px bg-white/10"></div>
      </div>

      {/* Tab Content Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-4">
        <div className="flex items-center space-x-2">
          <span className="text-white/60 text-xs sm:text-sm">
            {activeTab === 'posts' ? `${userPosts.length} ${userPosts.length === 1 ? 'post' : 'posts'}` : 
             activeTab === 'shots' ? '0 shots' : 
             '0 tagged posts'}
          </span>
        </div>
        {isOwnProfile && activeTab === 'posts' && (
          <button
            onClick={triggerFileInput}
            className="group relative bg-gradient-to-r from-primary-orange to-primary-pink text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:shadow-lg hover:shadow-primary-orange/25 transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center space-x-1">
              <Plus size={14} className="sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-medium text-xs sm:text-sm">Post</span>
            </div>
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'posts' && (
        <>
          {userPosts.length > 0 ? (
            <div className="w-full">
              <div className="grid grid-cols-3 gap-px">
                {userPosts.map((post, index) => {
                  // Detect aspect ratio from image URL or use square as fallback
                  // For now, we'll use square for grid consistency, but preserve ratio in fullscreen
                  return (
                  <div
                    key={post.id}
                    className="group relative aspect-square bg-black/20 overflow-hidden cursor-pointer transition-all duration-200 hover:opacity-80 active:opacity-60"
                    onClick={() => {
                      setSelectedPost(post);
                      setShowFullscreen(true);
                    }}
                  >
                    {/* Image */}
                    <img
                      src={post.image_url}
                      alt={post.caption || 'User post'}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Hover Overlay - Hidden on mobile, shown on desktop */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hidden sm:flex">
                      <div className="flex items-center space-x-4 text-white">
                        <div className="flex items-center space-x-1">
                          <Heart size={18} fill="white" />
                          <span className="text-sm font-semibold">0</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle size={18} fill="white" />
                          <span className="text-sm font-semibold">0</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Multiple photos indicator */}
                    {index === 0 && (
                      <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                        <Grid3X3 size={14} className="sm:w-4 sm:h-4 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 flex items-center justify-center mb-4">
                <Camera size={24} className="sm:w-7 sm:h-7 text-white/40" />
              </div>
              <h3 className="text-white font-medium text-base sm:text-lg mb-2">
                {isOwnProfile ? 'Post Your First Photo' : 'No Posts Yet'}
              </h3>
              <p className="text-white/60 text-sm mb-4 max-w-xs">
                {isOwnProfile 
                  ? 'When you post photos, they will appear on your profile.' 
                  : 'When they post photos, you\'ll see them here.'}
              </p>
              {isOwnProfile && (
                <button
                  onClick={triggerFileInput}
                  className="text-primary-orange hover:text-primary-orange/80 font-medium text-sm"
                >
                  Post your first photo
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Shots Tab */}
      {activeTab === 'shots' && (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 flex items-center justify-center mb-4">
            <Video size={24} className="sm:w-7 sm:h-7 text-white/40" />
          </div>
          <h3 className="text-white font-medium text-base sm:text-lg mb-2">No Shots Yet</h3>
          <p className="text-white/60 text-sm max-w-xs">Shots feature coming soon!</p>
        </div>
      )}

      {/* Tagged Tab */}
      {activeTab === 'tagged' && (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 flex items-center justify-center mb-4">
            <Tag size={24} className="sm:w-7 sm:h-7 text-white/40" />
          </div>
          <h3 className="text-white font-medium text-base sm:text-lg mb-2">No Tagged Posts</h3>
          <p className="text-white/60 text-sm max-w-xs">
            {isOwnProfile 
              ? 'When people tag you in photos, you\'ll see them here.' 
              : 'No tagged posts to show.'}
          </p>
        </div>
      )}

      {/* Image Cropper */}
      {showCropper && uploadFile && (
        <ImageCropper
          image={uploadFile}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Upload Modal - Simple Design */}
      {showUploadModal && croppedImageBlob && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => {
            setShowUploadModal(false);
            setUploadFile(null);
            setCroppedImageBlob(null);
            setSelectedAspectRatio(null);
            setUploadCaption('');
          }}
        >
          <div 
            className="bg-background-dark w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">New Post</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setCroppedImageBlob(null);
                  setSelectedAspectRatio(null);
                  setUploadCaption('');
                }}
                className="text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview */}
              <div 
                className="rounded-lg overflow-hidden bg-gray-800"
                style={{
                  aspectRatio: selectedAspectRatio?.ratio || 1
                }}
              >
                <img
                  src={URL.createObjectURL(croppedImageBlob)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Caption */}
              <textarea
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/50 resize-none focus:outline-none focus:border-primary-orange/50"
                rows={3}
                maxLength={200}
              />

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setUploadFile(null);
                    setCroppedImageBlob(null);
                    setSelectedAspectRatio(null);
                    setUploadCaption('');
                    setShowUploadModal(false);
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-primary-orange to-primary-pink text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {uploading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div 
            className="bg-background-dark rounded-2xl p-6 max-w-sm w-full border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Delete Post?</h3>
                <p className="text-white/60 text-sm">
                  This action cannot be undone. Your post will be permanently deleted.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePost(showDeleteConfirm)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Simple File Picker */}
      <SimpleFilePicker
        isOpen={showFilePicker}
        onClose={() => setShowFilePicker(false)}
        onSelect={handlePhotoSelect}
        accept="image/*"
        maxSize={10}
      />

      {/* Photo Modal */}
      {selectedPost && (
        <PhotoModal
          isOpen={showFullscreen}
          onClose={() => {
            console.log('PhotoModal onClose called!');
            setShowFullscreen(false);
            setSelectedPost(null);
          }}
          photos={userPosts.map(post => ({
            id: post.id,
            image_url: post.image_url,
            caption: post.caption,
            created_at: post.created_at
          }))}
          currentIndex={userPosts.findIndex(post => post.id === selectedPost.id)}
          username={username || 'Unknown User'}
          userAvatar={userAvatar}
          isOwnProfile={isOwnProfile}
          onDelete={isOwnProfile ? handleDeletePhotoFromModal : undefined}
        />
      )}
    </div>
  );
};

export default PostsGrid;