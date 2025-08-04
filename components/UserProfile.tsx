'use client';

import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, Users, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

import { auth } from '@/lib/firebase';
import { initializeUserSession, getUserProfile, UserProfile as UserProfileType } from '@/lib/firebase-users';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Initialize user session and get profile
          const profile = await initializeUserSession(user);
          setUserProfile(profile);
          onUserProfileChange?.(profile);
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

  const refreshAuth = async () => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // Force a refresh of the auth state
      await auth.currentUser?.reload();
    } catch (error: any) {
      console.error('Auth refresh error:', error);
      setAuthError('Failed to refresh authentication');
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="absolute top-full right-0 mt-2 w-64 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg z-50">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-800 font-medium">Authentication Error</p>
                <p className="text-xs text-red-600 mt-1">{authError}</p>
                <button
                  onClick={signInWithGoogle}
                  className="text-xs text-red-600 hover:text-red-800 underline mt-2"
                >
                  Try again
                </button>
              </div>
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
    <div className="relative">
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
            />
          ) : (
            <User className="h-4 w-4 text-primary-600" />
          )}
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
                onClick={refreshAuth}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Authentication</span>
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>

            {authError && (
              <div className="border-t border-gray-100 p-3 bg-red-50">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-red-800 font-medium">Authentication Error</p>
                    <p className="text-xs text-red-600 mt-1">{authError}</p>
                  </div>
                </div>
              </div>
            )}
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