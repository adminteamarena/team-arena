import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Calendar, MapPin, Edit, BarChart3, UserPlus, MessageCircle } from 'lucide-react';
import StatsModal from '../components/profile/StatsModal';
import SupportersModal from '../components/profile/SupportersModal';
import PostsGrid from '../components/profile/PostsGrid';
import LazyImage from '../components/ui/LazyImage';
import ProfileSkeleton from '../components/ui/ProfileSkeleton';
import EnhancedAvatar from '../components/ui/EnhancedAvatar';
import { supabase, auth, profiles, UserProfile, FollowUser, notifications } from '../lib/supabase';

// Available sports options
const availableSports = [
  'Football', 'Basketball', 'Tennis', 'Baseball', 'Soccer', 'Swimming', 
  'Running', 'Cycling', 'Golf', 'Volleyball', 'Boxing', 'Wrestling',
  'Hockey', 'Rugby', 'Cricket', 'Track & Field', 'Gymnastics', 'Badminton'
];

const getSportIcon = (sport: string) => {
  const icons: { [key: string]: string } = {
    'Football': '🏈',
    'Basketball': '🏀',
    'Tennis': '🎾',
    'Baseball': '⚾',
    'Soccer': '⚽',
    'Swimming': '🏊',
    'Running': '🏃',
    'Cycling': '🚴',
    'Golf': '⛳',
    'Volleyball': '🏐',
    'Boxing': '🥊',
    'Wrestling': '🤼',
    'Hockey': '🏒',
    'Rugby': '🏉',
    'Cricket': '🏏',
    'Track & Field': '🏃',
    'Gymnastics': '🤸',
    'Badminton': '🏸'
  };
  return icons[sport] || '⚽';
};

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSupportersModal, setShowSupportersModal] = useState(false);
  const [supportersModalType, setSupportersModalType] = useState<'supporters' | 'supporting'>('supporters');
  const [editForm, setEditForm] = useState({
    bio: '',
    location: '',
    favorite_sport: '',
    avatar_url: ''
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  // Load follow status when viewing another user's profile
  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!isOwnProfile && profile && currentUser) {
        try {
          const { data: followStatus } = await profiles.isFollowing(profile.id);
          setIsFollowing(followStatus);
        } catch (error) {
          console.error('Error loading follow status:', error);
        }
      }
    };

    loadFollowStatus();
  }, [profile, currentUser, isOwnProfile]);

  // Subscribe to real-time follower count updates
  useEffect(() => {
    if (!profile) return;

    const subscription = notifications.subscribeToFollowerUpdates(
      profile.id,
      (followers_count, following_count) => {
        setProfile(prev => prev ? {
          ...prev,
          followers_count,
          following_count
        } : null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current authenticated user
      const { user, error: authError } = await auth.getCurrentUser();
      if (authError) {
        console.error('Auth error:', authError);
        setError('Authentication required');
        return;
      }
      
      if (!user) {
        setError('Please log in to view profiles');
        return;
      }

      setCurrentUser(user);
      
      // Determine which profile to load
      const targetUserId = userId || user.id;
      const isOwn = !userId || userId === user.id;
      setIsOwnProfile(isOwn);
      
      // Get profile data
      const { data: profileData, error: profileError } = await profiles.getProfile(targetUserId);
      
      if (profileError) {
        console.error('Profile error:', profileError);
        setError('Profile not found');
        return;
      }
      
      // If profile doesn't exist, create a basic one for the current user
      if (!profileData && isOwn) {
        const basicProfile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> = {
          username: user.email?.split('@')[0] || 'user',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          bio: '',
          avatar_url: '',
          followers_count: 0,
          following_count: 0,
          matches_played: 0,
          location: '',
          favorite_sport: ''
        };
        
        const { data: newProfile, error: createError } = await profiles.createProfile(basicProfile);
        if (createError) {
          console.error('Create profile error:', createError);
          setError('Failed to create profile');
          return;
        }
        
        setProfile(newProfile);
        setEditForm({
          bio: newProfile.bio || '',
          location: newProfile.location || '',
          favorite_sport: newProfile.favorite_sport || '',
          avatar_url: newProfile.avatar_url || ''
        });
      } else if (profileData) {
        // Use existing profile data with 0 defaults for counts
        const normalizedProfile: UserProfile = {
          ...profileData,
          followers_count: profileData.followers_count || 0,
          following_count: profileData.following_count || 0,
          matches_played: profileData.matches_played || 0,
          bio: profileData.bio || '',
          location: profileData.location || '',
          favorite_sport: profileData.favorite_sport || ''
        };
        
        setProfile(normalizedProfile);
        setEditForm({
          bio: normalizedProfile.bio || '',
          location: normalizedProfile.location || '',
          favorite_sport: normalizedProfile.favorite_sport || '',
          avatar_url: normalizedProfile.avatar_url || ''
        });
      } else {
        setError('Profile not found');
      }
      
    } catch (error) {
      console.error('Load profile error:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || !currentUser || isOwnProfile) return;
    
    try {
      setLoading(true);
      console.log('🔄 Follow action initiated:', { 
        targetUserId: profile.id, 
        currentUserId: currentUser.id, 
        isFollowing 
      });
      
      let result;
      if (isFollowing) {
        console.log('➖ Unfollowing user...');
        result = await profiles.unfollowUser(profile.id);
        if (!result.error) {
          console.log('✅ Unfollow successful');
          setIsFollowing(false);
          // Update local follower count
          setProfile(prev => prev ? {
            ...prev,
            followers_count: Math.max(0, prev.followers_count - 1)
          } : null);
        }
      } else {
        console.log('➕ Following user...');
        result = await profiles.followUser(profile.id);
        console.log('🔄 Follow result:', result);
        if (!result.error) {
          console.log('✅ Follow successful');
          setIsFollowing(true);
          // Update local follower count
          setProfile(prev => prev ? {
            ...prev,
            followers_count: prev.followers_count + 1
          } : null);
        }
      }
      
      if (result.error) {
        console.error('❌ Follow/unfollow error:', result.error);
        setError('Failed to update follow status');
      }
    } catch (error) {
      console.error('❌ Follow action error:', error);
      setError('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async () => {
    if (profile && !isOwnProfile && currentUser) {
      try {
        setMessageLoading(true);
        
        // Create or get conversation with this user
        const { data: conversationId, error } = await supabase
          .rpc('get_or_create_conversation', {
            user_one_id: currentUser.id,
            user_two_id: profile.id
          });
        
        if (error) {
          console.error('Error creating/getting conversation:', error);
          setError('Failed to start conversation');
          return;
        }
        
        // Navigate to private chat with the conversation ID
        navigate(`/messages/${conversationId}`);
      } catch (error) {
        console.error('Error handling message:', error);
        setError('Failed to start conversation');
      } finally {
        setMessageLoading(false);
      }
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!profile || !currentUser) return;
    
    try {
      setLoading(true);
      
      // Update profile in database
      const updates = {
        bio: editForm.bio,
        location: editForm.location,
        favorite_sport: editForm.favorite_sport,
        avatar_url: previewImage || editForm.avatar_url
      };
      
      const { data: updatedProfile, error } = await profiles.updateProfile(currentUser.id, updates);
      
      if (error) {
        console.error('Update profile error:', error);
        setError('Failed to update profile');
        return;
      }
      
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
      
      setPreviewImage(null);
      setIsEditing(false);
      setError(null);
      
    } catch (error) {
      console.error('Save profile error:', error);
      setError('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (!profile) return;
    
    // Reset form to original values
    setEditForm({
      bio: profile.bio || '',
      location: profile.location || '',
      favorite_sport: profile.favorite_sport || '',
      avatar_url: profile.avatar_url || ''
    });
    setPreviewImage(null);
    setError(null);
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setPreviewImage(result);
        };
        reader.readAsDataURL(file);
      } else {
        setError('Please select a valid image file');
      }
    }
  };

  const handleStats = () => {
    setShowStatsModal(true);
  };

  const handleSupportersClick = () => {
    setSupportersModalType('supporters');
    setShowSupportersModal(true);
  };

  const handleSupportingClick = () => {
    setSupportersModalType('supporting');
    setShowSupportersModal(true);
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/60">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error}</p>
          <button 
            onClick={loadProfile}
            className="text-primary-orange hover:text-primary-orange/80 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/60">
        <p>Profile not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background-dark text-white overflow-y-auto overflow-x-hidden">
      <div className="max-w-md mx-auto p-4 sm:p-6 sm:max-w-lg md:max-w-2xl lg:max-w-4xl">
        {/* Profile Header */}
        <div className="flex flex-col items-center space-y-4 md:space-y-6">
          {/* Profile Photo */}
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-primary-orange to-primary-red p-1">
              <div className="w-full h-full rounded-full bg-background-dark flex items-center justify-center overflow-hidden">
                {previewImage || profile.avatar_url ? (
                  <LazyImage 
                    src={previewImage || profile.avatar_url || ''} 
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center">
                    <User size={32} className="text-white/80 md:w-12 md:h-12 lg:w-16 lg:h-16" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Edit Photo Button */}
            {isEditing && (
              <div className="absolute -bottom-1 -right-1">
                <label
                  htmlFor="profile-photo-input"
                  className="bg-primary-orange hover:bg-primary-orange/80 text-white rounded-full p-2.5 md:p-3 cursor-pointer transition-colors duration-200 flex items-center justify-center shadow-lg border-2 border-background-dark"
                >
                  <Edit size={16} className="md:w-5 md:h-5" />
                </label>
                <input
                  id="profile-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex justify-center space-x-6 sm:space-x-8 md:space-x-12 lg:space-x-16 w-full">
            <div className="text-center">
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-white">{profile.matches_played}</div>
              <div className="text-sm md:text-base text-white/60">Matches</div>
            </div>
            <button onClick={handleSupportersClick} className="text-center hover:scale-105 transition-transform duration-200">
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-white">{profile.followers_count}</div>
              <div className="text-sm md:text-base text-white/60">Supporters</div>
            </button>
            <button onClick={handleSupportingClick} className="text-center hover:scale-105 transition-transform duration-200">
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-white">{profile.following_count}</div>
              <div className="text-sm md:text-base text-white/60">Supporting</div>
            </button>
          </div>

          {/* Username and Bio */}
          <div className="text-center space-y-1 md:space-y-2">
            <h1 className="text-base md:text-lg lg:text-xl font-bold text-white">{profile.username}</h1>
            <p className="text-xs md:text-sm text-white/60">{profile.full_name}</p>
            
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-3 md:space-y-4 max-w-xs md:max-w-md lg:max-w-lg mx-auto">
                {/* Bio Input */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs md:text-sm text-white/60">Bio</label>
                    <span className={`text-xs ${
                      editForm.bio.length > 45 
                        ? 'text-orange-400' 
                        : editForm.bio.length > 50 
                        ? 'text-red-400' 
                        : 'text-white/40'
                    }`}>
                      {editForm.bio.length}/50
                    </span>
                  </div>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => {
                      if (e.target.value.length <= 50) {
                        handleInputChange('bio', e.target.value)
                      }
                    }}
                    className={`w-full px-3 py-2 md:px-4 md:py-3 bg-white/10 border rounded-lg text-xs md:text-sm text-white placeholder-white/50 focus:outline-none resize-none transition-colors ${
                      editForm.bio.length > 45 
                        ? 'border-orange-400/50 focus:border-orange-400' 
                        : 'border-white/20 focus:border-primary-orange/50'
                    }`}
                    rows={2}
                    placeholder="Tell us about yourself..."
                    maxLength={50}
                  />
                </div>
                
                {/* Location Input */}
                <div>
                  <label className="text-xs md:text-sm text-white/60 block mb-1">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/10 border border-white/20 rounded-lg text-xs md:text-sm text-white placeholder-white/50 focus:outline-none focus:border-primary-orange/50"
                    placeholder="Enter your city..."
                  />
                </div>
                
                {/* Favorite Sport Dropdown */}
                <div>
                  <label className="text-xs md:text-sm text-white/60 block mb-1">Favorite Sport</label>
                  <select
                    value={editForm.favorite_sport}
                    onChange={(e) => handleInputChange('favorite_sport', e.target.value)}
                    className="w-full px-3 py-2 md:px-4 md:py-3 bg-white/10 border border-white/20 rounded-lg text-xs md:text-sm text-white focus:outline-none focus:border-primary-orange/50"
                  >
                    <option value="" className="bg-gray-800">Select a sport...</option>
                    {availableSports.map(sport => (
                      <option key={sport} value={sport} className="bg-gray-800">
                        {getSportIcon(sport)} {sport}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <>
                <p className="text-xs md:text-sm lg:text-base text-white/80 max-w-xs md:max-w-md lg:max-w-lg leading-tight">
                  {profile.bio || "No bio added yet"}
                </p>
                
                <div className="flex items-center justify-center space-x-3 md:space-x-4 text-white/60 pt-1 md:pt-2">
                  {profile.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin size={12} className="md:w-4 md:h-4" />
                      <span className="text-xs md:text-sm">{profile.location}</span>
                    </div>
                  )}
                  
                  {profile.favorite_sport && (
                    <div className="flex items-center space-x-1">
                      <span className="text-yellow-400 text-xs md:text-sm">⭐</span>
                      <span className="text-xs md:text-sm">{getSportIcon(profile.favorite_sport)}</span>
                      <span className="text-xs md:text-sm">{profile.favorite_sport}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3 md:space-y-4 mt-6 md:mt-8 max-w-xs md:max-w-md lg:max-w-lg mx-auto">
            {isOwnProfile ? (
              /* Own Profile Buttons */
              <div className="flex space-x-3 md:space-x-4">
                {isEditing ? (
                  /* Edit Mode Buttons */
                  <>
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 bg-gradient-to-r from-primary-orange to-primary-red hover:from-primary-orange/80 hover:to-primary-red/80 text-white py-2 px-4 md:py-3 md:px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 text-sm md:text-base"
                    >
                      <span>Save</span>
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 md:py-3 md:px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 text-sm md:text-base"
                    >
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  /* Normal Mode Buttons */
                  <>
                    <button
                      onClick={handleEditProfile}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 md:py-3 md:px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 text-sm md:text-base"
                    >
                      <Edit size={16} className="md:w-5 md:h-5" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={handleStats}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 md:py-3 md:px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 text-sm md:text-base"
                    >
                      <BarChart3 size={16} className="md:w-5 md:h-5" />
                      <span>Stats</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Other User's Profile Buttons */
              <div className="flex space-x-3 md:space-x-4">
                <button
                  onClick={handleFollow}
                  className={`flex-1 py-2 px-4 md:py-3 md:px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 text-sm md:text-base ${
                    isFollowing
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-gradient-to-r from-primary-orange to-primary-red hover:from-primary-orange/80 hover:to-primary-red/80 text-white'
                  }`}
                >
                  <UserPlus size={16} className="md:w-5 md:h-5" />
                  <span>{isFollowing ? 'Supporting' : 'Support'}</span>
                </button>
                <button
                  onClick={handleMessage}
                  disabled={messageLoading}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 md:py-3 md:px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 text-sm md:text-base disabled:opacity-50"
                >
                  {messageLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <MessageCircle size={16} className="md:w-5 md:h-5" />
                  )}
                  <span>{messageLoading ? 'Loading...' : 'Message'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Join Date */}
          <div className="flex items-center space-x-1 text-white/60 mt-4 md:mt-6">
            <Calendar size={12} className="md:w-4 md:h-4" />
            <span className="text-xs md:text-sm">
              Joined {new Date(profile.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Posts Grid Section */}
        <div className="mt-8 md:mt-12">
        </div>
      </div>
      
      {/* Full Width Posts Grid */}
      <div className="w-full">
        <PostsGrid 
          userId={profile.id} 
          isOwnProfile={isOwnProfile} 
          username={profile.username}
          userAvatar={profile.avatar_url}
        />
      </div>
      
      {/* Stats Modal */}
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        username={profile.username}
      />
      
      {/* Supporters Modal */}
      <SupportersModal
        isOpen={showSupportersModal}
        onClose={() => setShowSupportersModal(false)}
        type={supportersModalType}
        userId={profile.id}
        currentUserId={currentUser?.id || ''}
      />
    </div>
  );
};

export default Profile; 