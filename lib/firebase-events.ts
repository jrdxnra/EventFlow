import { db } from './firebase'
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, getDoc } from 'firebase/firestore'
import { Event, TimelineItem } from './types'
import { EventFormData } from './validation'

export const createEvent = async (formData: EventFormData): Promise<string> => {
  try {
    // Transform EventFormData to Event interface
    const eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.eventName,
      date: formData.eventDate,
      time: formData.eventTime,
      eventEndTime: formData.eventEndTime,
      location: formData.eventLocation,
      pointOfContact: {
        name: formData.pointOfContact.name,
        email: formData.pointOfContact.email,
        phone: formData.pointOfContact.phone || ''
      },

      eventPurpose: formData.eventPurpose,
      coachSupport: formData.coachSupport,
      marketingChannels: formData.marketingChannels,
      ticketingNeeds: formData.ticketingNeeds || '',
      gemsDetails: formData.gemsDetails || '',
      specialRequirements: formData.specialRequirements || '',

      otherNotes: formData.otherNotes || '',
      eventType: formData.eventType || '',
      status: 'draft'
    }

    console.log('Sending data to Firebase:', eventData)

    const docRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return docRef.id
  } catch (error: any) {
    console.error('Error creating event:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    })
    throw new Error(`Failed to create event: ${error?.message || 'Unknown error'}`)
  }
}

export const updateEvent = async (eventId: string, eventData: Partial<Event>): Promise<void> => {
  try {
    const eventRef = doc(db, 'events', eventId)
    await updateDoc(eventRef, {
      ...eventData,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error updating event:', error)
    throw new Error('Failed to update event')
  }
}

export const getEvents = async (): Promise<Event[]> => {
  try {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Event[]
  } catch (error) {
    console.error('Error getting events:', error)
    throw new Error('Failed to get events')
  }
}

export const getEventById = async (eventId: string): Promise<Event | null> => {
  try {
    const eventRef = doc(db, 'events', eventId)
    const eventDoc = await getDoc(eventRef)
    
    if (eventDoc.exists()) {
      return {
        id: eventDoc.id,
        ...eventDoc.data()
      } as Event
    }
    return null
  } catch (error) {
    console.error('Error getting event:', error)
    throw new Error('Failed to get event')
  }
}

export const updateEventTimelineItem = async (eventId: string, timelineItems: TimelineItem[]): Promise<void> => {
  try {
    const eventRef = doc(db, 'events', eventId)
    await updateDoc(eventRef, {
      timelineItems,
      updatedAt: new Date()
    })
  } catch (error) {
    console.error('Error updating event timeline items:', error)
    throw new Error('Failed to update event timeline items')
  }
} 