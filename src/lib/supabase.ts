import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})


// Types (keeping existing types...)
export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  followers_count: number;
  following_count: number;
  matches_played: number;
  location?: string;
  favorite_sport?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPost {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  updated_at: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface Match {
  id: string;
  title: string;
  sport_type: string;
  location: string;
  date: string;
  time: string;
  max_players: number;
  team_format: string;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  organizer_id: string;
  description?: string;
  ready_check_started: boolean;
  ready_check_deadline?: string;
  weather_condition?: string;
  is_paid?: boolean;
  price_per_person?: number;
  currency?: string;
  created_at: string;
  updated_at: string;
  organizer?: UserProfile;
  participants?: MatchParticipant[];
  participant_count?: number;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  user_id: string;
  position_number: number;
  team_side: 'A' | 'B';
  is_ready: boolean;
  is_confirmed?: boolean;
  joined_at: string;
  profile?: UserProfile;
}

export interface MatchChatMessage {
  id: string;
  match_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'system' | 'quick_action' | 'voice' | 'join_info' | 'leave_info';
  voice_url?: string;
  voice_duration?: number;
  created_at: string;
  profile?: UserProfile;
}

export interface PrivateConversation {
  id: string;
  participant_one_id: string;
  participant_two_id: string;
  created_at: string;
  updated_at: string;
  participant?: UserProfile;
  last_message?: PrivateMessage;
  unread_count: number;
}

export interface PrivateMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'voice' | 'image';
  voice_url?: string;
  voice_duration?: number;
  image_url?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: UserProfile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'match_created' | 'match_joined' | 'match_left' | 'match_ready_check' | 'match_status_changed' | 'match_cancelled' | 'match_deleted' | 'position_changed' | 'kicked_from_match' | 'player_removed' | 'new_message' | 'system_announcement' | 'new_supporter' | 'support_request' | 'recruitment_post' | 'match_invitation' | 'match_modified';
  title: string;
  message: string;
  match_id?: string;
  from_user_id?: string;
  data: any;
  is_read: boolean;
  is_seen: boolean;
  created_at: string;
  read_at?: string;
  // Related entities
  match?: Match;
  from_user?: UserProfile;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface FollowUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  followers_count: number;
  following_count: number;
  matches_played: number;
  created_at: string;
  is_following: boolean;
}


// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string, userData?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Profile helper functions
export const profiles = {
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        bio,
        avatar_url,
        followers_count,
        following_count,
        matches_played,
        location,
        favorite_sport,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single()
    return { data, error }
  },

  updateProfile: async (userId: string, updates: Partial<UserProfile>) => {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  createProfile: async (profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        ...profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()
    return { data, error }
  },

  searchProfiles: async (query: string, limit: number = 10) => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        bio,
        avatar_url,
        followers_count,
        following_count,
        matches_played,
        location,
        favorite_sport,
        created_at,
        updated_at
      `)
      .or(`username.ilike.${query}%,full_name.ilike.${query}%`)
      .order('username', { ascending: true })
      .limit(limit)
    return { data, error }
  },

  getPopularProfiles: async (limit: number = 10) => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        bio,
        avatar_url,
        followers_count,
        following_count,
        matches_played,
        location,
        favorite_sport,
        created_at,
        updated_at
      `)
      .order('followers_count', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  // Check if current user is following another user
  isFollowing: async (targetUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: false, error: new Error('Not authenticated') }
    
    const { data, error } = await supabase.rpc('is_following', {
      follower_user_id: user.id,
      following_user_id: targetUserId
    })
    return { data: data || false, error }
  },

  // Follow a user
  followUser: async (targetUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: false, error: new Error('Not authenticated') }
    
    const { data, error } = await supabase.rpc('follow_user', {
      target_user_id: targetUserId
    })

    // Create notification for the followed user
    if (data && !error) {
      try {
        console.log('🔔 Creating follow notification for user:', targetUserId);
        
        const { data: currentUserProfile, error: profileError } = await supabase
          .from('users')
          .select('username, full_name')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching current user profile:', profileError);
        }

        const followerName = (currentUserProfile?.full_name?.trim() && currentUserProfile.full_name.trim() !== '') ? currentUserProfile.full_name.trim() : currentUserProfile?.username || 'Someone'
        
        console.log('🔔 Follower name:', followerName);
        
        const notificationData = {
          user_id: targetUserId,
          type: 'new_supporter',
          title: 'New Supporter',
          message: `${followerName} started supporting you.`,
          from_user_id: user.id,
          is_read: false,
          is_seen: false,
          data: {
            supporter_name: followerName,
            supporter_id: user.id
          }
        };
        
        console.log('🔔 Notification data:', notificationData);
        console.log('🔔 Notification data stringified:', JSON.stringify(notificationData, null, 2));
        
        const { data: notificationResult, error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationData)
          .select()
          .single()
        
        if (notificationError) {
          console.error('❌ Failed to create follow notification:', notificationError);
        } else {
          console.log('✅ Follow notification created successfully:', notificationResult);
        }
      } catch (notificationError) {
        console.error('❌ Exception in follow notification creation:', notificationError)
      }
    } else {
      console.log('❌ Follow action failed or returned no data:', { data, error });
    }

    return { data: data || false, error }
  },

  // Unfollow a user
  unfollowUser: async (targetUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: false, error: new Error('Not authenticated') }
    
    const { data, error } = await supabase.rpc('unfollow_user', {
      target_user_id: targetUserId
    })
    return { data: data || false, error }
  },

  // Get followers of a user
  getFollowers: async (userId: string, limit: number = 50) => {
    const { data, error } = await supabase.rpc('get_user_followers', {
      target_user_id: userId,
      limit_count: limit
    })
    return { data: data || [], error }
  },

  // Get users that a user is following
  getFollowing: async (userId: string, limit: number = 50) => {
    const { data, error } = await supabase.rpc('get_user_following', {
      target_user_id: userId,
      limit_count: limit
    })
    return { data: data || [], error }
  },

  // Remove a follower (remove someone from following you)
  removeFollower: async (followerUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: false, error: new Error('Not authenticated') }
    
    const { data, error } = await supabase.rpc('remove_follower', {
      follower_user_id: followerUserId
    })
    return { data: data || false, error }
  }
}

