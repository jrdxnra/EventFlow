'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Bell, Calendar, Monitor } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { auth } from '@/lib/firebase';
import { saveUserPreferences, getUserProfile, updateUserProfile } from '@/lib/firebase-users';

interface UserPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserPreferences({ isOpen, onClose }: UserPreferencesProps) {
  const [preferences, setPreferences] = useState({
    defaultView: 'calendar' as 'calendar' | 'gantt',
    notifications: false,
    autoSync: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Cache for user profiles (full profile, not just preferences)
  const userProfileCacheRef = useRef<{
    [uid: string]: { profile: any; timestamp: number };
  }>({});

  useEffect(() => {
    if (isOpen && auth.currentUser) {
      loadUserPreferences();
    }
  }, [isOpen]);

  const loadUserPreferences = async () => {
    try {
      setIsLoading(true);
      
      // Check cache first
      const uid = auth.currentUser!.uid;
      const now = Date.now();
      const cacheTimeout = process.env.NODE_ENV === 'development' ? 300000 : 600000; // 5 min dev, 10 min prod
      
      if (userProfileCacheRef.current[uid] && 
          (now - userProfileCacheRef.current[uid].timestamp) < cacheTimeout) {
        console.log('Using cached user profile for preferences');
        setPreferences(userProfileCacheRef.current[uid].profile.preferences);
      } else {
        console.log('Fetching fresh user profile for preferences');
        const userProfile = await getUserProfile(uid);
        if (userProfile) {
          // Cache the full profile
          userProfileCacheRef.current[uid] = {
            profile: userProfile,
            timestamp: now,
          };
          setPreferences(userProfile.preferences);
        }
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    try {
      setIsSaving(true);
      setSaveStatus('saving');
      
      // Use cached user profile to avoid additional Firebase read
      const uid = auth.currentUser.uid;
      if (userProfileCacheRef.current[uid]) {
        // Get cached profile and use updateUserProfile directly (no additional Firebase read!)
        const cachedProfileData = userProfileCacheRef.current[uid].profile;
        
        console.log('Saving preferences using cached profile (no Firebase read)');
        await updateUserProfile(cachedProfileData.id, {
          preferences: { ...cachedProfileData.preferences, ...preferences },
        });
        
        // Update cache with new preferences
        userProfileCacheRef.current[uid] = {
          profile: {
            ...cachedProfileData,
            preferences: { ...cachedProfileData.preferences, ...preferences },
          },
          timestamp: Date.now(),
        };
      } else {
        // Fallback to original method if no cache
        console.log('No cached profile, using saveUserPreferences (will make Firebase read)');
        await saveUserPreferences(uid, preferences);
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <User className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">User Preferences</h2>
                <p className="text-sm text-gray-500">Personal settings and preferences</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <>
                {/* Default View */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Monitor className="h-4 w-4 mr-2" />
                    Default View
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="defaultView"
                        value="calendar"
                        checked={preferences.defaultView === 'calendar'}
                        onChange={(e) => setPreferences({ ...preferences, defaultView: e.target.value as 'calendar' | 'gantt' })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Calendar View</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="defaultView"
                        value="gantt"
                        checked={preferences.defaultView === 'gantt'}
                        onChange={(e) => setPreferences({ ...preferences, defaultView: e.target.value as 'calendar' | 'gantt' })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Timeline View</span>
                    </label>
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">Enable notifications</p>
                      <p className="text-xs text-gray-500">Receive alerts for upcoming events and tasks</p>
                    </div>
                    <button
                      onClick={() => setPreferences({ ...preferences, notifications: !preferences.notifications })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.notifications ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.notifications ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Auto Sync */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar Sync
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">Auto-sync to Google Calendar</p>
                      <p className="text-xs text-gray-500">Automatically sync confirmed tasks to your calendar</p>
                    </div>
                    <button
                      onClick={() => setPreferences({ ...preferences, autoSync: !preferences.autoSync })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.autoSync ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.autoSync ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> These are your personal preferences and will only affect your view. 
                    Team settings are managed in the Configuration page.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              {saveStatus === 'saving' && (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                  <span className="text-sm text-gray-500">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <div className="h-4 w-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Saved!</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <div className="h-4 w-4 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-red-600">Save failed</span>
                </>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 