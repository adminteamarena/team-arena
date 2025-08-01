import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { profiles, UserProfile } from '../lib/supabase';

// Cache for search results
const searchCache = new Map<string, UserProfile[]>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

// Simple skeleton loader component
const UserSkeleton: React.FC = () => (
  <div className="flex items-center space-x-3 p-4 animate-pulse">
    <div className="w-10 h-10 rounded-full bg-white/20 flex-shrink-0"></div>
    <div className="flex-1 min-w-0">
      <div className="h-4 bg-white/20 rounded mb-2"></div>
      <div className="h-3 bg-white/15 rounded w-3/4"></div>
    </div>
    <div className="text-right flex-shrink-0">
      <div className="h-3 bg-white/15 rounded w-16"></div>
    </div>
  </div>
);

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [dropdownResults, setDropdownResults] = useState<UserProfile[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.trim()) {
      setIsLoading(true);
      setShowDropdown(true);
      
      debounceRef.current = setTimeout(() => {
        performDropdownSearch();
      }, 300);
    } else {
      setDropdownResults([]);
      setIsLoading(false);
      setShowDropdown(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const performDropdownSearch = useCallback(async () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setDropdownResults([]);
      setIsLoading(false);
      setShowDropdown(false);
      return;
    }

    // Check cache first
    const now = Date.now();
    const cacheKey = query;
    const cachedResult = searchCache.get(cacheKey);
    const cacheTime = cacheTimestamps.get(cacheKey);

    if (cachedResult && cacheTime && (now - cacheTime) < CACHE_DURATION) {
      setDropdownResults(cachedResult);
      setIsLoading(false);
      setShowDropdown(true);
      setSelectedIndex(-1);
      return;
    }

    try {
      const { data, error } = await profiles.searchProfiles(query, 8);
      if (error) throw error;
      
      const results = data || [];
      
      // Cache the results
      searchCache.set(cacheKey, results);
      cacheTimestamps.set(cacheKey, now);
      
      // Clean old cache entries
      if (searchCache.size > 50) {
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
        cacheTimestamps.delete(oldestKey);
      }

      setDropdownResults(results);
      setIsLoading(false);
      setShowDropdown(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error performing dropdown search:', error);
      setDropdownResults([]);
      setIsLoading(false);
      setShowDropdown(false);
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (value) {
      setSearchParams({ q: value });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || (dropdownResults.length === 0 && !isLoading)) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isLoading && dropdownResults.length > 0) {
          setSelectedIndex(prev => 
            prev < dropdownResults.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isLoading && dropdownResults.length > 0) {
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : dropdownResults.length - 1
          );
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (!isLoading && selectedIndex >= 0 && selectedIndex < dropdownResults.length) {
          handleUserSelect(dropdownResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showDropdown, dropdownResults, isLoading, selectedIndex]);

  const handleUserSelect = useCallback((user: UserProfile) => {
    setShowDropdown(false);
    setSelectedIndex(-1);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    navigate(`/profile/${user.id}`);
  }, [navigate]);

  const handleFocus = useCallback(() => {
    if (searchQuery) {
      setShowDropdown(true);
    }
  }, [searchQuery]);

  // Memoize skeleton loaders array
  const skeletonLoaders = useMemo(() => 
    Array.from({ length: 5 }, (_, i) => <UserSkeleton key={`skeleton-${i}`} />), 
    []
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple Title */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-white mb-2">Search</h1>
        <p className="text-white/60 text-lg">Find and connect with other users</p>
      </div>

      {/* Simple Search Input */}
      <div className="flex-1 flex flex-col justify-start px-4">
        <div className="max-w-2xl mx-auto w-full">
          <div className="relative" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 z-10" size={20} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search users by name or username..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-primary-orange focus:border-transparent"
          />
          
          {/* Simple Dropdown */}
          {showDropdown && (isLoading || dropdownResults.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-lg max-h-[70vh] overflow-y-auto z-[9999]">
              {isLoading ? (
                skeletonLoaders
              ) : dropdownResults.length > 0 ? (
                dropdownResults.map((user, index) => (
                  <div
                    key={user.id}
                    className={`flex items-center space-x-3 p-4 cursor-pointer transition-colors ${
                      index === selectedIndex 
                        ? 'bg-primary-orange' 
                        : 'hover:bg-white/10'
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-orange to-primary-pink flex items-center justify-center flex-shrink-0">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || user.username || 'User avatar'}
                          className="w-full h-full rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-white font-bold text-sm">
                          {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {user.full_name || user.username || 'Unknown User'}
                      </p>
                      <p className="text-white/60 text-sm truncate">
                        @{user.username || 'unknown'}
                      </p>
                      {user.bio && (
                        <p className="text-white/50 text-xs mt-1 truncate">{user.bio}</p>
                      )}
                    </div>
                    <div className="text-right text-white/60 text-sm">
                      <p>{user.followers_count} supporters</p>
                      <p className="text-xs">{user.matches_played} matches</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-white/60">
                  <Search size={24} className="mx-auto mb-2 opacity-50" />
                  <p>No users found</p>
                  <p className="text-sm mt-1">Try different keywords</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;