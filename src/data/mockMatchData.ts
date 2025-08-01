import { Match, UserProfile, MatchParticipant } from '../lib/supabase';

// Mock users data
const mockUsers: UserProfile[] = [
  {
    id: '1',
    username: 'johndoe',
    full_name: 'John Doe',
    bio: 'Football enthusiast',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    followers_count: 1250,
    following_count: 180,
    matches_played: 45,
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-12-01T10:00:00Z'
  },
  {
    id: '2',
    username: 'sarahj',
    full_name: 'Sarah Johnson',
    bio: 'Basketball player',
    avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616c35c12f6?w=150&h=150&fit=crop&crop=face',
    followers_count: 890,
    following_count: 200,
    matches_played: 32,
    created_at: '2023-02-10T10:00:00Z',
    updated_at: '2023-12-01T10:00:00Z'
  },
  {
    id: '3',
    username: 'mikechen',
    full_name: 'Mike Chen',
    bio: 'Tennis coach',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    followers_count: 650,
    following_count: 150,
    matches_played: 28,
    created_at: '2023-03-05T10:00:00Z',
    updated_at: '2023-12-01T10:00:00Z'
  },
  {
    id: '4',
    username: 'alexbrown',
    full_name: 'Alex Brown',
    bio: 'Football striker',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    followers_count: 1100,
    following_count: 300,
    matches_played: 38,
    created_at: '2023-04-20T10:00:00Z',
    updated_at: '2023-12-01T10:00:00Z'
  },
  {
    id: '5',
    username: 'emmawilson',
    full_name: 'Emma Wilson',
    bio: 'Basketball fan',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    followers_count: 420,
    following_count: 80,
    matches_played: 15,
    created_at: '2023-05-12T10:00:00Z',
    updated_at: '2023-12-01T10:00:00Z'
  },
  {
    id: '6',
    username: 'davidlee',
    full_name: 'David Lee',
    bio: 'Sports enthusiast',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    followers_count: 780,
    following_count: 220,
    matches_played: 25,
    created_at: '2023-06-08T10:00:00Z',
    updated_at: '2023-12-01T10:00:00Z'
  },
  {
    id: '7',
    username: 'lisagarcia',
    full_name: 'Lisa Garcia',
    bio: 'Tennis player',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    followers_count: 950,
    following_count: 170,
    matches_played: 42,
    created_at: '2023-07-14T10:00:00Z',
    updated_at: '2023-12-01T10:00:00Z'
  },
  {
    id: '8',
    username: 'tomanderson',
    full_name: 'Tom Anderson',
    bio: 'Football defender',
    avatar_url: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150&h=150&fit=crop&crop=face',
    followers_count: 1350,
    following_count: 250,
    matches_played: 55,
    created_at: '2023-08-22T10:00:00Z',
    updated_at: '2023-12-01T10:00:00Z'
  }
];

// Helper function to create participants
const createParticipants = (userIds: string[], teamSize: number, isReadyArray: boolean[] = []): MatchParticipant[] => {
  return userIds.map((userId, index) => {
    const user = mockUsers.find(u => u.id === userId);
    const team = index < teamSize ? 'A' : 'B';
    const position = index < teamSize ? index + 1 : index - teamSize + 1;
    
    return {
      id: `participant-${userId}-${index}`,
      match_id: '', // Will be set when creating matches
      user_id: userId,
      position_number: position,
      team_side: team,
      is_ready: isReadyArray[index] || false,
      joined_at: new Date().toISOString(),
      profile: user
    };
  });
};

// Get tomorrow's date for realistic scheduling
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

// Get day after tomorrow
const dayAfter = new Date();
dayAfter.setDate(dayAfter.getDate() + 2);
const dayAfterStr = dayAfter.toISOString().split('T')[0];