// Match helper functions (keeping existing structure but simplifying the problematic parts)
export const matches = {
  getMatches: async (status?: string) => {
    const { data: simpleData, error: simpleError } = await supabase
      .from('matches')
      .select('*')
      .limit(1);
    
    let query = supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: matchesData, error } = await query
    
    if (error || !matchesData) {
      return { data: null, error }
    }

    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    const enrichedMatches = await Promise.all(
      matchesData.map(async (match) => {
        const { data: organizer, error: organizerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', match.organizer_id)
          .single()
        
        const { data: participants } = await supabase
          .from('match_participants')
          .select('*')
          .eq('match_id', match.id)

        const enrichedParticipants = await Promise.all(
          (participants || []).map(async (participant) => {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', participant.user_id)
              .single()
            
            return {
              ...participant,
              profile
            }
          })
        )

        return {
          ...match,
          organizer,
          participants: enrichedParticipants,
          participant_count: enrichedParticipants.length
        }
      })
    )

    return { data: enrichedMatches, error: null }
  },

  getMatch: async (matchId: string) => {
    const { data: matchData, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (error || !matchData) {
      return { data: null, error }
    }

    const { data: organizer, error: organizerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', matchData.organizer_id)
      .single()
    
    const { data: participants, error: participantsError } = await supabase
      .from('match_participants')
      .select('*')
      .eq('match_id', matchData.id)
    
    const enrichedParticipants = await Promise.all(
      (participants || []).map(async (participant) => {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', participant.user_id)
          .single()
        
        return {
          ...participant,
          profile
        }
      })
    )

    const enrichedMatch = {
      ...matchData,
      organizer,
      participants: enrichedParticipants,
      participant_count: enrichedParticipants.length
    }

    return { data: enrichedMatch, error: null }
  },

  createMatch: async (matchData: Omit<Match, 'id' | 'created_at' | 'updated_at'>) => {
    const matchDataWithLegacyFields = {
      ...matchData,
      creator_id: matchData.organizer_id,
      match_name: matchData.title,
    };

    console.log('🔄 Creating match with data:', matchDataWithLegacyFields);

    const { data: matchResult, error: matchError } = await supabase
      .from('matches')
      .insert([matchDataWithLegacyFields])
      .select()
      .single()

    if (matchError) {
      return { data: null, error: matchError }
    }

    return { data: matchResult, error: null }
  },

  updateMatch: async (matchId: string, updates: Partial<Match>) => {
    console.log('🔧 DEBUG: updateMatch called with:', { matchId, updates })
    
    try {
      // Get current match data for comparison and notification
      console.log('🔧 DEBUG: Fetching current match data...')
      const { data: currentMatch, error: fetchError } = await supabase
        .from('matches')
        .select('status, title, date, time, location, team_format, is_paid, price_per_person, organizer_id')
        .eq('id', matchId)
        .single()
      
      if (fetchError) {
        console.log('🔧 DEBUG: Error fetching current match:', fetchError)
        return { data: null, error: fetchError }
      }
      
      console.log('🔧 DEBUG: currentMatch:', currentMatch)
      
      // Update the match
      console.log('🔧 DEBUG: Updating match in database...')
      const { data, error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId)
        .select()
        .single()
      
      if (error) {
        console.log('🔧 DEBUG: Error updating match:', error)
        return { data, error }
      }
      
      console.log('🔧 DEBUG: Match updated successfully:', data)
      
      if (!error && currentMatch) {
        // Handle status change notifications (existing logic)
        if (updates.status && updates.status !== currentMatch.status) {
          console.log('🔧 DEBUG: Status change detected:', { from: currentMatch.status, to: updates.status })
          try {
            let message = ''
            switch (updates.status) {
              case 'live':
                message = `🔥 Match is now LIVE! Game on!`
                break
              case 'completed':
                message = `🏆 Match completed! Great game everyone!`
                break
              case 'cancelled':
                message = `❌ Match has been cancelled.`
                break
              default:
                message = `📢 Match status updated to ${updates.status}`
            }
            console.log('🔧 DEBUG: Sending status change system message:', message)
            await chat.sendSystemMessage(matchId, message)
            console.log('🔧 DEBUG: Status change system message sent successfully')
          } catch (error) {
            console.error('🔧 DEBUG: Failed to send match status system message:', error)
          }
        }
        
        // Handle match modification notifications (new logic)
        console.log('🔧 DEBUG: Checking for modification changes...')
        const changes: string[] = []
        
        if (updates.date && updates.date !== currentMatch.date) {
          changes.push(`Date changed to ${updates.date}`)
          console.log('🔧 DEBUG: Date change detected:', { from: currentMatch.date, to: updates.date })
        }
        if (updates.time && updates.time !== currentMatch.time) {
          changes.push(`Time changed to ${updates.time}`)
          console.log('🔧 DEBUG: Time change detected:', { from: currentMatch.time, to: updates.time })
        }
        if (updates.location && updates.location !== currentMatch.location) {
          const newLocation = updates.location.split(',')[0] // Remove city part for display
          changes.push(`Location changed to ${newLocation}`)
          console.log('🔧 DEBUG: Location change detected:', { from: currentMatch.location, to: updates.location })
        }
        if (updates.team_format && updates.team_format !== currentMatch.team_format) {
          changes.push(`Format changed to ${updates.team_format}`)
          console.log('🔧 DEBUG: Team format change detected:', { from: currentMatch.team_format, to: updates.team_format })
        }
        if (updates.is_paid !== undefined && updates.is_paid !== currentMatch.is_paid) {
          if (updates.is_paid) {
            changes.push(`Match is now paid (${updates.price_per_person || 0} MAD per person)`)
          } else {
            changes.push(`Match is now free`)
          }
          console.log('🔧 DEBUG: Payment status change detected:', { from: currentMatch.is_paid, to: updates.is_paid })
        } else if (updates.price_per_person !== undefined && updates.price_per_person !== currentMatch.price_per_person) {
          changes.push(`Price changed to ${updates.price_per_person} MAD per person`)
          console.log('🔧 DEBUG: Price change detected:', { from: currentMatch.price_per_person, to: updates.price_per_person })
        }
        
        console.log('🔧 DEBUG: changes detected:', changes)
        
        // Send modification notifications if there are significant changes
        if (changes.length > 0) {
          try {
            const changesSummary = changes.join(', ')
            console.log('🔧 DEBUG: changesSummary:', changesSummary)
            console.log('🔧 DEBUG: calling notify_match_modification RPC with params:', {
              target_match_id: matchId,
              target_organizer_id: currentMatch.organizer_id,
              target_match_title: currentMatch.title,
              target_changes_summary: changesSummary
            })
            
            const rpcResult = await supabase.rpc('notify_match_modification', {
              target_match_id: matchId,
              target_organizer_id: currentMatch.organizer_id,
              target_match_title: currentMatch.title,
              target_changes_summary: changesSummary
            })
            
            console.log('🔧 DEBUG: notify_match_modification RPC result:', rpcResult)
            
            if (rpcResult.error) {
              console.error('🔧 DEBUG: RPC error:', rpcResult.error)
            } else {
              console.log('🔧 DEBUG: RPC success, data:', rpcResult.data)
              console.log(`✅ Sent modification notifications for match ${matchId}: ${changesSummary}`)
            }
          } catch (error) {
            console.error('🔧 DEBUG: Exception in notification RPC call:', error)
            console.error('🔧 DEBUG: Full error details:', JSON.stringify(error, null, 2))
          }
        } else {
          console.log('🔧 DEBUG: No significant changes detected, skipping notifications')
        }
      } else {
        console.log('🔧 DEBUG: Skipping notifications due to error or missing currentMatch:', { error, currentMatch })
      }
      
      console.log('🔧 DEBUG: updateMatch completing, returning:', { data, error })
      return { data, error }
    } catch (exception) {
      console.error('🔧 DEBUG: Exception in updateMatch:', exception)
      console.error('🔧 DEBUG: Exception stack trace:', exception instanceof Error ? exception.stack : 'No stack trace')
      return { data: null, error: exception as Error }
    }
  },

  joinMatch: async (matchId: string, userId: string, positionNumber: number, teamSide: 'A' | 'B') => {
    const { data, error } = await supabase
      .from('match_participants')
      .insert([{
        match_id: matchId,
        user_id: userId,
        position_number: positionNumber,
        team_side: teamSide
      }])
      .select()
      .single()

    if (error) {
      console.error('Error inserting participant:');
      return { data: null, error }
    }

    // Send system message about user joining
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', userId)
        .single()

      const userName = (profile?.full_name?.trim() && profile.full_name.trim() !== '') ? profile.full_name.trim() : profile?.username || 'Someone'
      await chat.sendSystemMessage(matchId, `${userName} joined the match (Team ${teamSide}, Position ${positionNumber})`)
    } catch (error) {
      console.error('Failed to send system message:', error)
    }

    console.log('✅ User joined match, real-time should trigger automatically')
    return { data, error: null }
  },

  leaveMatch: async (matchId: string, userId: string) => {
    // Get user info and match info before leaving
    const { data: participant } = await supabase
      .from('match_participants')
      .select('team_side, position_number')
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .single()

    // Get match details for notifications
    const { data: matchData } = await supabase
      .from('matches')
      .select('title, sport_type, date, time, location, organizer_id')
      .eq('id', matchId)
      .single()

    // Get leaver's profile info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', userId)
      .single()
    

    // Get all remaining participants before deletion
    const { data: remainingParticipants } = await supabase
      .from('match_participants')
      .select('user_id')
      .eq('match_id', matchId)
      .neq('user_id', userId)

    const { error } = await supabase
      .from('match_participants')
      .delete()
      .eq('match_id', matchId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting participant:');
      return { error }
    }

    // Send system message about user leaving
    try {
      const userName = (profile?.full_name?.trim() && profile.full_name.trim() !== '') ? profile.full_name.trim() : profile?.username || 'Someone'
      const teamInfo = participant ? ` (Team ${participant.team_side}, Position ${participant.position_number})` : ''
      await chat.sendSystemMessage(matchId, `${userName} left the match${teamInfo}`)
    } catch (error) {
      console.error('Failed to send system message:', error)
    }

    // Send notifications to all remaining participants
    if (matchData && profile && participant && remainingParticipants) {
      const leaverName = (profile?.full_name?.trim() && profile.full_name.trim() !== '') ? profile.full_name.trim() : profile?.username || 'Someone'
      
      // Notify all remaining participants
      for (const remainingParticipant of remainingParticipants) {
        try {
          await supabase
            .from('notifications')
            .insert({
              user_id: remainingParticipant.user_id,
              type: 'match_left',
              title: 'Player Left Match',
              message: `${leaverName} left the match "${matchData.title}" (Team ${participant.team_side}, Position ${participant.position_number}).`,
              match_id: matchId,
              from_user_id: userId,
              data: {
                match_title: matchData.title,
                leaver_name: leaverName,
                leaver_id: userId,
                position: participant.position_number,
                team: participant.team_side,
                sport_type: matchData.sport_type,
                date: matchData.date,
                time: matchData.time,
                location: matchData.location,
                remaining_participants: remainingParticipants.length
              }
            })
        } catch (notificationError) {
          console.error('Failed to send notification to participant:', remainingParticipant.user_id, notificationError)
        }
      }

      // Notify the leaver about leaving (confirmation)
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'match_left',
            title: 'Left Match',
            message: `You left the match "${matchData.title}". Your position (Team ${participant.team_side}, Position ${participant.position_number}) is now available.`,
            match_id: matchId,
            from_user_id: userId,
            data: {
              match_title: matchData.title,
              position: participant.position_number,
              team: participant.team_side,
              sport_type: matchData.sport_type,
              date: matchData.date,
              time: matchData.time,
              location: matchData.location,
              organizer_id: matchData.organizer_id,
              action: 'left',
              remaining_participants: remainingParticipants.length
            }
          })
      } catch (notificationError) {
        console.error('Failed to send leave confirmation notification:', notificationError)
      }
    }

    console.log('✅ User left match, real-time should trigger automatically')
    return { error: null }
  },

  kickParticipant: async (matchId: string, participantUserId: string, organizerUserId: string) => {
    // First verify that the user is the organizer
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('organizer_id, title')
      .eq('id', matchId)
      .single()

    if (fetchError) {
      return { error: fetchError }
    }

    if (!match || match.organizer_id !== organizerUserId) {
      return { error: new Error('Only the match organizer can kick participants') }
    }

    // Don't allow organizer to kick themselves
    if (participantUserId === organizerUserId) {
      return { error: new Error('Organizer cannot kick themselves from the match') }
    }

    // Get participant info before kicking
    const { data: participant } = await supabase
      .from('match_participants')
      .select('team_side, position_number')
      .eq('match_id', matchId)
      .eq('user_id', participantUserId)
      .single()

    // Get match details for notifications
    const { data: matchData } = await supabase
      .from('matches')
      .select('title, sport_type, date, time, location, organizer_id')
      .eq('id', matchId)
      .single()

    // Get kicked player's profile info
    const { data: kickedProfile, error: kickedProfileError } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', participantUserId)
      .single()
    

    // Get organizer's profile info
    const { data: organizerProfile, error: organizerProfileError } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', organizerUserId)
      .single()
    

    // Get all remaining participants before deletion
    const { data: remainingParticipants } = await supabase
      .from('match_participants')
      .select('user_id')
      .eq('match_id', matchId)
      .neq('user_id', participantUserId)

    // Remove the participant from the match
    const { error } = await supabase
      .from('match_participants')
      .delete()
      .eq('match_id', matchId)
      .eq('user_id', participantUserId)

    if (error) {
      return { error }
    }

    // Send system message about user being kicked
    try {
      const userName = (kickedProfile?.full_name?.trim() && kickedProfile.full_name.trim() !== '') ? kickedProfile.full_name.trim() : kickedProfile?.username || 'Unknown Player'
      const teamInfo = participant ? ` (Team ${participant.team_side}, Position ${participant.position_number})` : ''
      await chat.sendSystemMessage(matchId, `${userName} was removed from the match${teamInfo}`)
    } catch (error) {
      console.error('Failed to send kick system message:', error)
    }

    // Send notifications to all remaining participants and kicked player
    
    if (matchData && participant) {
      const kickedPlayerName = (kickedProfile?.full_name?.trim() && kickedProfile.full_name.trim() !== '') ? kickedProfile.full_name.trim() : kickedProfile?.username || 'Unknown Player'
      const organizerName = (organizerProfile?.full_name?.trim() && organizerProfile.full_name.trim() !== '') ? organizerProfile.full_name.trim() : organizerProfile?.username || 'Unknown Organizer'
      
      // Notify the kicked player
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: participantUserId,
            type: 'kicked_from_match',
            title: 'Removed from Match',
            message: `You were removed from the match "${matchData.title}" by the organizer.`,
            match_id: matchId,
            from_user_id: organizerUserId,
            data: {
              match_title: matchData.title,
              kicker_name: organizerName,
              sport_type: matchData.sport_type,
              date: matchData.date,
              time: matchData.time,
              location: matchData.location,
              action: 'kicked',
              position: participant.position_number,
              team: participant.team_side
            }
          })
      } catch (notificationError) {
        console.error('Failed to send kick notification to kicked player:', notificationError)
      }

      // Notify all remaining participants
      if (remainingParticipants) {
        for (const remainingParticipant of remainingParticipants) {
          try {
            await supabase
              .from('notifications')
              .insert({
                user_id: remainingParticipant.user_id,
                type: 'player_removed',
                title: 'Player Removed',
                message: `${kickedPlayerName} was removed from the match "${matchData.title}" by the organizer.`,
                match_id: matchId,
                from_user_id: organizerUserId,
                data: {
                  match_title: matchData.title,
                  removed_player: kickedPlayerName,
                  kicker_name: organizerName,
                  sport_type: matchData.sport_type,
                  date: matchData.date,
                  time: matchData.time,
                  location: matchData.location,
                  action: 'kicked',
                  position: participant.position_number,
                  team: participant.team_side
                }
              })
          } catch (notificationError) {
            console.error('Failed to send notification to participant:', remainingParticipant.user_id, notificationError)
          }
        }
      }
    }

    console.log('✅ User kicked from match, real-time should trigger automatically')
    return { error: null }
  },

  updateReadyStatus: async (matchId: string, userId: string, isReady: boolean) => {
    const { data, error } = await supabase
      .from('match_participants')
      .update({ is_ready: isReady })
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .select()
      .single()

    return { data, error }
  },

  updateConfirmationStatus: async (matchId: string, userId: string, isConfirmed: boolean) => {
    const { data, error } = await supabase
      .from('match_participants')
      .update({ is_confirmed: isConfirmed })
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .select()
      .single()

    return { data, error }
  },

  startReadyCheck: async (matchId: string, deadline: string) => {
    const { data, error } = await supabase
      .from('matches')
      .update({ 
        ready_check_started: true,
        ready_check_deadline: deadline
      })
      .eq('id', matchId)
      .select()
      .single()

    if (!error) {
      try {
        const deadlineTime = new Date(deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        await chat.sendSystemMessage(matchId, `Ready check started! Please confirm your attendance by ${deadlineTime}`)
      } catch (error) {
        console.error('Failed to send ready check system message:', error)
      }
    }

    return { data, error }
  },

  deleteMatch: async (matchId: string, userId: string) => {
    console.log('🔍 Starting match deletion process:', { matchId, userId });
    
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('organizer_id, title, sport_type, date, time, location')
      .eq('id', matchId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching match:', fetchError);
      return { error: fetchError }
    }

    if (!match || match.organizer_id !== userId) {
      console.error('❌ Unauthorized deletion attempt:', { match: match?.organizer_id, userId });
      return { error: new Error('Only the match organizer can delete this match') }
    }

    console.log('✅ Authorization verified, proceeding with deletion');

    const { data: participants, error: participantsError } = await supabase
      .from('match_participants')
      .select(`
        user_id
      `)
      .eq('match_id', matchId)
    
    if (participantsError) {
      console.error('❌ Error fetching participants:', participantsError);
    }

    console.log('📋 Raw participants data:', participants);
    console.log('📋 Found participants to notify:', participants?.length || 0);
    
    const { data: simpleParticipants, error: simpleError } = await supabase
      .from('match_participants')
      .select('user_id')
      .eq('match_id', matchId)
    
    console.log('🔍 Simple participants query result:', { data: simpleParticipants, error: simpleError });

    const { data: organizer } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', userId)
      .single()

    const organizerName = (organizer?.full_name?.trim() && organizer.full_name.trim() !== '') ? organizer.full_name.trim() : organizer?.username || 'The organizer'

    if (participants && participants.length > 0) {
      const participantsToNotify = participants.filter(participant => participant.user_id !== userId);
      console.log(`🔔 Total participants found: ${participants.length}`);
      console.log(`🔔 Participants to notify (excluding organizer): ${participantsToNotify.length}`);
      console.log(`🔔 Participants list:`, participantsToNotify.map(p => ({
        user_id: p.user_id
      })));

      if (participantsToNotify.length > 0) {
        for (const participant of participantsToNotify) {
          try {
            console.log(`🔔 Attempting to send notification to user: ${participant.user_id}`);
            
            const notificationData = {
              target_user_id: participant.user_id,
              notification_type: 'match_deleted',
              notification_title: 'Match Deleted',
              notification_message: `The match "${match.title}" has been deleted by ${organizerName}.`,
              related_match_id: null,
              from_user_id: userId,
              notification_data: {
                match_title: match.title,
                organizer_name: organizerName,
                sport_type: match.sport_type,
                date: match.date,
                time: match.time,
                location: match.location,
                action: 'deleted'
              }
            };
            
            console.log(`🔔 Notification data for ${participant.user_id}:`, notificationData);
            
            const { data: notificationResult, error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: participant.user_id,
                type: 'match_deleted',
                title: 'Match Deleted',
                message: `The match "${match.title}" has been deleted by ${organizerName}.`,
                match_id: null,
                from_user_id: userId,
                data: {
                  match_title: match.title,
                  organizer_name: organizerName,
                  sport_type: match.sport_type,
                  date: match.date,
                  time: match.time,
                  location: match.location,
                  action: 'deleted'
                }
              })
              .select()
              .single();
            
            if (notifError) {
              console.error(`❌ Failed to send notification to participant ${participant.user_id}:`, notifError);
              console.error(`❌ Full error details:`, JSON.stringify(notifError, null, 2));
            } else {
              console.log(`✅ Successfully sent deletion notification to: ${participant.user_id}`);
              console.log(`✅ Notification result:`, notificationResult);
            }
          } catch (error) {
            console.error(`❌ Exception sending notification to participant ${participant.user_id}:`, error);
          }
        }
      } else {
        console.log('⚠️ No participants to notify (all were organizer or no participants found)');
      }
    } else {
      console.log('⚠️ No participants found to notify');
    }

    console.log('⏭️ Skipping chat message to avoid conflicts during deletion');

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)

    if (error) {
      console.error('❌ Failed to delete match from database:', error);
      return { error }
    }

    console.log(`🗑️ Match "${match.title}" deleted successfully`);
    return { error: null }
  },

  updateParticipantPosition: async (matchId: string, userId: string, newPosition: number, newTeam: 'A' | 'B') => {
    const { data: originalData } = await supabase
      .from('match_participants')
      .select('position_number, team_side')
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .single()

    const { data, error } = await supabase
      .from('match_participants')
      .update({ 
        position_number: newPosition,
        team_side: newTeam
      })
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .select()
      .single()

    if (!error && data) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', userId)
          .single()

        const { data: matchData } = await supabase
          .from('matches')
          .select('title')
          .eq('id', matchId)
          .single()

        const userName = (profile?.full_name?.trim() && profile.full_name.trim() !== '') ? profile.full_name.trim() : profile?.username || 'A player'
        await chat.sendSystemMessage(matchId, `${userName} moved to Team ${newTeam} Position ${newPosition}`)

        if (originalData && matchData) {
          await supabase.rpc('create_notification', {
            target_user_id: userId,
            notification_type: 'position_changed',
            notification_title: 'Position Changed',
            notification_message: `Your position in "${matchData.title}" has been updated to Team ${newTeam}, Position ${newPosition}.`,
            related_match_id: matchId,
            from_user_id: userId,
            notification_data: {
              match_title: matchData.title,
              old_position: originalData.position_number,
              old_team: originalData.team_side,
              new_position: newPosition,
              new_team: newTeam
            }
          })
        }
      } catch (error) {
        console.error('Failed to send move system message or notification:', error)
      }
    }

    return { data, error }
  },


  // Get matches (original getMatches functionality)
  getActiveMatches: async (status?: string) => {
    let query = supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: true });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: matchesData, error } = await query;
    
    if (error || !matchesData) {
      return { data: null, error };
    }

    // Enrich matches with organizer and participant data (same as existing getMatches)
    const enrichedMatches = await Promise.all(
      matchesData.map(async (match) => {
        const { data: organizer, error: organizerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', match.organizer_id)
          .single();

        const { data: participants, error: participantsError } = await supabase
          .from('match_participants')
          .select('*, profile:profiles(*)')
          .eq('match_id', match.id);

        const enrichedParticipants = (participants || []).map(participant => ({
          ...participant,
          profile: participant.profile || {}
        }));

        return {
          ...match,
          organizer: organizer || {},
          participants: enrichedParticipants,
          participant_count: enrichedParticipants.length
        };
      })
    );

    return { data: enrichedMatches, error: null };
  }
}

