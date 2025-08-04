import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, getDoc, deleteDoc, where, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebase';
import { EventData } from './types';
import { EventFormData } from './validation';

// Separate collections for team and individual events
const TEAM_EVENTS_COLLECTION = 'events'; // Use existing events collection as team events
const INDIVIDUAL_EVENTS_COLLECTION = 'individualEvents';

export interface MultiProfileEventData extends EventData {
  profileType: 'team' | 'individual';
  teamId?: string; // Only for team events
  createdBy: string; // User ID who created the event
}

// Team Events Management - Single team approach
export const getTeamEvents = async (): Promise<MultiProfileEventData[]> => {
  try {
    console.log('Fetching team events from main events collection');
    
    // Get all events from the main events collection (shared team events)
    const q = query(
      collection(db, TEAM_EVENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    console.log('Team events query successful, found:', querySnapshot.docs.length, 'events');
    
    // Convert to MultiProfileEventData format with team profile type
    const events = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      profileType: 'team' as const,
      teamId: 'main-team', // All team events belong to the main team
    })) as MultiProfileEventData[];
    
    return events;
  } catch (error: any) {
    console.error('Error getting team events:', error);
    if (error.code === 'permission-denied') {
      console.error('Permission denied - user may not have access to team events collection');
    }
    return [];
  }
};

export const createTeamEvent = async (
  formData: EventFormData, 
  userId: string
): Promise<string> => {
  try {
    const eventData: Omit<MultiProfileEventData, 'id'> = {
      name: formData.eventName,
      date: formData.eventDate,
      time: formData.eventTime,
      eventEndTime: formData.eventEndTime,
      location: formData.eventLocation,
      eventScope: formData.eventScope,
      pointOfContact: {
        name: formData.pointOfContact.name,
        email: formData.pointOfContact.email,
        phone: formData.pointOfContact.phone || '',
      },
      eventPurpose: formData.eventPurpose,
      coachSupport: formData.coachSupport,
      marketingChannels: formData.marketingChannels,
      ticketingNeeds: formData.ticketingNeeds || '',
      gemsDetails: formData.gemsDetails || '',
      specialRequirements: formData.specialRequirements || '',
      otherNotes: formData.otherNotes || '',
      eventType: formData.eventType || '',
      status: 'draft',
      profileType: 'team',
      teamId: 'main-team', // All team events belong to the main team
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, TEAM_EVENTS_COLLECTION), eventData);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating team event:', error);
    throw new Error(`Failed to create team event: ${error?.message || 'Unknown error'}`);
  }
};

// Individual Events Management
export const getIndividualEvents = async (userId: string): Promise<MultiProfileEventData[]> => {
  try {
    if (!userId) {
      console.warn('No user ID provided for individual events');
      return [];
    }

    console.log('Fetching individual events for user:', userId);
    
    const q = query(
      collection(db, INDIVIDUAL_EVENTS_COLLECTION),
      where('createdBy', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    console.log('Individual events query successful, found:', querySnapshot.docs.length, 'events');
    
    // Sort client-side until index is ready
    const events = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MultiProfileEventData[];
    
    return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error: any) {
    console.error('Error getting individual events:', error);
    if (error.code === 'permission-denied') {
      console.error('Permission denied - user may not have access to individual events collection');
    }
    return [];
  }
};

export const createIndividualEvent = async (
  formData: EventFormData, 
  userId: string
): Promise<string> => {
  try {
    const eventData: Omit<MultiProfileEventData, 'id'> = {
      name: formData.eventName,
      date: formData.eventDate,
      time: formData.eventTime,
      eventEndTime: formData.eventEndTime,
      location: formData.eventLocation,
      eventScope: formData.eventScope,
      pointOfContact: {
        name: formData.pointOfContact.name,
        email: formData.pointOfContact.email,
        phone: formData.pointOfContact.phone || '',
      },
      eventPurpose: formData.eventPurpose,
      coachSupport: formData.coachSupport,
      marketingChannels: formData.marketingChannels,
      ticketingNeeds: formData.ticketingNeeds || '',
      gemsDetails: formData.gemsDetails || '',
      specialRequirements: formData.specialRequirements || '',
      otherNotes: formData.otherNotes || '',
      eventType: formData.eventType || '',
      status: 'draft',
      profileType: 'individual',
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, INDIVIDUAL_EVENTS_COLLECTION), eventData);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating individual event:', error);
    throw new Error(`Failed to create individual event: ${error?.message || 'Unknown error'}`);
  }
};

// Single team approach - all users are part of the main team
export const getMainTeamId = (): string => {
  return 'main-team';
};

// Unified Event Management
export const getEventsByProfile = async (
  profileType: 'team' | 'individual',
  userId: string
): Promise<MultiProfileEventData[]> => {
  try {
    if (profileType === 'team') {
      return getTeamEvents();
    } else {
      return getIndividualEvents(userId);
    }
  } catch (error) {
    console.error('Error in getEventsByProfile:', error);
    // Fallback to empty array if there are permission issues
    return [];
  }
};

export const createEventByProfile = async (
  formData: EventFormData,
  profileType: 'team' | 'individual',
  userId: string
): Promise<string> => {
  try {
    if (profileType === 'team') {
      return createTeamEvent(formData, userId);
    } else {
      return createIndividualEvent(formData, userId);
    }
  } catch (error) {
    console.error('Error in createEventByProfile:', error);
    throw error;
  }
};

// Event Updates
export const updateEvent = async (
  eventId: string,
  profileType: 'team' | 'individual',
  updateData: Partial<MultiProfileEventData>
): Promise<void> => {
  try {
    const collectionName = profileType === 'team' ? TEAM_EVENTS_COLLECTION : INDIVIDUAL_EVENTS_COLLECTION;
    const eventRef = doc(db, collectionName, eventId);
    await updateDoc(eventRef, {
      ...updateData,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error('Failed to update event');
  }
};

export const deleteEvent = async (
  eventId: string,
  profileType: 'team' | 'individual'
): Promise<void> => {
  try {
    const collectionName = profileType === 'team' ? TEAM_EVENTS_COLLECTION : INDIVIDUAL_EVENTS_COLLECTION;
    const eventRef = doc(db, collectionName, eventId);
    await deleteDoc(eventRef);
  } catch (error) {
    console.error('Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}; 