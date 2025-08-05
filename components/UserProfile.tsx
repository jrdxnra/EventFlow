'use client';

import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, Users, UserCheck, RefreshCw, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

import { auth } from '@/lib/firebase';
import { initializeUserSession, UserProfile as UserProfileType } from '@/lib/firebase-users';

import UserPreferences from './UserPreferences';

interface UserProfileProps {
  onUserChange?: (user: FirebaseUser | null) => void;
  onTeamModeChange?: (isTeamMode: boolean) => void;
  onUserProfileChange?: (profile: UserProfileType | null) => void;
}

export default function UserProfile({ onUserChange, onTeamModeChange, onUserProfileChange }: UserProfileProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isTeamMode, setIsTeamMode] = useState(true); // Default to team mode
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showUserPreferences, setShowUserPreferences] = useState(false);
  
  // Cache for user profile data
  const profileCacheRef = useRef<{
    [uid: string]: { profile: UserProfileType; timestamp: number };
  }>({});
  
  // Ref for dropdown to handle outside clicks
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Check cache first
          const cacheKey = user.uid;
          const now = Date.now();
          const cacheTimeout = process.env.NODE_ENV === 'development' ? 300000 : 600000; // 5 min dev, 10 min prod
          
          if (profileCacheRef.current[cacheKey] && 
              (now - profileCacheRef.current[cacheKey].timestamp) < cacheTimeout) {
            console.log('Using cached user profile');
            const cachedProfile = profileCacheRef.current[cacheKey].profile;
            setUserProfile(cachedProfile);
            onUserProfileChange?.(cachedProfile);
          } else {
            // Initialize user session and get profile
            const profile = await initializeUserSession(user);
            
            // Cache the profile
            profileCacheRef.current[cacheKey] = {
              profile,
              timestamp: now,
            };
            
            setUserProfile(profile);
            onUserProfileChange?.(profile);
          }
        } catch (error) {
          console.error('Error initializing user session:', error);
          // Don't show error for permission issues during initial setup
          if (error instanceof Error && error.message.includes('permissions')) {
            console.log('Permission error during initial setup - this is expected for new users');
          } else {
            setAuthError('Failed to load user profile');
          }
        }
      } else {
        setUserProfile(null);
        onUserProfileChange?.(null);
      }
      
      setIsLoading(false);
      setAuthError(null);
      onUserChange?.(user);
    });

    return () => unsubscribe();
  }, [onUserChange]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Auto-refresh auth if user is logged in but missing photoURL
  useEffect(() => {
    if (user && !user.photoURL && !isLoading) {
      console.log('User missing photoURL, auto-refreshing auth...');
      refreshAuth();
    }
  }, [user, isLoading]);

  // Auto-retry authentication on errors
  useEffect(() => {
    if (authError && !isLoading && !isSigningIn) {
      console.log('Auth error detected, auto-retrying...');
      const retryTimer = setTimeout(() => {
        setAuthError(null);
        if (!user) {
          signInWithGoogle();
        } else {
          refreshAuth();
        }
      }, 2000); // Wait 2 seconds before retrying

      return () => clearTimeout(retryTimer);
    }
    return undefined;
  }, [authError, isLoading, isSigningIn, user]);

  // Monitor auth token and auto-refresh when needed
  useEffect(() => {
    if (!user) return;

    const checkTokenExpiry = async () => {
      try {
        const token = await user.getIdToken(true); // Force refresh
        if (!token) {
          console.log('Token expired, auto-refreshing...');
          refreshAuth();
        }
      } catch (error) {
        console.log('Token refresh failed, auto-retrying auth...');
        refreshAuth();
      }
    };

    // Check token every 5 minutes
    const tokenCheckInterval = setInterval(checkTokenExpiry, 5 * 60 * 1000);
    
    return () => clearInterval(tokenCheckInterval);
  }, [user]);

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setAuthError(error.message || 'Failed to sign in');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthError('Failed to sign out');
    }
  };

  const toggleTeamMode = () => {
    const newMode = !isTeamMode;
    setIsTeamMode(newMode);
    onTeamModeChange?.(newMode);
    setIsDropdownOpen(false);
  };

  const refreshAuth = async (): Promise<void> => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // Clear the profile cache to force a fresh fetch
      if (user?.uid) {
        delete profileCacheRef.current[user.uid];
      }
      
      // Force a refresh of the auth state
      await auth.currentUser?.reload();
    } catch (error: any) {
      console.error('Auth refresh error:', error);
      setAuthError('Failed to refresh authentication');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to invalidate profile cache (commented out for now)
  // const invalidateProfileCache = () => {
  //   if (user?.uid) {
  //     delete profileCacheRef.current[user.uid];
  //     console.log('Profile cache invalidated');
  //   }
  // };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={signInWithGoogle}
          disabled={isSigningIn}
          className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSigningIn ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <User className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {isSigningIn ? 'Signing in...' : 'Sign In'}
          </span>
        </button>
        
        {authError && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-yellow-50 border border-yellow-200 rounded-lg p-2 shadow-lg z-50">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-3 w-3 text-yellow-600 animate-spin" />
              <span className="text-xs text-yellow-700">Auto-retrying...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show user profile even if userProfile is null (fallback to basic user info)
  const displayName = userProfile?.displayName || user.displayName || user.email || 'User';
  const userRole = userProfile?.role || 'member';
  const isTeamMember = userProfile?.teamId ? 'Team Member' : 'Individual';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
        title="User profile"
      >
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              className="w-8 h-8 rounded-full"
              onError={(e) => {
                console.log('Image failed to load, falling back to icon');
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <User className={`h-4 w-4 text-primary-600 ${user.photoURL ? 'hidden' : ''}`} />
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {user.displayName || user.email}
        </span>
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          >
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <User className="h-5 w-5 text-primary-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {displayName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {user.email}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {userRole} • {isTeamMember}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={toggleTeamMode}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                {isTeamMode ? (
                  <>
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    <span>Switch to Individual Mode</span>
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 text-green-600" />
                    <span>Switch to Team Mode</span>
                  </>
                )}
              </button>

              <div className="mt-2 px-3 py-2 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600">
                  Current Mode: <span className="font-medium">
                    {isTeamMode ? 'Team' : 'Individual'}
                  </span>
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 p-2">
              <Link
                href="/config"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Wrench className="h-4 w-4" />
                <span>Team Configuration</span>
              </Link>
              
              <button
                onClick={() => {
                  setShowUserPreferences(true);
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>User Preferences</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>


          </motion.div>
        )}
      </AnimatePresence>
      
      {/* User Preferences Modal */}
      <UserPreferences 
        isOpen={showUserPreferences}
        onClose={() => setShowUserPreferences(false)}
      />
    </div>
  );
} 