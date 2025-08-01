// Mock data for social features - posts, stories, highlights
export interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  expires_at: string;
  viewed: boolean;
}

export interface Highlight {
  id: string;
  user_id: string;
  title: string;
  cover_image: string;
  stories: Story[];
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  username: string;
  user_avatar: string;
  images: string[];
  caption: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  location?: string;
  sport?: string;
  liked: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  user_avatar: string;
  text: string;
  created_at: string;
}

// Sample user profiles
export const instagramProfiles = {
  user1: {
    id: 'user1',
    username: 'alexsoccer',
    full_name: 'Alex Martinez',
    bio: 'Football enthusiast ⚽ | Captain @cityfc | Always up for a match!',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    followers_count: 1247,
    following_count: 389,
    matches_played: 156,
    favorite_sport: 'Football',
    verified: true
  },
  user2: {
    id: 'user2',
    username: 'sarahhoops',
    full_name: 'Sarah Johnson',
    bio: 'Basketball player 🏀 | State champion | Teaching kids the game',
    avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616c3d1e8b8?w=150&h=150&fit=crop&crop=face',
    followers_count: 892,
    following_count: 234,
    matches_played: 89,
    favorite_sport: 'Basketball',
    verified: false
  },
  user3: {
    id: 'user3',
    username: 'miketennis',
    full_name: 'Mike Chen',
    bio: 'Tennis coach & player 🎾 | Regional tournament winner',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    followers_count: 567,
    following_count: 145,
    matches_played: 203,
    favorite_sport: 'Tennis',
    verified: false
  }
};

// Sample stories
export const stories: Story[] = [
  {
    id: 'story1',
    user_id: 'user1',
    image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop',
    created_at: '2024-01-15T10:30:00Z',
    expires_at: '2024-01-16T10:30:00Z',
    viewed: false
  },
  {
    id: 'story2',
    user_id: 'user1',
    image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop',
    created_at: '2024-01-15T14:15:00Z',
    expires_at: '2024-01-16T14:15:00Z',
    viewed: true
  },
  {
    id: 'story3',
    user_id: 'user2',
    image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=600&fit=crop',
    created_at: '2024-01-15T16:45:00Z',
    expires_at: '2024-01-16T16:45:00Z',
    viewed: false
  }
];

// Sample highlights
export const highlights: Highlight[] = [
  {
    id: 'highlight1',
    user_id: 'user1',
    title: 'Goals ⚽',
    cover_image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&h=200&fit=crop',
    stories: [
      {
        id: 'hl_story1',
        user_id: 'user1',
        image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop',
        created_at: '2024-01-10T10:30:00Z',
        expires_at: '2024-01-11T10:30:00Z',
        viewed: true
      },
      {
        id: 'hl_story2',
        user_id: 'user1',
        image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop',
        created_at: '2024-01-12T14:15:00Z',
        expires_at: '2024-01-13T14:15:00Z',
        viewed: true
      }
    ],
    created_at: '2024-01-10T10:30:00Z'
  },
  {
    id: 'highlight2',
    user_id: 'user1',
    title: 'Training 💪',
    cover_image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop',
    stories: [
      {
        id: 'hl_story3',
        user_id: 'user1',
        image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=600&fit=crop',
        created_at: '2024-01-05T08:30:00Z',
        expires_at: '2024-01-06T08:30:00Z',
        viewed: true
      }
    ],
    created_at: '2024-01-05T08:30:00Z'
  },
  {
    id: 'highlight3',
    user_id: 'user1',
    title: 'Matches 🏆',
    cover_image: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=200&h=200&fit=crop',
    stories: [
      {
        id: 'hl_story4',
        user_id: 'user1',
        image_url: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=400&h=600&fit=crop',
        created_at: '2024-01-08T18:00:00Z',
        expires_at: '2024-01-09T18:00:00Z',
        viewed: true
      }
    ],
    created_at: '2024-01-08T18:00:00Z'
  }
];

