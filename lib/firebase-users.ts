import { User } from 'firebase/auth';
import { collection, addDoc, updateDoc, doc, getDocs, query, getDoc, where, setDoc } from 'firebase/firestore';

import { db } from './firebase';

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'manager' | 'coach' | 'member';
  teamId?: string;
  permissions: string[];
  preferences: {
    defaultView: 'calendar' | 'gantt';
    notifications: boolean;
    autoSync: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  adminId: string;
  members: string[];
  settings: {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    defaultPermissions: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// User Profile Management
export const createUserProfile = async (user: User, role: UserProfile['role'] = 'member'): Promise<string> => {
  try {
    const userProfile: Omit<UserProfile, 'id'> = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email || 'User',
      photoURL: user.photoURL || undefined,
      role,
      permissions: getDefaultPermissions(role),
      preferences: {
        defaultView: 'calendar',
        notifications: false, // Off by default
        autoSync: false, // Off by default
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'userProfiles'), userProfile);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating user profile:', error);
    throw new Error(`Failed to create user profile: ${error?.message || 'Unknown error'}`);
  }
};

export const updateUserProfile = async (profileId: string, profileData: Partial<UserProfile>): Promise<void> => {
  try {
    const profileRef = doc(db, 'userProfiles', profileId);
    await updateDoc(profileRef, {
      ...profileData,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile');
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const q = query(collection(db, 'userProfiles'), where('uid', '==', uid));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      if (doc) {
        return {
          id: doc.id,
          ...doc.data(),
        } as UserProfile;
      }
    }
    return null;
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    // If it's a permissions error, the user profile might not exist yet
    if (error.code === 'permission-denied') {
      console.log('Permission denied - user profile may not exist yet');
      return null;
    }
    throw new Error('Failed to get user profile');
  }
};

export const getUserProfileById = async (profileId: string): Promise<UserProfile | null> => {
  try {
    const profileRef = doc(db, 'userProfiles', profileId);
    const profileDoc = await getDoc(profileRef);
    
    if (profileDoc.exists()) {
      return {
        id: profileDoc.id,
        ...profileDoc.data(),
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile by ID:', error);
    throw new Error('Failed to get user profile');
  }
};

// Team Management
export const createTeam = async (teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'teams'), {
      ...teamData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating team:', error);
    throw new Error(`Failed to create team: ${error?.message || 'Unknown error'}`);
  }
};

export const updateTeam = async (teamId: string, teamData: Partial<Team>): Promise<void> => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      ...teamData,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating team:', error);
    throw new Error('Failed to update team');
  }
};

export const getTeam = async (teamId: string): Promise<Team | null> => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    
    if (teamDoc.exists()) {
      return {
        id: teamDoc.id,
        ...teamDoc.data(),
      } as Team;
    }
    return null;
  } catch (error) {
    console.error('Error getting team:', error);
    throw new Error('Failed to get team');
  }
};

export const getUserTeams = async (uid: string): Promise<Team[]> => {
  try {
    const q = query(collection(db, 'teams'), where('members', 'array-contains', uid));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Team[];
  } catch (error) {
    console.error('Error getting user teams:', error);
    throw new Error('Failed to get user teams');
  }
};

// Permission Management
export const getDefaultPermissions = (role: UserProfile['role']): string[] => {
  switch (role) {
  case 'admin':
    return ['read', 'write', 'delete', 'manage_users', 'manage_teams', 'manage_events'];
  case 'manager':
    return ['read', 'write', 'manage_events', 'manage_coaches'];
  case 'coach':
    return ['read', 'write', 'manage_own_events'];
  case 'member':
    return ['read', 'write_own'];
  default:
    return ['read'];
  }
};

export const hasPermission = (userProfile: UserProfile, permission: string): boolean => {
  return userProfile.permissions.includes(permission) || userProfile.role === 'admin';
};

// User Session Management
export const initializeUserSession = async (user: User): Promise<UserProfile> => {
  try {
    // Check if user profile exists
    let userProfile = await getUserProfile(user.uid);
    
    if (!userProfile) {
      // Create new user profile
      const profileId = await createUserProfile(user);
      userProfile = await getUserProfileById(profileId);
      
      if (!userProfile) {
        throw new Error('Failed to create user profile');
      }
    }
    
    return userProfile;
  } catch (error: any) {
    console.error('Error initializing user session:', error);
    
    // If it's a permissions error, try to create the profile directly
    if (error.message.includes('permissions') || error.code === 'permission-denied') {
      try {
        console.log('Attempting to create user profile directly...');
        const profileId = await createUserProfile(user);
        const userProfile = await getUserProfileById(profileId);
        
        if (userProfile) {
          return userProfile;
        }
      } catch (createError) {
        console.error('Failed to create user profile:', createError);
      }
    }
    
    throw new Error('Failed to initialize user session');
  }
};

// Team Mode Management
export const saveUserPreferences = async (uid: string, preferences: Partial<UserProfile['preferences']>): Promise<void> => {
  try {
    const userProfile = await getUserProfile(uid);
    if (userProfile) {
      await updateUserProfile(userProfile.id, {
        preferences: { ...userProfile.preferences, ...preferences },
      });
    }
  } catch (error) {
    console.error('Error saving user preferences:', error);
    throw new Error('Failed to save user preferences');
  }
}; 