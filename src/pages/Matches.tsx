import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Plus, Trophy, Calendar, MapPin, Users, Database, TestTube, Filter, X, ChevronDown, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, matches, Match, MatchParticipant, realtime } from '../lib/supabase';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EnhancedMatchCard from '../components/matches/EnhancedMatchCard';
import MatchDetailModal from '../components/matches/MatchDetailModal';
import FloatingChat from '../components/matches/FloatingChat';
import MatchCardSkeleton from '../components/ui/MatchCardSkeleton';
import mockMatches from '../data/mockMatchData';
import { useCityContext } from '../context/CityContext';
import { cities, popularCities, allCities } from '../data/cities';

const Matches: React.FC = memo(() => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [matchesList, setMatchesList] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [useMockData, setUseMockData] = useState(false); // Toggle for testing - using real database
  
  // Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [chatMatch, setChatMatch] = useState<Match | null>(null);
  
  // New filter states
  const [showFilters, setShowFilters] = useState(false);
  const [sportFilter, setSportFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // City selection states - using context now
  const { selectedCity, setSelectedCity } = useCityContext();
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [locationDetected, setLocationDetected] = useState(false);
  
  // Track matches being deleted for animation
  const [deletingMatches, setDeletingMatches] = useState<Set<string>>(new Set());
  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => [
    { id: 'all', label: 'All', icon: Trophy },
    { id: 'my-matches', label: 'Mine', icon: Users },
    { id: 'completed', label: 'Completed', icon: Trophy }
  ], []);

  const sportTypes = useMemo(() => ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Baseball', 'Hockey', 'Golf', 'Swimming', 'Boxing', 'Footing', 'Padel'], []);

  // Utility function to check if a match is expired
  const isMatchExpired = useCallback((match: Match) => {
    try {
      const matchDateTime = new Date(`${match.date} ${match.time}`);
      const now = new Date();
      return matchDateTime < now && match.status === 'upcoming';
    } catch (error) {
      return false;
    }
  }, []);

  useEffect(() => {
    loadMatches();
    loadCurrentUser();
  }, [activeFilter, useMockData, sportFilter, dateFilter, selectedCity]);

  // Handle refresh parameter from match creation - placed after loadMatches definition
  const refreshParam = searchParams.get('refresh');

  // Handle URL parameter for opening specific match
  useEffect(() => {
    const matchId = searchParams.get('match');
    if (matchId && matchesList.length > 0) {
      const match = matchesList.find(m => m.id === matchId);
      if (match) {
        setSelectedMatch(match);
        // Remove the parameter from URL to clean it up
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('match');
        setSearchParams(newSearchParams);
      }
    }
  }, [searchParams, matchesList]);

  // Handle opening match details from notification click
  useEffect(() => {
    const matchIdToOpen = localStorage.getItem('openMatchDetails');
    
    if (matchIdToOpen && matchesList.length > 0 && !loading) {
      const match = matchesList.find(m => m.id === matchIdToOpen);
      if (match) {
        setSelectedMatch(match);
        // Clean up localStorage
        localStorage.removeItem('openMatchDetails');
      } else {
        // If match not found, clean up localStorage anyway
        localStorage.removeItem('openMatchDetails');
      }
    }
  }, [matchesList, loading]);

  useEffect(() => {
    // Subscribe to real-time match changes (only when using real data)
    if (!useMockData) {
      const subscription = realtime.subscribeToAllMatches((action, matchId, matchData) => {
        
        if (action === 'delete') {
          // Add fade-out animation first
          setDeletingMatches(prev => new Set(prev).add(matchId));
          
          // Remove after animation completes
          setTimeout(() => {
            setMatchesList(prevMatches => {
              const updatedMatches = prevMatches.filter(match => match.id !== matchId);
              console.log('🗑️ Removed deleted match from UI:', matchId);
              return updatedMatches;
            });
            setDeletingMatches(prev => {
              const newSet = new Set(prev);
              newSet.delete(matchId);
              return newSet;
            });
          }, 500); // Match the fade-out animation duration
        } else if (action === 'update' && matchData) {
          // Update or add the match
          setMatchesList(prevMatches => {
            const existingIndex = prevMatches.findIndex(match => match.id === matchId);
            if (existingIndex >= 0) {
              // Update existing match
              const updatedMatches = [...prevMatches];
              updatedMatches[existingIndex] = matchData;
              return updatedMatches;
            } else {
              // Add new match (if it fits current filters)
              return [matchData, ...prevMatches];
            }
          });
        }
      });

      // Real-time updates are handled by the subscription above

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [useMockData]);


  const loadCurrentUser = useCallback(async () => {
    try {
      if (useMockData) {
        // Use mock current user for testing
        setCurrentUser({
          id: '1',
          email: 'test@example.com',
          full_name: 'Test User'
        });
      } else {
        const { user } = await auth.getCurrentUser();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }, [useMockData]);

  const loadCompletedMatches = useCallback(async () => {
    try {
      if (!currentUser) {
        setMatchesList([]);
        return;
      }
      
      // Load all matches from database
      const { data, error } = await matches.getMatches();
      
      if (error) {
        throw error;
      }
      
      // Find expired matches where user was involved
      const allMatches = data || [];
      const expiredMatches = allMatches.filter(isMatchExpired);
      
      // Filter to show only matches where current user was organizer or participant
      const userCompletedMatches = expiredMatches.filter(match => {
        const isOrganizer = match.organizer_id === currentUser.id;
        const isParticipant = match.participants?.some((p: MatchParticipant) => p.user_id === currentUser.id);
        return isOrganizer || isParticipant;
      });
      
      // Set only the user's completed matches
      setMatchesList(userCompletedMatches);
      
    } catch (error) {
      console.error('Error loading completed matches:', error);
      setMatchesList([]);
    } finally {
      setLoading(false);
    }
  }, [isMatchExpired, currentUser]);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      
      // Handle completed matches separately - independent from main matches
      if (activeFilter === 'completed') {
        await loadCompletedMatches();
        return;
      }
      
      if (useMockData) {
        // Use mock data for testing
        let filteredMockMatches = mockMatches;
        
        // Filter by status/tab
        if (activeFilter === 'my-matches') {
          // Show only matches the user created or joined (regardless of city)
          filteredMockMatches = mockMatches.filter(match => 
            (match.organizer_id === currentUser?.id || 
             match.participants?.some((p: MatchParticipant) => p.user_id === currentUser?.id)) &&
            (match.status === 'upcoming' || match.status === 'live')
          );
        } else {
          // For non-my-matches, apply normal filters
          if (activeFilter !== 'all') {
            filteredMockMatches = mockMatches.filter(match => match.status === activeFilter);
          }
          
          // Apply city filter only for non-my-matches filters
          if (selectedCity) {
            filteredMockMatches = filteredMockMatches.filter(match => {
              // For demo purposes, assign cities to matches based on match ID
              const matchCities = {
                '1': 'Casablanca',
                '2': 'Casablanca', 
                '3': 'Rabat',
                '4': 'Marrakech',
                '5': 'Casablanca',
                '6': 'Fès',
                '7': 'Tangier',
                '8': 'Agadir'
              };
              return matchCities[match.id as keyof typeof matchCities] === selectedCity;
            });
          }
        }
        
        // Apply sport filter
        if (sportFilter) {
          filteredMockMatches = filteredMockMatches.filter(match => 
            match.sport_type === sportFilter
          );
        }
        
        // Apply date filter
        if (dateFilter) {
          filteredMockMatches = filteredMockMatches.filter(match => 
            match.date === dateFilter
          );
        }
        
        setMatchesList(filteredMockMatches);
      } else {
        // Use real database data
        console.log('🔍 Loading matches from database...');
        const filterStatus = activeFilter === 'all' || activeFilter === 'my-matches' ? undefined : activeFilter;
        const { data, error } = await matches.getMatches(filterStatus);
        
        console.log('📊 Database response:', { data, error });
        console.log('📈 Number of matches found:', data?.length || 0);
        
        if (error) {
          console.error('❌ Error loading matches:', error);
          throw error;
        }
        
        let filteredMatches = data || [];
        console.log('🔍 Total matches from database:', filteredMatches.length);
        
        // EXCLUDE expired matches from ALL main feeds (All, Mine)
        const activeMatches = filteredMatches.filter(match => !isMatchExpired(match));
        const expiredCount = filteredMatches.length - activeMatches.length;
        
        console.log('📊 Active matches:', activeMatches.length, '| Expired matches excluded:', expiredCount);
        
        // Use only active matches for main feeds
        filteredMatches = activeMatches;
        
        // Filter for my matches (only from active matches since we already filtered expired ones)
        if (activeFilter === 'my-matches' && currentUser) {
          filteredMatches = filteredMatches.filter(match => 
            match.organizer_id === currentUser.id || 
            match.participants?.some((p: MatchParticipant) => p.user_id === currentUser.id)
          );
        } else {
          // Apply city filter only for non-my-matches filters
          if (selectedCity) {
            filteredMatches = filteredMatches.filter(match => {
              // Extract city from location string
              return match.location.toLowerCase().includes(selectedCity.toLowerCase());
            });
          }
        }
        
        // Apply sport filter
        if (sportFilter) {
          filteredMatches = filteredMatches.filter(match => 
            match.sport_type === sportFilter
          );
        }
        
        // Apply date filter
        if (dateFilter) {
          filteredMatches = filteredMatches.filter(match => 
            match.date === dateFilter
          );
        }
        
        console.log('🏁 Final filtered matches:', filteredMatches.length);
        console.log('📋 Final matches list:', filteredMatches);
        
        setMatchesList(filteredMatches);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, useMockData, sportFilter, dateFilter, selectedCity, currentUser?.id]);

  // Handle refresh parameter from match creation
  useEffect(() => {
    if (refreshParam) {
      console.log('🔄 Refreshing matches after creation...');
      // Force reload matches
      loadMatches();
      // Clean up the refresh parameter
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('refresh');
      setSearchParams(newSearchParams);
    }
  }, [refreshParam, loadMatches, searchParams, setSearchParams]);

  const handleChatOpen = useCallback((matchId: string) => {
    const match = matchesList.find(m => m.id === matchId);
    if (match) {
      setChatMatchId(matchId);
      setChatMatch(match);
      setChatOpen(true);
    }
  }, [matchesList]);

  const handleChatClose = useCallback(() => {
    setChatOpen(false);
    setChatMatchId(null);
    setChatMatch(null);
  }, []);

  const filteredMatches = useMemo(() => matchesList, [matchesList]);

  // Remove the old renderMatchCard function as we're using EnhancedMatchCard component

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-center">
        <Button 
          onClick={() => navigate('/create-match')}
          className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-primary-orange to-orange-600 hover:from-orange-600 hover:to-primary-orange text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <Plus size={20} />
          <span className="text-lg">Create Match</span>
        </Button>
      </div>

      {/* Tab Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-200 ${
                activeFilter === filter.id
                  ? 'bg-primary-orange text-white'
                  : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
              }`}
            >
              <filter.icon size={16} />
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Additional Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* City Selector */}
            <button
              onClick={() => setShowCityModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 text-white/80 hover:bg-white/20 rounded-lg transition-all duration-200 border border-white/20"
            >
              <MapPin size={16} className="text-primary-orange" />
              <span className="font-medium">{selectedCity}</span>
              <ChevronDown size={16} className="text-white/60" />
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 text-white/80 hover:bg-white/20 rounded-lg transition-all duration-200"
            >
              <Filter size={16} />
              <span>Filters</span>
              {(sportFilter || dateFilter) && (
                <div className="w-2 h-2 bg-primary-orange rounded-full"></div>
              )}
            </button>
          </div>

          {(sportFilter || dateFilter) && (
            <button
              onClick={() => {
                setSportFilter('');
                setDateFilter('');
              }}
              className="flex items-center space-x-2 px-3 py-1 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200 text-sm"
            >
              <X size={14} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* Filter Options */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Sport Type
                </label>
                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent"
                >
                  <option value="">All Sports</option>
                  {sportTypes.map((sport) => (
                    <option key={sport} value={sport} className="bg-background-dark text-white">
                      {sport}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent"
                />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Matches List or History */}
      <div>
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <MatchCardSkeleton key={index} />
            ))}
          </div>
        ) : filteredMatches.length > 0 ? (
          // Show Active Matches
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className={`${deletingMatches.has(match.id) ? 'animate-fade-out pointer-events-none' : ''}`}
              >
                <EnhancedMatchCard
                  match={match}
                  currentUser={currentUser}
                  onClick={() => setSelectedMatch(match)}
                  onMatchDeleted={loadMatches}
                />
              </div>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <div className="text-white/60">
              <Trophy size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No matches found</p>
              <p className="text-sm mt-2">
                {activeFilter === 'all' 
                  ? `No matches found in ${selectedCity}. Try selecting a different city or create a match!`
                  : activeFilter === 'my-matches'
                  ? `You haven't joined any upcoming matches in ${selectedCity}. Try selecting a different city or browse more matches!`
                  : `No ${activeFilter} matches available in ${selectedCity}. Try selecting a different city!`}
              </p>
              <Button 
                onClick={() => navigate('/create-match')}
                className="mt-4"
              >
                <Plus size={16} className="mr-2" />
                Create Match
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && currentUser && (
        <MatchDetailModal
          match={selectedMatch}
          currentUser={currentUser}
          onClose={() => setSelectedMatch(null)}
          onMatchDeleted={() => {
            loadMatches();
            setSelectedMatch(null);
          }}
          onChatOpen={handleChatOpen}
        />
      )}

      {/* Floating Chat */}
      {chatOpen && chatMatchId && chatMatch && currentUser && (
        <FloatingChat
          matchId={chatMatchId}
          currentUser={currentUser}
          participants={chatMatch.participants || []}
          matchTitle={chatMatch.title}
          isOpen={chatOpen}
          onClose={handleChatClose}
        />
      )}

      {/* City Selection Modal */}
      {showCityModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-background-dark/95 backdrop-blur-lg border border-white/20 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <h2 className="text-xl font-bold text-white">Select City</h2>
              <button
                onClick={() => {
                  setShowCityModal(false);
                  setCitySearch('');
                }}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-white/20">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
                <input
                  type="text"
                  placeholder="Search cities..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent"
                />
              </div>
            </div>

            {/* City Lists */}
            <div className="p-4 overflow-y-auto max-h-96">
              {/* Popular Cities */}
              {!citySearch && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">
                    Popular Cities
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {popularCities.map((city) => (
                      <button
                        key={city}
                        onClick={() => {
                          setSelectedCity(city);
                          setShowCityModal(false);
                          setCitySearch('');
                        }}
                        className={`p-3 rounded-lg text-left transition-all duration-200 ${
                          selectedCity === city
                            ? 'bg-primary-orange text-white'
                            : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="font-medium">{city}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Cities / Search Results */}
              <div>
                <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">
                  {citySearch ? 'Search Results' : 'All Cities'}
                </h3>
                <div className="space-y-1">
                  {allCities
                    .filter(city => 
                      !citySearch || city.toLowerCase().includes(citySearch.toLowerCase())
                    )
                    .map((city) => (
                      <button
                        key={city}
                        onClick={() => {
                          setSelectedCity(city);
                          setShowCityModal(false);
                          setCitySearch('');
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                          selectedCity === city
                            ? 'bg-primary-orange text-white'
                            : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="font-medium">{city}</span>
                      </button>
                    ))}
                </div>
                {citySearch && allCities.filter(city => 
                  city.toLowerCase().includes(citySearch.toLowerCase())
                ).length === 0 && (
                  <p className="text-white/60 text-center py-4">
                    No cities found matching "{citySearch}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Matches; 