// Sample posts
export const posts: Post[] = [
  {
    id: 'post1',
    user_id: 'user1',
    username: 'alexsoccer',
    user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    images: [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=600&fit=crop'
    ],
    caption: 'Amazing match today! ⚽ Nothing beats the feeling of scoring the winning goal in the final minutes. Thanks to everyone who came out to play! 🔥 #Football #Goals #TeamWork',
    likes_count: 127,
    comments_count: 23,
    created_at: '2024-01-15T18:30:00Z',
    location: 'City Sports Complex',
    sport: 'Football',
    liked: false
  },
  {
    id: 'post2',
    user_id: 'user1',
    username: 'alexsoccer',
    user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    images: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=600&fit=crop'
    ],
    caption: 'Morning training session complete! 💪 Working on my speed and agility. Consistency is key to improvement. Who wants to join me tomorrow? #Training #Dedication #Football',
    likes_count: 89,
    comments_count: 12,
    created_at: '2024-01-14T09:15:00Z',
    location: 'Downtown Park',
    sport: 'Football',
    liked: true
  },
  {
    id: 'post3',
    user_id: 'user2',
    username: 'sarahhoops',
    user_avatar: 'https://images.unsplash.com/photo-1494790108755-2616c3d1e8b8?w=150&h=150&fit=crop&crop=face',
    images: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=600&fit=crop'
    ],
    caption: 'Three-pointer practice paying off! 🏀 Hit 15 in a row today. The key is repetition and proper form. Keep grinding! #Basketball #Practice #Improvement',
    likes_count: 156,
    comments_count: 31,
    created_at: '2024-01-13T16:45:00Z',
    location: 'Community Center',
    sport: 'Basketball',
    liked: false
  },
  {
    id: 'post4',
    user_id: 'user1',
    username: 'alexsoccer',
    user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    images: [
      'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=600&h=600&fit=crop'
    ],
    caption: 'Team celebration after our championship win! 🏆 Couldn\'t be prouder of this group. We\'ve worked so hard all season and it paid off. Bring on the next challenge! #Champions #TeamWork #Victory',
    likes_count: 203,
    comments_count: 45,
    created_at: '2024-01-12T20:00:00Z',
    location: 'Stadium',
    sport: 'Football',
    liked: true
  }
];

// Sample comments
export const comments: Comment[] = [
  {
    id: 'comment1',
    post_id: 'post1',
    user_id: 'user2',
    username: 'sarahhoops',
    user_avatar: 'https://images.unsplash.com/photo-1494790108755-2616c3d1e8b8?w=150&h=150&fit=crop&crop=face',
    text: 'Incredible goal! 🔥 You\'re getting better every match!',
    created_at: '2024-01-15T18:45:00Z'
  },
  {
    id: 'comment2',
    post_id: 'post1',
    user_id: 'user3',
    username: 'miketennis',
    user_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    text: 'Great game! Would love to join next time',
    created_at: '2024-01-15T19:00:00Z'
  },
  {
    id: 'comment3',
    post_id: 'post2',
    user_id: 'user2',
    username: 'sarahhoops',
    user_avatar: 'https://images.unsplash.com/photo-1494790108755-2616c3d1e8b8?w=150&h=150&fit=crop&crop=face',
    text: 'I\'m in for tomorrow\'s training! 💪',
    created_at: '2024-01-14T09:30:00Z'
  }
];

// Helper function to get user's stories
export const getUserStories = (userId: string): Story[] => {
  return stories.filter(story => story.user_id === userId);
};

// Helper function to get user's highlights
export const getUserHighlights = (userId: string): Highlight[] => {
  return highlights.filter(highlight => highlight.user_id === userId);
};

// Helper function to get user's posts
export const getUserPosts = (userId: string): Post[] => {
  return posts.filter(post => post.user_id === userId);
};

// Helper function to get post comments
export const getPostComments = (postId: string): Comment[] => {
  return comments.filter(comment => comment.post_id === postId);
};

// Helper function to get user profile
export const getUserProfile = (userId: string) => {
  return instagramProfiles[userId as keyof typeof instagramProfiles];
};

// Default export
const mockInstagramData = {
  instagramProfiles,
  stories,
  highlights,
  posts,
  comments,
  getUserStories,
  getUserHighlights,
  getUserPosts,
  getPostComments,
  getUserProfile
};

export default mockInstagramData; 