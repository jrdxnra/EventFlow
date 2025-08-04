import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, getDoc, deleteDoc, where } from 'firebase/firestore';

import { db } from './firebase';
import { Coach, Contact } from './types';

// Coach Management
export const createCoach = async (coachData: Omit<Coach, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'coaches'), {
      ...coachData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating coach:', error);
    throw new Error(`Failed to create coach: ${error?.message || 'Unknown error'}`);
  }
};

export const updateCoach = async (coachId: string, coachData: Partial<Coach>): Promise<void> => {
  try {
    const coachRef = doc(db, 'coaches', coachId);
    await updateDoc(coachRef, {
      ...coachData,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating coach:', error);
    throw new Error('Failed to update coach');
  }
};

export const deleteCoach = async (coachId: string): Promise<void> => {
  try {
    const coachRef = doc(db, 'coaches', coachId);
    await deleteDoc(coachRef);
  } catch (error) {
    console.error('Error deleting coach:', error);
    throw new Error('Failed to delete coach');
  }
};

export const getCoaches = async (): Promise<Coach[]> => {
  try {
    const q = query(collection(db, 'coaches'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Coach[];
  } catch (error) {
    console.error('Error getting coaches:', error);
    throw new Error('Failed to get coaches');
  }
};

export const getCoachById = async (coachId: string): Promise<Coach | null> => {
  try {
    const coachRef = doc(db, 'coaches', coachId);
    const coachDoc = await getDoc(coachRef);
    
    if (coachDoc.exists()) {
      return {
        id: coachDoc.id,
        ...coachDoc.data(),
      } as Coach;
    }
    return null;
  } catch (error) {
    console.error('Error getting coach:', error);
    throw new Error('Failed to get coach');
  }
};

// Contact Management
export const createContact = async (contactData: Omit<Contact, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'contacts'), {
      ...contactData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating contact:', error);
    throw new Error(`Failed to create contact: ${error?.message || 'Unknown error'}`);
  }
};

export const updateContact = async (contactId: string, contactData: Partial<Contact>): Promise<void> => {
  try {
    const contactRef = doc(db, 'contacts', contactId);
    await updateDoc(contactRef, {
      ...contactData,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    throw new Error('Failed to update contact');
  }
};

export const deleteContact = async (contactId: string): Promise<void> => {
  try {
    const contactRef = doc(db, 'contacts', contactId);
    await deleteDoc(contactRef);
  } catch (error) {
    console.error('Error deleting contact:', error);
    throw new Error('Failed to delete contact');
  }
};

export const getContacts = async (): Promise<Contact[]> => {
  try {
    const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Contact[];
  } catch (error) {
    console.error('Error getting contacts:', error);
    throw new Error('Failed to get contacts');
  }
};

export const getContactsByCategory = async (category: Contact['category']): Promise<Contact[]> => {
  try {
    const q = query(
      collection(db, 'contacts'), 
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Contact[];
  } catch (error) {
    console.error('Error getting contacts by category:', error);
    throw new Error('Failed to get contacts by category');
  }
};

// Event Logistics Management
export interface EventLogistics {
  id: string;
  eventId: string;
  teamMembers: any[];
  activities: any[];
  dayOfSchedule: any[];
  contacts: Contact[];
  createdAt: Date;
  updatedAt: Date;
}

export const createEventLogistics = async (eventId: string, logisticsData: Omit<EventLogistics, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'eventLogistics'), {
      eventId,
      ...logisticsData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating event logistics:', error);
    throw new Error(`Failed to create event logistics: ${error?.message || 'Unknown error'}`);
  }
};

export const updateEventLogistics = async (logisticsId: string, logisticsData: Partial<EventLogistics>): Promise<void> => {
  try {
    const logisticsRef = doc(db, 'eventLogistics', logisticsId);
    await updateDoc(logisticsRef, {
      ...logisticsData,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating event logistics:', error);
    throw new Error('Failed to update event logistics');
  }
};

export const getEventLogistics = async (eventId: string): Promise<EventLogistics | null> => {
  try {
    const q = query(
      collection(db, 'eventLogistics'), 
      where('eventId', '==', eventId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      if (doc) {
        return {
          id: doc.id,
          ...doc.data(),
        } as EventLogistics;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting event logistics:', error);
    throw new Error('Failed to get event logistics');
  }
};

export const saveEventLogistics = async (eventId: string, logisticsData: any): Promise<void> => {
  try {
    // Check if logistics already exist for this event
    const existingLogistics = await getEventLogistics(eventId);
    
    if (existingLogistics) {
      // Update existing logistics
      await updateEventLogistics(existingLogistics.id, logisticsData);
    } else {
      // Create new logistics
      await createEventLogistics(eventId, logisticsData);
    }
  } catch (error) {
    console.error('Error saving event logistics:', error);
    throw new Error('Failed to save event logistics');
  }
}; 