// Sample match data
export const mockMatches: Match[] = [
  {
    id: '1',
    title: 'Sunday Football Championship',
    sport_type: 'Football',
    location: 'Central Park Field A',
    date: tomorrowStr,
    time: '15:00',
    max_players: 10,
    team_format: '5v5',
    status: 'upcoming',
    organizer_id: '1',
    description: 'Competitive 5v5 match for experienced players. Bring your A-game!',
    ready_check_started: false,
    ready_check_deadline: undefined,
    weather_condition: 'sunny',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    organizer: mockUsers[0],
    participants: createParticipants(['1', '2', '3', '4', '5', '6', '7', '8'], 5), // 8/10 players
    participant_count: 8
  },
  {
    id: '2',
    title: 'Basketball 3v3 Tournament',
    sport_type: 'Basketball',
    location: 'Downtown Sports Complex Court 1',
    date: tomorrowStr,
    time: '18:00',
    max_players: 6,
    team_format: '3v3',
    status: 'upcoming',
    organizer_id: '2',
    description: 'Fast-paced 3v3 basketball tournament. All skill levels welcome!',
    ready_check_started: false,
    ready_check_deadline: undefined,
    weather_condition: 'indoor',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    organizer: mockUsers[1],
    participants: createParticipants(['2', '5', '6', '8', '1', '4'], 3), // 6/6 players - FULL
    participant_count: 6
  },
  {
    id: '3',
    title: 'Tennis Singles Match',
    sport_type: 'Tennis',
    location: 'Riverside Tennis Club',
    date: dayAfterStr,
    time: '10:00',
    max_players: 2,
    team_format: '1v1',
    status: 'upcoming',
    organizer_id: '3',
    description: 'Competitive tennis singles match. Intermediate level preferred.',
    ready_check_started: false,
    ready_check_deadline: undefined,
    weather_condition: 'cloudy',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    organizer: mockUsers[2],
    participants: createParticipants(['3'], 1), // 1/2 players
    participant_count: 1
  },
  {
    id: '4',
    title: 'Football 11v11 Premier League',
    sport_type: 'Football',
    location: 'Metropolitan Stadium',
    date: tomorrowStr,
    time: '16:30',
    max_players: 22,
    team_format: '11v11',
    status: 'upcoming',
    organizer_id: '4',
    description: 'Full-field 11v11 match. Professional level competition.',
    ready_check_started: true,
    ready_check_deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
    weather_condition: 'sunny',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    organizer: mockUsers[3],
    participants: createParticipants(
      ['4', '1', '2', '3', '5', '6', '7', '8', '1', '2', '3', '4', '5', '6', '7'], 
      11, 
      [true, true, false, true, false, true, true, false, true, false, true, false, true, false, false]
    ), // 15/22 players with mixed ready status
    participant_count: 15
  },
  {
    id: '5',
    title: 'Morning Football Kickoff',
    sport_type: 'Football',
    location: 'Seaside Park Field B',
    date: tomorrowStr,
    time: '09:00',
    max_players: 10,
    team_format: '5v5',
    status: 'live',
    organizer_id: '5',
    description: 'Early morning football match. Perfect way to start your day!',
    ready_check_started: false,
    ready_check_deadline: undefined,
    weather_condition: 'sunny',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    organizer: mockUsers[4],
    participants: createParticipants(['5', '6', '7', '8', '1', '2', '3', '4', '5', '6'], 5), // 10/10 players - FULL & LIVE
    participant_count: 10
  },
  {
    id: '6',
    title: 'Volleyball Beach Tournament',
    sport_type: 'Volleyball',
    location: 'Santa Monica Beach Court 3',
    date: dayAfterStr,
    time: '14:00',
    max_players: 8,
    team_format: '4v4',
    status: 'upcoming',
    organizer_id: '6',
    description: 'Beach volleyball tournament with ocean views. Bring sunscreen!',
    ready_check_started: false,
    ready_check_deadline: undefined,
    weather_condition: 'sunny',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    organizer: mockUsers[5],
    participants: createParticipants(['6', '7', '1', '3'], 4), // 4/8 players - half full
    participant_count: 4
  },
  {
    id: '7',
    title: 'Indoor Basketball League',
    sport_type: 'Basketball',
    location: 'University Gym Court A',
    date: tomorrowStr,
    time: '19:30',
    max_players: 10,
    team_format: '5v5',
    status: 'upcoming',
    organizer_id: '7',
    description: 'Competitive indoor basketball league. College-level play.',
    ready_check_started: false,
    ready_check_deadline: undefined,
    weather_condition: 'indoor',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    organizer: mockUsers[6],
    participants: createParticipants(['7', '8', '2', '4', '5', '6', '1', '3', '7'], 5), // 9/10 players - 1 spot left
    participant_count: 9
  },
  {
    id: '8',
    title: 'Tennis Doubles Championship',
    sport_type: 'Tennis',
    location: 'Elite Tennis Academy',
    date: dayAfterStr,
    time: '11:30',
    max_players: 4,
    team_format: '2v2',
    status: 'upcoming',
    organizer_id: '8',
    description: 'Professional doubles tournament. High skill level required.',
    ready_check_started: false,
    ready_check_deadline: undefined,
    weather_condition: 'cloudy',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    organizer: mockUsers[7],
    participants: createParticipants(['8', '3', '7'], 2), // 3/4 players
    participant_count: 3
  }
];

// Update match IDs in participants
mockMatches.forEach(match => {
  match.participants?.forEach(participant => {
    participant.match_id = match.id;
  });
});

export default mockMatches; 