import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, getDoc, deleteDoc } from 'firebase/firestore';

import { db } from './firebase';
import { EventData, TimelineItem } from './types';
import { EventFormData } from './validation';

export const createEvent = async (formData: EventFormData, userId?: string): Promise<string> => {
  try {
    // Transform EventFormData to Event interface
    const eventData: Omit<EventData, 'id' | 'createdAt' | 'updatedAt'> = {
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
      teamRoles: formData.teamRoles,
      marketingChannels: formData.marketingChannels,
      ticketingNeeds: formData.ticketingNeeds || '',
      gemsDetails: formData.gemsDetails || '',
      specialRequirements: formData.specialRequirements || '',

      otherNotes: formData.otherNotes || '',
      eventType: formData.eventType || '',
      status: 'draft',
      createdBy: userId || 'unknown', // Track who created the event
    };

    console.log('Sending data to Firebase:', eventData);

    const docRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating event:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    throw new Error(`Failed to create event: ${error?.message || 'Unknown error'}`);
  }
};

export const updateEvent = async (eventId: string, eventData: Partial<EventData>): Promise<void> => {
  try {
    console.log('📝 FIREBASE UPDATE: Attempting to update event:', eventId);
    
    if (!eventId) {
      throw new Error('Event ID is required for update');
    }
    
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      ...eventData,
      updatedAt: new Date(),
    });
    
    console.log('✅ FIREBASE UPDATE: Successfully updated event:', eventId);
  } catch (error: any) {
    console.error('🚨 Error updating event:', error);
    console.error('🚨 Update error details:', {
      eventId,
      code: error?.code || 'no-code',
      message: error?.message || 'no-message',
      errorType: typeof error,
    });
    
    // Preserve the original Firebase error message for better debugging
    if (error?.message?.includes('No document to update')) {
      throw new Error(`No document to update: projects/eventflow-exos/databases/(default)/documents/events/${eventId}`);
    } else if (error?.code === 'not-found') {
      throw new Error('Event not found: The event may have been deleted');
    } else {
      throw new Error(`Failed to update event: ${error?.message || 'Unknown error'}`);
    }
  }
};

export const getEvents = async (): Promise<EventData[]> => {
  try {
    console.log('🔥 FIREBASE READ: getEvents() called from:', new Error().stack?.split('\n')[2]?.trim());
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as EventData[];
  } catch (error) {
    console.error('Error getting events:', error);
    throw new Error('Failed to get events');
  }
};

export const getEventById = async (eventId: string): Promise<EventData | null> => {
  try {
    console.log('🔥 FIREBASE READ: getEventById() called for eventId:', eventId, 'from:', new Error().stack?.split('\n')[2]?.trim());
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    
    if (eventDoc.exists()) {
      return {
        id: eventDoc.id,
        ...eventDoc.data(),
      } as EventData;
    }
    return null;
  } catch (error) {
    console.error('Error getting event:', error);
    throw new Error('Failed to get event');
  }
};

export const updateEventTimelineItem = async (eventId: string, timelineItems: TimelineItem[]): Promise<void> => {
  try {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      timelineItems,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating event timeline items:', error);
    throw new Error('Failed to update event timeline items');
  }
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    const eventRef = doc(db, 'events', eventId);
    await deleteDoc(eventRef);
  } catch (error) {
    console.error('Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}; 