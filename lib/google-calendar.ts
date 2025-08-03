// Google Calendar integration service
// This will handle creating calendar events when timeline items are confirmed

export interface GoogleCalendarEvent {
  summary: string
  description: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: string
  attendees?: Array<{ email: string }>
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
}

export const createGoogleCalendarEvent = async (eventData: GoogleCalendarEvent): Promise<string> => {
  try {
    // For now, we'll simulate Google Calendar integration
    // In a real implementation, you would:
    // 1. Use Google Calendar API
    // 2. Handle OAuth authentication
    // 3. Create actual calendar events
    
    console.log('Creating Google Calendar event:', eventData);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a mock event ID
    const eventId = `gcal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Google Calendar event created with ID:', eventId);
    
    return eventId;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw new Error('Failed to create Google Calendar event');
  }
};

export const createTimelineEvent = async (
  eventName: string,
  taskName: string,
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  location: string,
  description: string,
  attendees: string[] = []
): Promise<string> => {
  const startDateTime = new Date(`${startDate}T${startTime}`);
  const endDateTime = new Date(`${endDate}T${endTime}`);
  
  const calendarEvent: GoogleCalendarEvent = {
    summary: `${eventName} - ${taskName}`,
    description: description,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    location: location,
    attendees: attendees.map(email => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'email', minutes: 1440 }, // 24 hours
      ],
    },
  };
  
  return createGoogleCalendarEvent(calendarEvent);
};

// Helper function to format time for calendar events
export const formatTimeForCalendar = (time: string): string => {
  // Convert 12-hour format to 24-hour format if needed
  if (time.includes('AM') || time.includes('PM')) {
    const [timePart, period] = time.split(' ');
    const [hours, minutes] = timePart.split(':');
    let hour = parseInt(hours);
    
    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  }
  
  return time;
}; 