// Chat helper functions (keeping existing structure)
export const chat = {
  getMessages: async (matchId: string, limit: number = 50) => {
    const { data: messagesData, error } = await supabase
      .from('match_chat')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !messagesData) {
      console.error('Error getting messages:');
      return { data: null, error }
    }

    const voiceMessages = messagesData.filter(msg => msg.message_type === 'voice');
    if (voiceMessages.length > 0) {
    }

    const enrichedMessages = await Promise.all(
      messagesData.map(async (message) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', message.user_id)
          .single()
        
        return {
          ...message,
          profile
        }
      })
    )

    const chronologicalMessages = enrichedMessages.reverse();

    return { data: chronologicalMessages, error: null }
  },

  getUnreadMatchChatCount: async (userId: string) => {
    try {
      const { data: participatingMatches, error: matchError } = await supabase
        .from('match_participants')
        .select('match_id')
        .eq('user_id', userId);

      if (matchError || !participatingMatches) {
        return { data: 0, error: matchError };
      }

      const matchIds = participatingMatches.map(p => p.match_id);
      
      if (matchIds.length === 0) {
        return { data: 0, error: null };
      }

      let totalUnreadCount = 0;

      for (const matchId of matchIds) {
        const lastSeenKey = `match_chat_last_seen_${matchId}_${userId}`;
        const lastSeenTimestamp = localStorage.getItem(lastSeenKey);

        let query = supabase
          .from('match_chat')
          .select('id', { count: 'exact' })
          .eq('match_id', matchId)
          .neq('user_id', userId);

        if (lastSeenTimestamp) {
          query = query.gt('created_at', lastSeenTimestamp);
        }

        const { count, error } = await query;

        if (!error && count) {
          totalUnreadCount += count;
        }
      }

      return { data: totalUnreadCount, error: null };
    } catch (error) {
      console.error('Error getting unread match chat count:', error);
      return { data: 0, error: error as Error };
    }
  },

  markMatchChatAsRead: async (matchId: string, userId: string) => {
    try {
      const lastSeenKey = `match_chat_last_seen_${matchId}_${userId}`;
      const now = new Date().toISOString();
      localStorage.setItem(lastSeenKey, now);
      return { error: null };
    } catch (error) {
      console.error('Error marking match chat as read:', error);
      return { error: error as Error };
    }
  },

  getLastMessage: async (matchId: string) => {
    const { data: messageData, error } = await supabase
      .from('match_chat')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !messageData) {
      return { data: null, error: null };
    }

    let profile = null;
    if (messageData.message_type !== 'system' && messageData.user_id !== '00000000-0000-0000-0000-000000000000') {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', messageData.user_id)
        .single();
      
      if (profileError) {
      } else {
        profile = profileData;
      }
    }

    const enrichedMessage = {
      ...messageData,
      profile
    };

    return { data: enrichedMessage, error: null };
  },

  checkRealtimeStatus: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const testChannel = supabase.channel('test-connection');
      
      return new Promise((resolve) => {
        let resolved = false;
        
        testChannel.subscribe((status) => {
          if (!resolved) {
            resolved = true;
            testChannel.unsubscribe();
            resolve(status === 'SUBSCRIBED');
          }
        });
        
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            testChannel.unsubscribe();
            resolve(false);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('🔍 Real-time status check failed:', error);
      return false;
    }
  },

  sendMessage: async (matchId: string, userId: string, message: string, messageType: 'text' | 'system' | 'quick_action' = 'text') => {
    const { data: messageData, error } = await supabase
      .from('match_chat')
      .insert([{
        match_id: matchId,
        user_id: userId,
        message,
        message_type: messageType
      }])
      .select('*')
      .single()

    if (error || !messageData) {
      return { data: null, error }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', messageData.user_id)
      .single()

    const enrichedMessage = {
      ...messageData,
      profile
    }

    return { data: enrichedMessage, error: null }
  },

  sendVoiceMessage: async (matchId: string, userId: string, audioBlob: Blob, duration: number) => {
    try {
      const fileName = `voice_${matchId}_${userId}_${Date.now()}.webm`;
      const filePath = `voice_messages/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice_messages')
        .upload(filePath, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) {
        console.error('Voice upload error:', uploadError);
        return { data: null, error: uploadError };
      }

      const { data: { publicUrl } } = supabase.storage
        .from('voice_messages')
        .getPublicUrl(filePath);

      const messageToInsert = {
        match_id: matchId,
        user_id: userId,
        message: '🎤 Voice message',
        message_type: 'voice',
        voice_url: publicUrl,
        voice_duration: duration
      };

      const { data: messageData, error: messageError } = await supabase
        .from('match_chat')
        .insert([messageToInsert])
        .select('*')
        .single();

      if (messageError) {
        console.error('Voice message insert error:', messageError);
        return { data: null, error: messageError };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', messageData.user_id)
        .single();

      const enrichedMessage = {
        ...messageData,
        profile
      };

      return { data: enrichedMessage, error: null };

    } catch (error) {
      console.error('Voice message error:', error);
      return { data: null, error: error as Error };
    }
  },

  sendSystemMessage: async (matchId: string, message: string) => {
    const { data: messageData, error } = await supabase
      .from('match_chat')
      .insert([{
        match_id: matchId,
        user_id: '00000000-0000-0000-0000-000000000000',
        message,
        message_type: 'system'
      }])
      .select('*')
      .single()

    return { data: messageData, error }
  },

  subscribeToMessages: (matchId: string, callback: (message: MatchChatMessage) => void) => {
    const subscription = supabase
      .channel(`public:match_chat:match_id=eq.${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_chat',
          filter: `match_id=eq.${matchId}`
        },
        async (payload) => {
          try {
            const messageData = payload.new as any;
            
            let profile = null;
            if (messageData.message_type !== 'system' && messageData.user_id !== '00000000-0000-0000-0000-000000000000') {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', messageData.user_id)
                .single();
              
              if (profileError) {
                console.error('Error fetching profile:');
              } else {
                profile = profileData;
              }
            }

            const enrichedMessage: MatchChatMessage = {
              ...messageData,
              profile
            };

            callback(enrichedMessage);
          } catch (error) {
            console.error('Error processing real-time message:');
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Subscription error:');
        }
        if (status === 'SUBSCRIBED') {
        }
      });

    return subscription;
  },

  subscribeToAllMatchChats: (userId: string, callback: (message: MatchChatMessage) => void) => {
    const setupSubscription = async () => {
      const { data: participatingMatches } = await supabase
        .from('match_participants')
        .select('match_id')
        .eq('user_id', userId);

      if (!participatingMatches || participatingMatches.length === 0) {
        return null;
      }

      const matchIds = participatingMatches.map(p => p.match_id);

      const subscription = supabase
        .channel(`user_match_chats:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'match_chat',
            filter: `match_id.in.(${matchIds.join(',')})`
          },
          async (payload) => {
            try {
              const messageData = payload.new as any;
              
              if (messageData.user_id === userId) {
                return;
              }

              const isParticipating = matchIds.includes(messageData.match_id);
              if (!isParticipating) {
                return;
              }

              let profile = null;
              if (messageData.message_type !== 'system' && messageData.user_id !== '00000000-0000-0000-0000-000000000000') {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('user_id', messageData.user_id)
                  .single();
                profile = profileData;
              }

              const enrichedMessage: MatchChatMessage = {
                ...messageData,
                profile
              };

              callback(enrichedMessage);
            } catch (error) {
              console.error('Error processing real-time match chat:', error);
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error('Match chat subscription error:', err);
          }
        });

      return subscription;
    };

    return setupSubscription();
  }
}

// Real-time match updates - SIMPLIFIED TO WORK LIKE JOINING
export const realtime = {
  testConnection: async () => {
    console.log('🔍 Testing real-time connection...');
    
    return new Promise((resolve) => {
      const testChannel = supabase.channel('test-connection');
      let resolved = false;
      
      testChannel
        .on('presence', { event: 'sync' }, () => {
          console.log('🔄 Real-time presence sync');
        })
        .subscribe((status, err) => {
          console.log('🔄 Test connection status:', status);
          
          if (!resolved) {
            resolved = true;
            testChannel.unsubscribe();
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time connection working');
              resolve(true);
            } else {
              console.error('❌ Real-time connection failed:', status, err);
              resolve(false);
            }
          }
        });
      
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          testChannel.unsubscribe();
          console.error('❌ Real-time connection test timed out');
          resolve(false);
        }
      }, 5000);
    });
  },

  subscribeToMatch: (matchId: string, callback: (match: Match) => void) => {
    const subscription = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            callback(null as any);
            return;
          }
          
          try {
            const { data } = await matches.getMatch(matchId)
            if (data) {
              callback(data)
            }
          } catch (error) {
            console.error('Error fetching updated match data:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_participants',
          filter: `match_id=eq.${matchId}`
        },
        async (payload) => {
          setTimeout(async () => {
            try {
              const { data } = await matches.getMatch(matchId)
              if (data) {
                callback(data)
              }
            } catch (error) {
              console.error('Error fetching updated match data after participant change:', error);
            }
          }, 100);
        }
      )
      .subscribe()

    return subscription
  },

  subscribeToAllMatches: (callback: (action: 'update' | 'delete', matchId: string, matchData?: Match) => void) => {
    const subscription = supabase
      .channel('all-matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedMatchId = (payload.old as any)?.id;
            if (deletedMatchId) {
              callback('delete', deletedMatchId);
            }
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const matchId = (payload.new as any)?.id;
            if (matchId) {
              const { data } = await matches.getMatch(matchId);
              if (data) {
                callback('update', matchId, data);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_participants'
        },
        async (payload) => {
          const matchId = (payload.new as any || payload.old as any)?.match_id;
          if (matchId) {
            setTimeout(async () => {
              const { data } = await matches.getMatch(matchId);
              if (data) {
                callback('update', matchId, data);
              }
            }, 100);
          }
        }
      )
      .subscribe()

    return subscription
  }
}

// Storage helper functions (keeping existing)
export const storage = {
  uploadAvatar: async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (error) return { data: null, error }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return { data: { path: filePath, publicUrl }, error: null }
  },

  deleteAvatar: async (filePath: string) => {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath])
    return { error }
  }
}

// Private messages helper functions (keeping existing)
export const privateMessages = {
  getConversations: async (userId: string) => {
    console.log('🔍 DIAGNOSTIC: Starting getConversations for user:', userId);
    
    const { data: conversationsData, error } = await supabase
      .from('private_conversations')
      .select(`
        id,
        participant_one_id,
        participant_two_id,
        created_at,
        updated_at
      `)
      .or(`participant_one_id.eq.${userId},participant_two_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('🔍 DIAGNOSTIC: Error loading conversations:', error);
      return { data: null, error };
    }

    console.log('🔍 DIAGNOSTIC: Raw conversations data:', conversationsData);
    console.log('🔍 DIAGNOSTIC: Found', conversationsData?.length || 0, 'conversations');

    const enrichedConversations = await Promise.all(
      (conversationsData || []).map(async (conversation, index) => {
        const otherUserId = conversation.participant_one_id === userId 
          ? conversation.participant_two_id 
          : conversation.participant_one_id;

        console.log(`🔍 DIAGNOSTIC: Conversation ${index + 1}:`, {
          conversationId: conversation.id,
          participant_one_id: conversation.participant_one_id,
          participant_two_id: conversation.participant_two_id,
          currentUser: userId,
          otherUserId: otherUserId
        });
        
        console.log(`🔍 DIAGNOSTIC: Querying profiles table for user_id:`, otherUserId);
        
        let { data: participant, error: participantError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', otherUserId)
          .single();
        
        if (participantError) {
          console.error('❌ DIAGNOSTIC: Error loading participant:', participantError);
          console.log('🔍 DIAGNOSTIC: Attempted to find profile with user_id:', otherUserId);
          
          // Let's try to see if there are any profiles at all
          const { data: allProfiles, error: allProfilesError } = await supabase
            .from('profiles')
            .select('user_id, username, full_name')
            .limit(5);
          
          if (allProfilesError) {
            console.error('❌ DIAGNOSTIC: Error loading any profiles:', allProfilesError);
          } else {
            console.log('🔍 DIAGNOSTIC: Sample profiles in database:', allProfiles);
          }
          
          // Fallback to basic profile data
          participant = {
            id: otherUserId,
            username: 'Unknown User',
            full_name: 'Unknown User',
            bio: '',
            avatar_url: '',
            followers_count: 0,
            following_count: 0,
            matches_played: 0,
            location: '',
            favorite_sport: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          console.log('🔄 DIAGNOSTIC: Using fallback profile for user:', otherUserId);
        } else {
          console.log('✅ DIAGNOSTIC: Participant loaded successfully:', participant);
          console.log('🔍 DIAGNOSTIC: Participant username:', participant?.username);
          console.log('🔍 DIAGNOSTIC: Participant full_name:', participant?.full_name);
        }

        const { data: lastMessage } = await supabase
          .from('private_messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count: unreadCount } = await supabase
          .from('private_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('sender_id', otherUserId)
          .eq('is_read', false);

        const enrichedConversation = {
          ...conversation,
          participant,
          last_message: lastMessage,
          unread_count: unreadCount || 0
        };
        
        console.log(`🔍 DIAGNOSTIC: Final enriched conversation ${index + 1}:`, {
          id: enrichedConversation.id,
          participant: enrichedConversation.participant,
          participantUsername: enrichedConversation.participant?.username,
          participantFullName: enrichedConversation.participant?.full_name
        });
        
        return enrichedConversation;
      })
    );

    console.log('🔍 DIAGNOSTIC: All enriched conversations:', enrichedConversations);
    return { data: enrichedConversations, error: null };
  },

  getConversationMessages: async (conversationId: string, limit: number = 50) => {
    const { data: messagesData, error } = await supabase
      .from('private_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(error);
      return { data: null, error };
    }

    const enrichedMessages = await Promise.all(
      (messagesData || []).map(async (message) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', message.sender_id)
          .single();

        return {
          ...message,
          sender
        };
      })
    );

    const chronologicalMessages = enrichedMessages.reverse();

    return { data: chronologicalMessages, error: null };
  },

  sendMessage: async (recipientId: string, senderId: string, message: string, messageType: 'text' | 'voice' | 'image' = 'text') => {
    const { data: conversationId, error: convError } = await supabase
      .rpc('get_or_create_conversation', {
        user_one_id: senderId,
        user_two_id: recipientId
      });

    if (convError) {
      console.error(convError);
      return { data: null, error: convError };
    }

    const { data: messageData, error: messageError } = await supabase
      .from('private_messages')
      .insert([{
        conversation_id: conversationId,
        sender_id: senderId,
        message,
        message_type: messageType
      }])
      .select('*')
      .single();

    if (messageError) {
      console.error(messageError);
      return { data: null, error: messageError };
    }

    const { data: sender } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', messageData.sender_id)
      .single();

    const enrichedMessage = {
      ...messageData,
      sender
    };

    return { data: enrichedMessage, error: null };
  },

  markConversationAsRead: async (conversationId: string, userId: string) => {
    const { error } = await supabase
      .rpc('mark_conversation_as_read', {
        conv_id: conversationId,
        user_id: userId
      });

    if (error) {
      console.error(error);
      return { error };
    }

    return { error: null };
  },

  getUnreadCount: async (userId: string) => {
    const { data: conversations, error } = await supabase
      .from('private_conversations')
      .select(`
        id,
        participant_one_id,
        participant_two_id
      `)
      .or(`participant_one_id.eq.${userId},participant_two_id.eq.${userId}`);

    if (error) {
      console.error(error);
      return { data: 0, error };
    }

    let totalUnreadConversations = 0;

    for (const conversation of conversations || []) {
      const otherUserId = conversation.participant_one_id === userId 
        ? conversation.participant_two_id 
        : conversation.participant_one_id;

      const { count } = await supabase
        .from('private_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id)
        .eq('sender_id', otherUserId)
        .eq('is_read', false);

      if (count && count > 0) {
        totalUnreadConversations++;
      }
    }

    return { data: totalUnreadConversations, error: null };
  },

  subscribeToConversationMessages: (conversationId: string, callback: (message: PrivateMessage) => void) => {
    const subscription = supabase
      .channel(`private_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          try {
            const messageData = payload.new as any;
            
            const { data: sender } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', messageData.sender_id)
              .single();

            const enrichedMessage: PrivateMessage = {
              ...messageData,
              sender
            };

            callback(enrichedMessage);
          } catch (error) {
            console.error('Error processing real-time message:', error);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(err);
        }
        if (status === 'SUBSCRIBED') {
        }
      });

    return subscription;
  },

  subscribeToConversations: (userId: string, callback: () => void) => {
    const subscription = supabase
      .channel(`user_conversations:${userId}`)
      // Listen for INSERT events on private_messages table
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages'
        },
        async (payload) => {
          const messageData = payload.new as any;
          if (messageData?.conversation_id) {
            // Check if this message affects the current user's conversations
            const { data: conversation } = await supabase
              .from('private_conversations')
              .select('participant_one_id, participant_two_id')
              .eq('id', messageData.conversation_id)
              .single();
            
            if (conversation && 
                (conversation.participant_one_id === userId || conversation.participant_two_id === userId)) {
              callback();
            }
          }
        }
      )
      // Also listen for UPDATE events on private_conversations table for read status updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_conversations'
        },
        async (payload) => {
          const conversationData = payload.new as any;
          if (conversationData && 
              (conversationData.participant_one_id === userId || conversationData.participant_two_id === userId)) {
            callback();
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Subscription error:', err);
        }
      });

    return subscription;
  }
}

// Notification helper functions (keeping existing)
export const notifications = {
  getNotifications: async (userId: string, limit: number = 50, offset: number = 0) => {
    const { data: notificationsData, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !notificationsData) {
      return { data: null, error };
    }

    const enrichedNotifications = await Promise.all(
      notificationsData.map(async (notification) => {
        let match = null;
        let from_user = null;

        if (notification.match_id) {
          const { data: matchData } = await supabase
            .from('matches')
            .select('*')
            .eq('id', notification.match_id)
            .single();
          match = matchData;
        }

        if (notification.from_user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, username, full_name, avatar_url, bio, followers_count, following_count, matches_played, created_at, updated_at')
            .eq('id', notification.from_user_id)
            .single();
          from_user = userData;
        }

        return {
          ...notification,
          match,
          from_user
        };
      })
    );

    return { data: enrichedNotifications, error: null };
  },

  getUnreadCount: async (userId: string) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return { data: count, error };
  },

  markAsRead: async (notificationId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select()
      .single();

    return { data, error };
  },

  markMultipleAsRead: async (notificationIds: string[]) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .in('id', notificationIds)
      .select();

    return { data, error };
  },

  markAllAsRead: async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    return { data, error };
  },

  markAsSeen: async (notificationId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_seen: true })
      .eq('id', notificationId)
      .select()
      .single();

    return { data, error };
  },

  deleteNotification: async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    return { error };
  },

  deleteMultiple: async (notificationIds: string[]) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds);

    return { error };
  },

  testCreateNotification: async (userId: string) => {
    console.log('🧪 Testing notification creation for user:', userId);
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'system_announcement',
          title: 'Test Notification',
          message: 'This is a test notification to verify the system is working.',
          match_id: null,
          from_user_id: null,
          data: {
            test: true,
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();
      
      console.log('🧪 Test notification result:', { data, error });
      return { data, error };
    } catch (error) {
      console.error('🧪 Test notification failed:', error);
      return { data: null, error };
    }
  },

  createTestNotificationForCurrentUser: async () => {
    try {
      const { user } = await auth.getCurrentUser();
      if (!user) {
        console.error('No user logged in');
        return;
      }
      
      console.log('Creating test notification for current user:', user.id);
      return await notifications.testCreateNotification(user.id);
    } catch (error) {
      console.error('Error creating test notification:', error);
    }
  },

  createTestFollowNotification: async () => {
    try {
      const { user } = await auth.getCurrentUser();
      if (!user) {
        console.error('No user logged in');
        return;
      }
      
      console.log('🧪 Creating test follow notification for current user:', user.id);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'new_supporter',
          title: 'New Supporter',
          message: 'Test User started supporting you.',
          from_user_id: user.id, // Using same user for test
          data: {
            supporter_name: 'Test User',
            supporter_id: user.id
          }
        })
        .select()
        .single();
      
      console.log('🧪 Test follow notification result:', { data, error });
      return { data, error };
    } catch (error) {
      console.error('🧪 Test follow notification failed:', error);
      return { data: null, error };
    }
  },

  checkRecentNotifications: async () => {
    try {
      const { user } = await auth.getCurrentUser();
      if (!user) {
        console.error('No user logged in');
        return;
      }
      
      console.log('🔍 Checking recent notifications for user:', user.id);
      console.log('🔍 User email:', user.email);
      
      const { data: directData, error: directError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('📋 Direct DB query result:', { data: directData, error: directError });
      
      const { data, error } = await notifications.getNotifications(user.id, 10);
      
      if (error) {
        console.error('❌ Error fetching notifications via function:', error);
      } else {
        console.log('📋 Function query result:', data);
        console.log(`📊 Total notifications: ${data?.length || 0}`);
        if (data && data.length > 0) {
          data.forEach((notif, index) => {
            console.log(`${index + 1}. [${notif.type}] ${notif.title}: ${notif.message} (${notif.created_at})`);
          });
        }
      }
      
      return { data, error, directData, directError };
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  },

  clearAll: async (userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    return { error };
  },

  createNotification: async (notification: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    match_id?: string;
    from_user_id?: string;
    data?: any;
  }) => {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();

    return { data, error };
  },

  getNotificationsByType: async (userId: string, type: string, limit: number = 20) => {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        match:matches(*),
        from_user:users!from_user_id(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  },

  getMatchNotifications: async (userId: string, matchId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        match:matches(*),
        from_user:users!from_user_id(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  subscribeToNotifications: (userId: string, callback: (notification: Notification) => void) => {
    const channelName = `notifications:user:${userId}`;
    
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          try {
            const notificationData = payload.new as any;
            
            if (notificationData.user_id !== userId) {
              return;
            }
            
            let match = null;
            let from_user = null;
            
            if (notificationData.match_id) {
              const { data: matchData } = await supabase
                .from('matches')
                .select('*')
                .eq('id', notificationData.match_id)
                .single();
              match = matchData;
            }
            
            if (notificationData.from_user_id) {
              const { data: userData } = await supabase
                .from('users')
                .select('id, username, full_name, avatar_url, bio, followers_count, following_count, matches_played, created_at, updated_at')
                .eq('id', notificationData.from_user_id)
                .single();
              from_user = userData;
            }

            const enrichedNotification: Notification = {
              ...notificationData,
              match,
              from_user
            };

            callback(enrichedNotification);
            
          } catch (error) {
            console.error('Error processing real-time notification:', error);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Notification subscription error:', err);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Channel error - real-time may not be working');
        }
        if (status === 'TIMED_OUT') {
          console.error('Subscription timed out');
        }
        if (status === 'CLOSED') {
          console.warn('Notification subscription closed');
        }
      });

    return subscription;
  },

  // Subscribe to follower count updates for a specific user
  subscribeToFollowerUpdates: (userId: string, callback: (followers_count: number, following_count: number) => void) => {
    const channelName = `user_follower_updates:${userId}`;
    
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          try {
            const userData = payload.new as any;
            if (userData && userData.id === userId) {
              callback(userData.followers_count || 0, userData.following_count || 0);
            }
          } catch (error) {
            console.error('Error processing real-time follower update:', error);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Follower update subscription error:', err);
        }
      });

    return subscription;
  }
}

export const posts = {
  // Get posts for a specific user (excluding recruitment posts)
  getUserPosts: async (userId: string) => {
    console.log('Loading user posts for:', userId);
    
    // Always use direct query to ensure recruitment filter works
    const { data, error } = await supabase
      .from('user_posts')
      .select(`
        id,
        user_id,
        image_url,
        caption,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // Filter out recruitment posts in JavaScript to handle null/empty captions properly
    let filteredData = data;
    if (data) {
      filteredData = data.filter(post => {
        const caption = post.caption || '';
        const isRecruitmentPost = caption.startsWith('RECRUITMENT_POST:');
        console.log('Post caption:', caption, 'Is recruitment?', isRecruitmentPost);
        return !isRecruitmentPost;
      });
      console.log('Filtered out recruitment posts. Original:', data.length, 'Filtered:', filteredData.length);
    }
    
    console.log('Profile posts result (should exclude recruitment):', { data: filteredData, error });
    console.log('Number of posts found:', filteredData?.length);
    
    if (filteredData) {
      console.log('Posts captions:', filteredData.map(p => p.caption));
    }
    
    if (error) {
      console.error('Error fetching user posts:', error);
      return { data: null, error };
    }
    
    return { data: filteredData, error: null };
  },

  // Create a new post
  createPost: async (imageUrl: string, caption?: string) => {
    try {
      const { data, error } = await supabase
        .rpc('create_user_post', { 
          p_image_url: imageUrl,
          p_caption: caption || null
        });
      
      if (error) {
        console.error('Error creating post:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error creating post:', error);
      return { data: null, error };
    }
  },

  // Delete a post
  deletePost: async (postId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('delete_user_post', { post_id: postId });
      
      if (error) {
        console.error('Error deleting post:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error deleting post:', error);
      return { data: null, error };
    }
  },

  // Upload image to storage
  uploadImage: async (file: File, userId: string) => {
    try {
      console.log('📸 Starting image upload:', { fileName: file.name, fileSize: file.size, userId });
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        console.error('❌ File too large:', file.size);
        return { data: null, error: { message: 'File size must be less than 10MB' } };
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('❌ Invalid file type:', file.type);
        return { data: null, error: { message: 'File must be an image' } };
      }
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      console.log('📁 Upload path:', fileName);
      
      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from('user-posts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('❌ Storage upload error:', error);
        return { data: null, error: { message: `Upload failed: ${error.message}` } };
      }
      
      console.log('✅ Upload successful:', data);
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-posts')
        .getPublicUrl(fileName);
      
      console.log('🔗 Public URL:', publicUrl);
      
      return { data: { path: fileName, publicUrl }, error: null };
    } catch (error) {
      console.error('❌ Upload exception:', error);
      return { data: null, error: { message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` } };
    }
  },

  // Subscribe to user posts updates
  subscribeToUserPosts: (userId: string, callback: (posts: UserPost[]) => void) => {
    const channelName = `user_posts:${userId}`;
    
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_posts',
          filter: `user_id=eq.${userId}`
        },
        async () => {
          // Fetch updated posts
          const { data } = await posts.getUserPosts(userId);
          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();

    return subscription;
  }
}

// Make test functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testNotifications = {
    createForCurrentUser: notifications.createTestNotificationForCurrentUser,
    create: notifications.testCreateNotification,
    createFollowNotification: notifications.createTestFollowNotification,
    checkRecent: notifications.checkRecentNotifications
  };
  
  (window as any).testRealtime = {
    testConnection: realtime.testConnection,
    supabaseClient: supabase,
    refreshMatch: async (matchId: string) => {
      try {
        const { data } = await matches.getMatch(matchId);
        console.log('🔄 Manual refresh result:', data);
        return data;
      } catch (error) {
        console.error('❌ Manual refresh error:', error);
        return null;
      }
    }
  };

  (window as any).testFollow = {
    followUser: profiles.followUser,
    unfollowUser: profiles.unfollowUser,
    removeFollower: profiles.removeFollower,
    isFollowing: profiles.isFollowing,
    getFollowers: profiles.getFollowers,
    getFollowing: profiles.getFollowing,
    testFollow: async (targetUserId: string) => {
      console.log('🧪 Testing follow for user:', targetUserId);
      const result = await profiles.followUser(targetUserId);
      console.log('🧪 Test follow result:', result);
      return result;
    },
    testRemoveFollower: async (followerUserId: string) => {
      console.log('🧪 Testing remove follower for user:', followerUserId);
      const result = await profiles.removeFollower(followerUserId);
      console.log('🧪 Test remove follower result:', result);
      return result;
    }
  };

  (window as any).testDatabase = {
    testNotificationPermissions: async () => {
      console.log('🧪 Testing notification permissions...');
      const { data, error } = await supabase.rpc('test_notification_creation');
      console.log('🧪 Notification permissions test result:', { data, error });
      return { data, error };
    },
    testDirectNotificationInsert: async () => {
      console.log('🧪 Testing direct notification insert...');
      const { user } = await auth.getCurrentUser();
      if (!user) {
        console.error('No user logged in');
        return;
      }
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'test',
          title: 'Test Direct Insert',
          message: 'This is a direct insert test.',
          from_user_id: user.id,
          data: { test: true }
        })
        .select()
        .single();
      
      console.log('🧪 Direct insert result:', { data, error });
      return { data, error };
    }
  };
}