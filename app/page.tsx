'use client';

import { motion } from 'framer-motion';
import { Calendar, Plus, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';

import EventSidebar from '@/components/Sidebar';
import UserProfile from '@/components/UserProfile';
import { updateEvent, updateEventTimelineItem } from '@/lib/firebase-events';
import { getEventsByProfile, MultiProfileEventData, deleteEvent } from '@/lib/firebase-multi-profile';
import { getCoaches, getEventLogistics } from '@/lib/firebase-coaches';
import { EventData, Coach } from '@/lib/types';
import { EVENT_TYPES, EVENT_SCOPES, MARKETING_CHANNELS, EVENT_COLORS, TICKETING_OPTIONS, DEFAULT_GEMS_DETAILS, TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '@/lib/event-constants';
import { TeamMember, getEventContactPerson, getSuggestedAssignee, getAssignedPerson } from '@/lib/role-utils';
import ModalHeader from '@/components/ModalHeader';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';


interface GanttItem {
  id: string;
  eventId: string;
  eventName: string;
  task: string;
  start: Date;
  end: Date;
  category: 'marketing' | 'logistics' | 'preparation' | 'execution';
  status: 'pending' | 'completed';
  eventColor: string;
}

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  category: 'marketing' | 'logistics' | 'preparation' | 'execution';
  status: 'pending' | 'confirmed' | 'completed';
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  notes?: string;
}

interface CalendarEvent extends EventData {
  isTimelineItem?: boolean;
}

export default function Home() {
  const [events, setEvents] = useState<MultiProfileEventData[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'gantt'>('calendar');

  const [expandedTimelines, setExpandedTimelines] = useState<Set<string>>(new Set());
  const [collapsedEventGroups, setCollapsedEventGroups] = useState<Set<string>>(new Set());
  const [eventTimelines, setEventTimelines] = useState<Record<string, TimelineItem[]>>({});

  const [showEventInfoModal, setShowEventInfoModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [showTimelineItemModal, setShowTimelineItemModal] = useState(false);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<TimelineItem | null>(null);
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState<string>('');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isTeamMode, setIsTeamMode] = useState(true);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  
  // Helper function to initialize events cache from localStorage
  const initializeEventsCache = () => {
    // Initialize from localStorage to survive hot reloads
    if (typeof window !== 'undefined') {
      try {
        const cachedEvents = localStorage.getItem('eventflow-events-cache');
        const cachedLastFetch = localStorage.getItem('eventflow-events-lastfetch');
        
        if (cachedEvents && cachedLastFetch) {
          const events = JSON.parse(cachedEvents);
          const lastFetch = JSON.parse(cachedLastFetch);
          console.log('🔄 Restored events cache from localStorage:', { lastFetch });
          return {
            team: events.team || null,
            individual: events.individual || null,
            lastFetch: lastFetch || { team: 0, individual: 0 },
          };
        }
      } catch (error) {
        console.error('Error loading events cache from localStorage:', error);
      }
    }
    
    return {
      team: null,
      individual: null,
      lastFetch: { team: 0, individual: 0 },
    };
  };

  // Cache for events to prevent unnecessary queries (with localStorage persistence)
  const eventsCacheRef = useRef<{
    team: MultiProfileEventData[] | null;
    individual: MultiProfileEventData[] | null;
    lastFetch: { team: number; individual: number };
  }>(initializeEventsCache());

  // Helper function to initialize timeline cache from localStorage
  const initializeTimelineCache = () => {
    if (typeof window !== 'undefined') {
      try {
        const cachedTimelines = localStorage.getItem('eventflow-timelines-cache');
        if (cachedTimelines) {
          const timelines = JSON.parse(cachedTimelines);
          console.log('🔄 Restored timeline cache from localStorage');
          return {
            team: timelines.team || null,
            individual: timelines.individual || null,
          };
        }
      } catch (error) {
        console.error('Error loading timeline cache from localStorage:', error);
      }
    }
    
    return {
      team: null,
      individual: null,
    };
  };

  // Cache for timeline data to prevent regeneration (with localStorage persistence)
  const timelineCacheRef = useRef<{
    team: Record<string, TimelineItem[]> | null;
    individual: Record<string, TimelineItem[]> | null;
  }>(initializeTimelineCache());

  // Helper function to persist timeline cache to localStorage
  const persistTimelineCache = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('eventflow-timelines-cache', JSON.stringify({
          team: timelineCacheRef.current.team,
          individual: timelineCacheRef.current.individual,
        }));
        console.log('💾 Persisted timeline cache to localStorage');
      } catch (error) {
        console.error('Error saving timeline cache to localStorage:', error);
      }
    }
  };

  useEffect(() => {
    console.log('🔄 Main page useEffect triggered - isTeamMode:', isTeamMode, 'currentUser:', currentUser?.uid);
    
    const loadEvents = async () => {
      try {
        // Load events based on current profile mode
        const profileType = isTeamMode ? 'team' : 'individual';
        const cacheKey = profileType as 'team' | 'individual';
        const now = Date.now();
        const cacheAge = now - eventsCacheRef.current.lastFetch[cacheKey];
        
        // Use cache if it's less than 5 minutes old (increased from 30 seconds)
        // In development, use longer cache times to prevent excessive reads
        const cacheTimeout = process.env.NODE_ENV === 'development' ? 600000 : 300000; // 10 min dev, 5 min prod
        
        if (eventsCacheRef.current[cacheKey] && cacheAge < cacheTimeout) {
          console.log(`Using cached ${profileType} events (${cacheAge}ms old)`);
          setEvents(eventsCacheRef.current[cacheKey]!);
          
          // Also use cached timeline data if available
          if (timelineCacheRef.current[cacheKey]) {
            console.log(`Using cached ${profileType} timeline data`);
            setEventTimelines(timelineCacheRef.current[cacheKey]!);
          } else {
            // Generate timeline data for cached events
            console.log(`Generating timeline data for cached ${profileType} events`);
            const timelineData: { [key: string]: TimelineItem[] } = {};
            for (const event of eventsCacheRef.current[cacheKey]!) {
              if (event.timelineItems && event.timelineItems.length > 0) {
                // Migrate timeline items to have unique IDs if they don't already
                const migratedTimeline = event.timelineItems.map((item, index) => {
                  // Check if the item has an old hardcoded ID (just a number)
                  if (/^\d+$/.test(item.id)) {
                    return {
                      ...item,
                      id: `${event.id}-${index + 1}`,
                    };
                  }
                  return item;
                });
                timelineData[event.id] = migratedTimeline;
              } else {
                // Generate timeline if not stored in Firebase
                timelineData[event.id] = generateTimelineForEvent(event);
              }
            }
            setEventTimelines(timelineData);
            // Cache the timeline data
            timelineCacheRef.current = {
              ...timelineCacheRef.current,
              [cacheKey]: timelineData,
            };
            persistTimelineCache();
          }
          return;
        }
        
        console.log(`Fetching fresh ${profileType} events`);
        const eventsData = await getEventsByProfile(profileType, currentUser?.uid || '');
        
        // Update cache
        eventsCacheRef.current = {
          ...eventsCacheRef.current,
          [cacheKey]: eventsData,
          lastFetch: { ...eventsCacheRef.current.lastFetch, [cacheKey]: now },
        };
        
        // Persist cache to localStorage to survive hot reloads
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('eventflow-events-cache', JSON.stringify({
              team: eventsCacheRef.current.team,
              individual: eventsCacheRef.current.individual,
            }));
            localStorage.setItem('eventflow-events-lastfetch', JSON.stringify(eventsCacheRef.current.lastFetch));
            console.log('💾 Persisted events cache to localStorage');
          } catch (error) {
            console.error('Error saving events cache to localStorage:', error);
          }
        }
        
        setEvents(eventsData);
        
        // Load timeline items from Firebase for each event
        const timelineData: { [key: string]: TimelineItem[] } = {};
        console.log('Processing timeline for events:', eventsData.length);
        for (const event of eventsData) {
          console.log('Processing event:', event.name, 'has timelineItems:', event.timelineItems?.length || 0);
          if (event.timelineItems && event.timelineItems.length > 0) {
            // Migrate timeline items to have unique IDs if they don't already
            const migratedTimeline = event.timelineItems.map((item, index) => {
              // Check if the item has an old hardcoded ID (just a number)
              if (/^\d+$/.test(item.id)) {
                return {
                  ...item,
                  id: `${event.id}-${index + 1}`,
                };
              }
              return item;
            });
            timelineData[event.id] = migratedTimeline;
            console.log('Using existing timeline items for', event.name, ':', migratedTimeline.length);
          } else {
            // Generate timeline if not stored in Firebase
            console.log('Generating new timeline for', event.name);
            timelineData[event.id] = generateTimelineForEvent(event);
          }
        }
        setEventTimelines(timelineData);
        
        // Cache the timeline data
        timelineCacheRef.current = {
          ...timelineCacheRef.current,
          [cacheKey]: timelineData,
        };
        persistTimelineCache();
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only load events if we have a user and haven't loaded recently
    if (currentUser?.uid) {
      const profileType = isTeamMode ? 'team' : 'individual';
      const cacheKey = profileType as 'team' | 'individual';
      const now = Date.now();
      const cacheAge = now - eventsCacheRef.current.lastFetch[cacheKey];
      
      // Prevent excessive calls - only fetch if cache is old or empty
      // In development, use longer cache times
      const cacheTimeout = process.env.NODE_ENV === 'development' ? 600000 : 300000; // 10 min dev, 5 min prod
      
      console.log('🔍 Cache check:', {
        profileType,
        hasCache: !!eventsCacheRef.current[cacheKey],
        cacheAge: cacheAge,
        cacheTimeout,
        lastFetch: eventsCacheRef.current.lastFetch[cacheKey],
        shouldFetch: !eventsCacheRef.current[cacheKey] || cacheAge > cacheTimeout,
      });
      
      if (!eventsCacheRef.current[cacheKey] || cacheAge > cacheTimeout) {
        console.log('🔄 Cache miss or stale - fetching fresh data');
        loadEvents();
      } else {
        // Use existing cache
        console.log('✅ Using cached data');
        setEvents(eventsCacheRef.current[cacheKey]!);
        if (timelineCacheRef.current[cacheKey]) {
          console.log('✅ Using cached timeline data');
          setEventTimelines(timelineCacheRef.current[cacheKey]!);
        } else {
          console.log('⚠️ No cached timeline data found, timeline will be empty');
        }
        setIsLoading(false);
      }
    }
  }, [isTeamMode, currentUser?.uid]); // Keep dependencies but add cache check

  // Authentication state management with token refresh
  useEffect(() => {
    let unsubscribe: () => void;

    const setupAuthListener = () => {
      unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
        console.log('🔐 AUTH STATE CHANGED:', user?.uid || 'No user');
        
        if (user) {
          try {
            // Force token refresh to ensure we have valid permissions
            const token = await user.getIdToken(true); // force refresh = true
            console.log('🔄 AUTH: Token refreshed successfully');
            setCurrentUser(user);
          } catch (error) {
            console.error('🚨 AUTH: Token refresh failed:', error);
            setCurrentUser(null);
          }
        } else {
          console.log('👤 AUTH: User signed out or not authenticated');
          setCurrentUser(null);
        }
      });
    };

    setupAuthListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Load coaches for contact person dropdown
  useEffect(() => {
    const loadCoaches = async () => {
      try {
        const coachesData = await getCoaches();
        setCoaches(coachesData);
      } catch (error) {
        console.error('Error loading coaches:', error);
      }
    };

    loadCoaches();
  }, []);

  // Removed focus event handler to reduce unnecessary queries

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };





  const generateTimelineForEvent = (eventData: MultiProfileEventData): TimelineItem[] => {
    console.log('Generating timeline for event:', eventData.name, eventData);
    
    // Ensure we have a valid date string
    if (!eventData.date) {
      console.warn('Event has no date, cannot generate timeline');
      return [];
    }
    
    // Create a valid date object - this ensures TypeScript knows it's not undefined
    const eventDate = new Date(eventData.date);
    if (isNaN(eventDate.getTime())) {
      console.warn('Invalid date format, cannot generate timeline');
      return [];
    }
    const timeline: TimelineItem[] = [];
    let idCounter = 1;

    // Marketing timeline - First priority (30 days before)
    if (eventData.marketingChannels.includes('media')) {
      timeline.push({
        id: `${eventData.id}-${idCounter++}`,
        title: 'Create Social Media Content',
        description: 'Design and schedule social media posts for event promotion',
        dueDate: new Date(eventDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '', // 30 days before
        dueTime: '07:00',
        category: 'marketing',
        status: 'pending',
        priority: 'high',
      });
    }

    if (eventData.marketingChannels.includes('flyers')) {
      timeline.push({
        id: `${eventData.id}-${idCounter++}`,
        title: 'Design and Print Flyers',
        description: 'Create event flyers and arrange printing',
        dueDate: new Date(eventDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '', // 30 days before
        dueTime: '07:00',
        category: 'marketing',
        status: 'pending',
        priority: 'high',
      });
    }

    // Logistics timeline - GEMS ticket (21 days before)
    if (eventData.ticketingNeeds === 'yes') {
      timeline.push({
        id: `${eventData.id}-${idCounter++}`,
        title: 'Submit GEMS Ticket',
        description: `Request: ${eventData.gemsDetails || 'Tables, chairs, and supplies'}`,
        dueDate: new Date(eventDate.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '', // 21 days before (3 weeks)
        dueTime: '07:00',
        category: 'logistics',
        status: 'pending',
        priority: 'high',
      });
    }

    // Email Campaign (14 days before)
    if (eventData.marketingChannels.includes('email')) {
      timeline.push({
        id: `${eventData.id}-${idCounter++}`,
        title: 'Send Email Campaign',
        description: 'Send promotional emails to target audience',
        dueDate: new Date(eventDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '', // 14 days before (2 weeks)
        dueTime: '07:00',
        category: 'marketing',
        status: 'pending',
        priority: 'high',
      });
    }

    // Preparation timeline
    timeline.push({
      id: `${eventData.id}-${idCounter++}`,
      title: 'Prepare Event Materials',
      description: 'Gather all materials, signage, and equipment',
      dueDate: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '', // 7 days before
      dueTime: '07:00',
      category: 'preparation',
      status: 'pending',
      priority: 'medium',
    });

    timeline.push({
      id: `${eventData.id}-${idCounter++}`,
      title: 'Final Venue Walkthrough',
      description: 'Visit venue to confirm setup and logistics',
      dueDate: new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '', // 3 days before
      dueTime: '07:00',
      category: 'logistics',
      status: 'pending',
      priority: 'high',
    });

    timeline.push({
      id: `${eventData.id}-${idCounter++}`,
      title: 'Team Briefing',
      description: 'Meet with team to review roles and responsibilities',
      dueDate: new Date(eventDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '', // 1 day before
      dueTime: '07:00',
      category: 'preparation',
      status: 'pending',
      priority: 'high',
    });

    // Execution timeline
    timeline.push({
      id: `${eventData.id}-${idCounter++}`,
      title: 'Event Setup',
      description: 'Arrive early to set up venue and equipment',
      dueDate: eventData.date || '',
      dueTime: '07:00',
      category: 'execution',
      status: 'pending',
      priority: 'high',
    });

    console.log('Generated timeline items:', timeline.length, timeline);
    return timeline.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };







  const openEventInfoModal = async (event: EventData) => {
    setSelectedEvent(event);
    setShowEventInfoModal(true);
    
    // Load team members for this event to get role assignments
    try {
      const logisticsData = await getEventLogistics(event.id);
      if (logisticsData && logisticsData.teamMembers) {
        setTeamMembers(logisticsData.teamMembers);
      } else {
        // No team members assigned yet, clear the state
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error loading team members for event:', error);
      setTeamMembers([]);
    }
  };



  const closeEventInfoModal = () => {
    setShowEventInfoModal(false);
    setSelectedEvent(null);
  };

  const openTimelineItemModal = (timelineItem: TimelineItem, eventId: string) => {
    setSelectedTimelineItem(timelineItem);
    setSelectedTimelineEventId(eventId);
    setShowTimelineItemModal(true);
  };

  const closeTimelineItemModal = () => {
    setShowTimelineItemModal(false);
    setSelectedTimelineItem(null);
    setSelectedTimelineEventId('');
  };

  const handleSelectedEventUpdate = async () => {
    if (!selectedEvent) return;

    try {
      await updateEvent(selectedEvent.id, selectedEvent);
      
      // Update local state instead of refetching from Firebase
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === selectedEvent.id ? { ...selectedEvent, profileType: event.profileType } as MultiProfileEventData : event
        )
      );
      
      // Update cache
      const profileType = isTeamMode ? 'team' : 'individual';
      const cacheKey = profileType as 'team' | 'individual';
      if (eventsCacheRef.current[cacheKey]) {
        eventsCacheRef.current[cacheKey] = eventsCacheRef.current[cacheKey]!.map(event => 
          event.id === selectedEvent.id ? { ...selectedEvent, profileType: event.profileType } as MultiProfileEventData : event
        );
      }
      
      closeEventInfoModal();
      // Event updated successfully
    } catch (error: any) {
      console.error('Error updating event:', error);
      
      // Handle specific error cases
      if (error.message?.includes('No document to update')) {
        alert('This event no longer exists. It may have been deleted. Refreshing the page...');
        window.location.reload();
      } else if (error.code === 'not-found') {
        alert('Event not found. It may have been deleted by another user. Refreshing the page...');
        window.location.reload();
      } else {
        alert(`Failed to update event: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const handleTimelineItemUpdate = async () => {
    if (!selectedTimelineItem || !selectedTimelineEventId) return;

    try {
      const timeline = eventTimelines[selectedTimelineEventId];
      if (!timeline) {
        throw new Error('Timeline not found');
      }
      const updatedTimeline = timeline.map(t => 
        t.id === selectedTimelineItem.id ? selectedTimelineItem : t
      );
      
      // Update local state
      setEventTimelines(prev => ({
        ...prev,
        [selectedTimelineEventId]: updatedTimeline,
      }));
      
      // Update cache to keep it in sync
      const profileType = isTeamMode ? 'team' : 'individual';
      const cacheKey = profileType as 'team' | 'individual';
      if (timelineCacheRef.current[cacheKey]) {
        timelineCacheRef.current[cacheKey]![selectedTimelineEventId] = updatedTimeline;
        persistTimelineCache();
      }
      
      // Persist to Firebase
      await updateEventTimelineItem(selectedTimelineEventId, updatedTimeline);
      
      closeTimelineItemModal();
      // Timeline item updated successfully
    } catch (error) {
      console.error('Error updating timeline item:', error);
      alert('Failed to update timeline item. Please try again.');
    }
  };

  const handleTimelineItemStatusUpdate = async (eventId: string, itemId: string, newStatus: 'pending' | 'confirmed' | 'completed') => {
    try {
      const timeline = eventTimelines[eventId];
      if (!timeline) {
        throw new Error('Timeline not found');
      }
      
      const updatedTimeline = timeline.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      );
      
      // Update local state
      setEventTimelines(prev => ({
        ...prev,
        [eventId]: updatedTimeline,
      }));
      
      // Update cache to keep it in sync
      const profileType = isTeamMode ? 'team' : 'individual';
      const cacheKey = profileType as 'team' | 'individual';
      if (timelineCacheRef.current[cacheKey]) {
        timelineCacheRef.current[cacheKey]![eventId] = updatedTimeline;
        persistTimelineCache();
      }
      
      // Persist to Firebase
      await updateEventTimelineItem(eventId, updatedTimeline);
      
      console.log(`Timeline item ${itemId} status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating timeline item status:', error);
      alert('Failed to update timeline item status. Please try again.');
    }
  };



  const handleEventDelete = async () => {
    if (!selectedEvent) return;

    // Check authentication first
    if (!currentUser) {
      alert('Please sign in with Google to delete events. Look for the sign-in button in the top-right corner.');
      return;
    }

    console.log('🔐 DELETE: User authenticated:', currentUser.uid, currentUser.email);

    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      // Refresh auth token before critical operations
      console.log('🔄 Refreshing auth token before delete...');
      await currentUser.getIdToken(true); // Force refresh
      
      const profileType = isTeamMode ? 'team' : 'individual';
      console.log('🗑️ DELETE: Starting delete for event:', selectedEvent.id, 'profileType:', profileType);
      
      await deleteEvent(selectedEvent.id, profileType);
      
      // Update local state
      setEvents(prevEvents => prevEvents.filter(event => event.id !== selectedEvent.id));
      
      // Remove timeline items for this event from local state
      setEventTimelines(prevTimelines => {
        const updatedTimelines = { ...prevTimelines };
        delete updatedTimelines[selectedEvent.id];
        return updatedTimelines;
      });
      
      // Update cache in memory
      const cacheKey = profileType as 'team' | 'individual';
      if (eventsCacheRef.current[cacheKey]) {
        eventsCacheRef.current[cacheKey] = eventsCacheRef.current[cacheKey]!.filter(event => event.id !== selectedEvent.id);
      }
      
      // Clear timeline cache for this specific event
      if (timelineCacheRef.current[cacheKey]) {
        delete timelineCacheRef.current[cacheKey]![selectedEvent.id];
      }
      
      // Clear ALL localStorage cache keys (both old and new systems)
      const localStorageKey = `eventflow-events-${cacheKey}`;
      const lastFetchKey = `eventflow-events-fetch-${cacheKey}`;
      const timelineKey = `eventflow-timeline-${cacheKey}`;
      const timelineFetchKey = `eventflow-timeline-fetch-${cacheKey}`;
      
      // Clear profile-specific keys
      localStorage.removeItem(localStorageKey);
      localStorage.removeItem(lastFetchKey);
      localStorage.removeItem(timelineKey);
      localStorage.removeItem(timelineFetchKey);
      
      // Clear old system keys (used by initializeEventsCache)
      localStorage.removeItem('eventflow-events-cache');
      localStorage.removeItem('eventflow-events-lastfetch');
      localStorage.removeItem('eventflow-timeline-cache');
      localStorage.removeItem('eventflow-timeline-lastfetch');
      
      // Clear in-memory caches too
      eventsCacheRef.current[cacheKey] = [];
      timelineCacheRef.current[cacheKey] = {};
      
      console.log('🧹 CACHE: Completely cleared ALL cache systems for:', cacheKey);
      
      console.log('✅ DELETE: Event successfully deleted and removed from UI');
      closeEventInfoModal();
    } catch (error: any) {
      console.error('🚨 DELETE ERROR:', error);
      
      // Handle specific auth errors
      if (error.code === 'auth/token-expired' || error.message?.includes('token')) {
        alert('Your session has expired. Please refresh the page and try again.');
      } else {
        alert(`Failed to delete event: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const handleTimelineItemDelete = async () => {
    if (!selectedTimelineItem || !selectedTimelineEventId) return;

    if (!confirm('Are you sure you want to delete this timeline task? This action cannot be undone.')) {
      return;
    }

    try {
      // Get current timeline items for this event
      const currentTimeline = eventTimelines[selectedTimelineEventId] || [];
      const updatedTimeline = currentTimeline.filter(item => item.id !== selectedTimelineItem.id);
      
      // Update Firebase
      await updateEventTimelineItem(selectedTimelineEventId, updatedTimeline);
      
      // Update local state
      setEventTimelines(prev => ({
        ...prev,
        [selectedTimelineEventId]: updatedTimeline,
      }));
      
      // Update cache
      const profileType = isTeamMode ? 'team' : 'individual';
      const cacheKey = profileType as 'team' | 'individual';
      if (timelineCacheRef.current[cacheKey]) {
        timelineCacheRef.current[cacheKey]![selectedTimelineEventId] = updatedTimeline;
        persistTimelineCache();
      }
      
      // Clear ALL localStorage cache to ensure consistency
      const localStorageKey = `eventflow-events-${cacheKey}`;
      const lastFetchKey = `eventflow-events-fetch-${cacheKey}`;
      const timelineKey = `eventflow-timeline-${cacheKey}`;
      const timelineFetchKey = `eventflow-timeline-fetch-${cacheKey}`;
      
      // Clear profile-specific keys
      localStorage.removeItem(localStorageKey);
      localStorage.removeItem(lastFetchKey);
      localStorage.removeItem(timelineKey);
      localStorage.removeItem(timelineFetchKey);
      
      // Clear old system keys
      localStorage.removeItem('eventflow-events-cache');
      localStorage.removeItem('eventflow-events-lastfetch');
      localStorage.removeItem('eventflow-timeline-cache');
      localStorage.removeItem('eventflow-timeline-lastfetch');
      
      console.log('🧹 CACHE: Cleared ALL cache systems for timeline deletion');
      
      closeTimelineItemModal();
    } catch (error) {
      console.error('Error deleting timeline item:', error);
      alert('Failed to delete timeline task. Please try again.');
    }
  };















  const formatGanttDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const abbreviateTitle = (title: string) => {
    // Common abbreviations for event planning tasks
    const abbreviations: { [key: string]: string } = {
      'Design and Print Flyers': 'Flyers',
      'MPD237 Meet The Coaches': 'MPD237',
      'Create Social Media Posts': 'Social Posts',
      'Send Email Invitations': 'Email Invites',
      'Book Venue': 'Venue',
      'Order Catering': 'Catering',
      'Set Up Equipment': 'Equipment',
      'Create Event Schedule': 'Schedule',
      'Send Reminder Emails': 'Reminders',
      'Prepare Presentation Materials': 'Materials',
      'Coordinate with Vendors': 'Vendors',
      'Finalize Guest List': 'Guest List',
      'Create Event Banners': 'Banners',
      'Set Up Registration System': 'Registration',
      'Prepare Welcome Packets': 'Welcome Packs',
      'Coordinate Parking': 'Parking',
      'Set Up Audio/Visual': 'A/V Setup',
      'Create Event Program': 'Program',
      'Prepare Thank You Notes': 'Thank Yous',
      'Clean Up Venue': 'Cleanup',
    };
    
    return abbreviations[title] || title.length > 20 ? title.substring(0, 20) + '...' : title;
  };

  const handleUserChange = (user: any) => {
    setCurrentUser(user);
  };

  const handleTeamModeChange = (isTeamMode: boolean) => {
    setIsTeamMode(isTeamMode);
    console.log('Switched to', isTeamMode ? 'team' : 'individual', 'mode');
  };



  // Memoized callback functions to prevent child component re-renders
  const handleToggleTimeline = useMemo(() => (eventId: string) => {
    setExpandedTimelines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  const handleToggleEventGroup = useMemo(() => (eventId: string) => {
    setCollapsedEventGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  const handleOpenDetailsModal = useMemo(() => (event: EventData) => {
    setSelectedEvent(event);
    setShowEventInfoModal(true);
    setSidebarCollapsed(false); // Expand sidebar when event is clicked
  }, []);

  const handleTimelineItemClick = useMemo(() => (eventId: string, item: TimelineItem) => {
    setSelectedTimelineItem(item);
    setSelectedTimelineEventId(eventId);
    setShowTimelineItemModal(true);
  }, []);

  const handleToggleCollapsed = useMemo(() => () => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Events are now loaded from separate data sources based on profile mode
  const filteredEvents = useMemo(() => {
    return events;
  }, [events]);

  // Memoized event timelines to prevent unnecessary re-renders
  const memoizedEventTimelines = useMemo(() => eventTimelines, [eventTimelines]);

  // Memoized function to get events for a specific date
  const getEventsForDate = useMemo(() => {
    return (date: Date) => {
      const dateString = date.toISOString().split('T')[0];
      const eventEvents = filteredEvents.filter(event => event.date === dateString);
      
      // Add confirmed timeline items for this date (only for team mode or user's own events)
      const timelineEvents = Object.values(memoizedEventTimelines).flat().filter(item => 
        item.dueDate === dateString && item.status === 'confirmed'
      ).map(item => ({
        id: `timeline-${item.id}`,
        name: item.title,
        date: item.dueDate,
        time: item.dueTime,
        location: 'Timeline Task',
        status: 'confirmed' as const,
        category: item.category,
        isTimelineItem: true,
      }));
      
      return [...eventEvents, ...timelineEvents];
    };
  }, [filteredEvents, memoizedEventTimelines]);

  // Memoized Gantt data generation
  const generateGanttData = useMemo((): GanttItem[] => {
    const ganttData: GanttItem[] = [];
    
    // Only include timeline items from expanded events (dash doesn't affect Gantt chart)
    filteredEvents.forEach(event => {
      if (expandedTimelines.has(event.id) && memoizedEventTimelines[event.id]) {
        memoizedEventTimelines[event.id]?.forEach(timelineItem => {
          const startDate = new Date(timelineItem.dueDate + ' ' + timelineItem.dueTime);
          const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hour duration default
          
          // Create a unique ID for Gantt items to avoid conflicts
          const uniqueId = `${event.id}-${timelineItem.id}-gantt`;
          
          ganttData.push({
            id: uniqueId,
            eventId: event.id,
            eventName: event.name,
            task: timelineItem.title,
            start: startDate,
            end: endDate,
            category: timelineItem.category,
            status: timelineItem.status === 'confirmed' ? 'completed' : 'pending',
            eventColor: event.color || '#10B981', // Add event color to Gantt items
          });
        });
      }
    });
    
    return ganttData.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [filteredEvents, expandedTimelines, memoizedEventTimelines]);

  const getWeekNumber = (date: Date) => {
    // Get the first Thursday of the year
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const firstThursday = new Date(firstDayOfYear);
    firstThursday.setDate(firstDayOfYear.getDate() + (4 - firstDayOfYear.getDay() + 7) % 7);
    
    // Get the first day of the week containing the first Thursday
    const firstWeekStart = new Date(firstThursday);
    firstWeekStart.setDate(firstThursday.getDate() - 3);
    
    // Calculate the week number
    const daysDiff = (date.getTime() - firstWeekStart.getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(daysDiff / 7) + 1;
  };

  const getWeekGridLines = useMemo(() => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const totalDays = endOfMonth.getDate();
    const weeks = [];
    
    for (let day = 1; day <= totalDays; day += 7) {
      const weekStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const weekEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), Math.min(day + 6, totalDays));
      
      const weekStartPercent = ((weekStart.getTime() - startOfMonth.getTime()) / (endOfMonth.getTime() - startOfMonth.getTime())) * 100;
      const weekEndPercent = ((weekEnd.getTime() - startOfMonth.getTime()) / (endOfMonth.getTime() - startOfMonth.getTime())) * 100;
      
      // Get the actual week number of the year
      const weekNumber = getWeekNumber(weekStart);
      
      weeks.push({
        start: weekStartPercent,
        end: weekEndPercent,
        label: `Week ${weekNumber}`,
      });
    }
    
    return weeks;
  }, [currentDate]);



  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const currentYear = new Date().getFullYear();
  const monthName = currentDate.getFullYear() === currentYear 
    ? currentDate.toLocaleDateString('en-US', { month: 'long' })
    : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthNameShort = currentDate.getFullYear() === currentYear 
    ? currentDate.toLocaleDateString('en-US', { month: 'short' })
    : currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex">
          <div className="flex-1 pr-[14px] sm:pr-[14px] lg:pr-[14px]">
            <div className="flex items-center justify-between py-2 sm:py-3">
              {/* Left side - Empty (hamburger moved to sidebar) */}
              <div className="flex-shrink-0 pl-[14px] sm:pl-[14px] lg:pl-[14px]">
              </div>
              
              {/* Left - EventFlow title */}
              <div className="flex-1 flex justify-start">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">EventFlow</h1>
              </div>
              
              {/* Right side - User Profile */}
              <div className="flex-shrink-0">
                <UserProfile 
                  onUserChange={handleUserChange}
                  onTeamModeChange={handleTeamModeChange}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex h-[calc(100vh-68px)] overflow-hidden">
        {/* Sidebar */}
        <div className="flex-shrink-0 h-full">
          <EventSidebar
            events={filteredEvents}
            isLoading={isLoading}
            expandedTimelines={expandedTimelines}
            collapsedEventGroups={collapsedEventGroups}
            eventTimelines={memoizedEventTimelines}
            collapsed={sidebarCollapsed}
            onToggleTimeline={handleToggleTimeline}
            onToggleEventGroup={handleToggleEventGroup}
            onOpenDetailsModal={handleOpenDetailsModal}
            onTimelineItemClick={handleTimelineItemClick}
            onTimelineItemStatusUpdate={handleTimelineItemStatusUpdate}
            onToggleCollapsed={handleToggleCollapsed}
            isTeamMode={isTeamMode}
          />
        </div>

        {/* Calendar/Timeline - Main Content */}
        <div className="flex-1 overflow-hidden relative transition-all duration-300 ease-in-out">
          <div className="bg-white shadow-sm h-full w-full">
            
            {/* Floating Action Button (FAB) */}
            <div className="fixed bottom-6 right-6 z-40">
              <Link
                href="/event-setup"
                className={`flex items-center justify-center w-14 h-14 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
                  isTeamMode 
                    ? 'bg-primary-600 hover:bg-primary-700' 
                    : 'bg-[#F59E0B] hover:bg-[#D97706]'
                }`}
                title="Create Event"
              >
                <Plus className="h-6 w-6" />
              </Link>
            </div>
            <div className="pr-4 sm:pr-6 lg:pr-8 py-[9px] border-b pl-4 sm:pl-6 lg:pl-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    
                  {/* Month Navigation */}
                  {viewMode === 'calendar' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        <span className="sm:hidden">{monthNameShort}</span>
                        <span className="hidden sm:inline">{monthName}</span>
                      </h3>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                  )}
                  {viewMode === 'gantt' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        <span className="sm:hidden">{monthNameShort}</span>
                        <span className="hidden sm:inline">{monthName}</span>
                      </h3>
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                  )}
                </div>
                  
                <div className="flex items-center space-x-4">
                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('calendar')}
                      className={`flex items-center space-x-2 px-2 sm:px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'calendar'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="hidden lg:inline">Calendar</span>
                    </button>
                    <button
                      onClick={() => setViewMode('gantt')}
                      className={`flex items-center space-x-2 px-2 sm:px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'gantt'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden lg:inline">Timeline</span>
                    </button>
                  </div>
                    

                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            {viewMode === 'calendar' && (
              <div className="px-4 sm:px-6 lg:px-8 py-6">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: startingDayOfWeek }, (_, i) => (
                    <div key={`empty-${i}`} className="h-32 bg-gray-50 rounded-lg"></div>
                  ))}

                  {/* Days of the month */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNumber = i + 1;
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
                    const dayEvents = getEventsForDate(date);
                    const isCurrentDay = isToday(date);

                    return (
                      <div
                        key={`${currentDate.getFullYear()}-${currentDate.getMonth()}-${dayNumber}`}
                        className={`h-32 border rounded-lg p-1 md:p-2 ${
                          isCurrentDay ? 'bg-primary-50 border-primary-200' : 'bg-white hover:bg-gray-50'
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.backgroundColor = '#f3f4f6'; // Light gray background when dragging over
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isCurrentDay ? '#eff6ff' : '#ffffff'; // Reset background
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          // Reset background color
                          e.currentTarget.style.backgroundColor = isCurrentDay ? '#eff6ff' : '#ffffff';
                              
                          try {
                            const jsonData = e.dataTransfer.getData('application/json');
                            // Drop data received
                                
                            if (!jsonData) {
                              // No drag data found
                              return;
                            }
                                
                            const data = JSON.parse(jsonData);
                            // Parsed drag data
                                
                            const { eventId, eventType, timelineItemId } = data;
                            const targetDate = date.toISOString().split('T')[0];
                            // Processing date change
                               
                            if (eventType === 'timeline') {
                              // Handle timeline item drag
                              const timeline = eventTimelines[eventId];
                              if (!timeline) {
                                // Timeline not found for event
                                return;
                              }
                                  
                              const updatedTimeline = timeline.map(t => 
                                t.id === timelineItemId ? { ...t, dueDate: targetDate || '' } : t
                              );
                                
                              // Update local state
                              setEventTimelines(prev => ({
                                ...prev,
                                [eventId]: updatedTimeline,
                              }));
                              
                              // Update cache to keep it in sync
                              const profileType = isTeamMode ? 'team' : 'individual';
                              const cacheKey = profileType as 'team' | 'individual';
                              if (timelineCacheRef.current[cacheKey]) {
                                timelineCacheRef.current[cacheKey]![eventId] = updatedTimeline;
                                persistTimelineCache();
                              }
                                
                              // Persist to Firebase
                              await updateEventTimelineItem(eventId, updatedTimeline);
                              // Timeline item moved
                            } else {
                              // Handle regular event drag
                              // Handling regular event drag
                              const event = events.find(e => e.id === eventId);
                              if (!event) {
                                // Event not found
                                return;
                              }
                                
                              // Found event for date update
                                
                              // Update event date
                              const updatedEvent = { ...event, date: targetDate };
                              // Updating event with new date
                              await updateEvent(eventId, updatedEvent);
                                
                              // Update local state instead of refetching from Firebase
                              setEvents(prevEvents => 
                                prevEvents.map(e => 
                                  e.id === eventId ? { ...updatedEvent, profileType: e.profileType } as MultiProfileEventData : e
                                )
                              );
                              
                              // Update cache
                              const profileType = isTeamMode ? 'team' : 'individual';
                              const cacheKey = profileType as 'team' | 'individual';
                              if (eventsCacheRef.current[cacheKey]) {
                                eventsCacheRef.current[cacheKey] = eventsCacheRef.current[cacheKey]!.map(e => 
                                  e.id === eventId ? { ...updatedEvent, profileType: e.profileType } as MultiProfileEventData : e
                                );
                              }
                              // Event moved successfully
                            }
                          } catch (error) {
                            console.error('Error dropping event:', error);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm font-medium ${
                            isCurrentDay ? 'text-primary-600' : 'text-gray-900'
                          }`}>
                            {dayNumber}
                          </span>
                          {isCurrentDay && (
                            <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                          )}
                        </div>
                          
                        {/* Events for this day */}
                        <div className="space-y-1 text-left">
                          {dayEvents.slice(0, 3).map((event, _index) => (
                            <div
                              key={event.id}
                              className={'text-xs p-1 rounded cursor-move text-left hover:opacity-80'}
                              style={{
                                backgroundColor: (event as CalendarEvent).isTimelineItem
                                  ? (() => {
                                    // For timeline items, find the parent event color
                                    const parentEvent = events.find(e => {
                                      const timeline = eventTimelines[e.id];
                                      return timeline && timeline.some(t => t.dueDate === event.date && t.title === event.name);
                                    });
                                    return parentEvent?.color || '#10B981';
                                  })()
                                  : ((event as EventData).color || '#10B981'),
                                color: '#FFFFFF',
                              }}
                              draggable
                              onDragStart={(e) => {
                                if ((event as CalendarEvent).isTimelineItem) {
                                  // For timeline items, we need to find the parent event
                                  const parentEvent = events.find(e => {
                                    const timeline = eventTimelines[e.id];
                                    return timeline && timeline.some(t => t.dueDate === event.date && t.title === event.name);
                                  });
                                    
                                  if (parentEvent) {
                                    const timeline = eventTimelines[parentEvent.id];
                                    const timelineItem = timeline?.find(t => t.dueDate === event.date && t.title === event.name);
                                      
                                    const dragData = { 
                                      eventId: parentEvent.id,
                                      timelineItemId: timelineItem?.id,
                                      eventType: 'timeline',
                                      originalDate: event.date,
                                      eventName: event.name,
                                    };
                                    // Timeline drag started
                                    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                                    e.dataTransfer.effectAllowed = 'move';
                                  }
                                } else {
                                  // For regular events
                                  const dragData = { 
                                    eventId: event.id, 
                                    eventType: 'event',
                                    originalDate: event.date,
                                    eventName: event.name,
                                  };
                                  // Event drag started
                                  e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                                  e.dataTransfer.effectAllowed = 'move';
                                }
                              }}
                              onClick={() => {
                                if ((event as CalendarEvent).isTimelineItem) {
                                  // For timeline items, find the parent event and timeline item
                                  const parentEvent = events.find(e => {
                                    const timeline = eventTimelines[e.id];
                                    return timeline && timeline.some(t => t.dueDate === event.date && t.title === event.name);
                                  });
                                  if (parentEvent) {
                                    const timeline = eventTimelines[parentEvent.id];
                                    const timelineItem = timeline?.find(t => t.dueDate === event.date && t.title === event.name);
                                    if (timelineItem) {
                                      openTimelineItemModal(timelineItem, parentEvent.id);
                                    }
                                  }
                                } else {
                                  // For regular events, open the event info modal
                                  const actualEvent = events.find(e => e.id === event.id);
                                  if (actualEvent) {
                                    openEventInfoModal(actualEvent);
                                  }
                                }
                              }}

                            >
                              <div className="font-medium truncate">
                                {event.name}
                              </div>
                              <div className="text-gray-700">
                                {event.time}
                              </div>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 text-left">
                                +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gantt Timeline */}
            {viewMode === 'gantt' && (
              <div className="px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto h-full">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading timeline...</p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No events yet</h4>
                    <p className="text-gray-600 mb-4">Create your first event to see the timeline</p>
                    <Link href="/event-setup" className="btn-primary">
                      <Plus className="h-4 w-4 mr-2" />
                        Create Event
                    </Link>
                  </div>
                ) : generateGanttData.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No timeline items to display</h4>
                    <p className="text-gray-600 mb-4">Expand events in the sidebar to see their timeline items</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Gantt Chart Header */}
                    <div className="mb-6">
                    </div>
                      

                      
                    {/* Gantt Chart */}
                    <div className="bg-white border rounded-lg overflow-hidden">
                      {/* Time Axis */}
                      <div className="border-b bg-gray-50 p-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-2">
                          <span>Timeline</span>
                          <span>{formatGanttDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))} - {formatGanttDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0))}</span>
                        </div>
                        {/* Week Labels */}
                        <div className="flex relative">
                          {getWeekGridLines.map((week, index) => (
                            <div
                              key={index}
                              className="absolute text-xs text-gray-500 font-medium"
                              style={{ 
                                left: `${week.start}%`,
                                transform: 'translateX(-50%)',
                              }}
                            >
                              {week.label}
                            </div>
                          ))}
                        </div>
                      </div>
                        
                      {/* Gantt Bars */}
                      <div className="p-4 space-y-3">
                        {generateGanttData.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center space-x-4"
                          >
                            {/* Task Info */}
                            <div className="w-48 flex-shrink-0">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: item.eventColor }}
                                ></div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 truncate" title={item.task}>{abbreviateTitle(item.task)}</p>
                                  <p className="text-xs text-gray-500">{item.eventName}</p>
                                </div>
                              </div>
                            </div>
                              
                            {/* Timeline Bar */}
                            <div className="flex-1 relative">
                              <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                                {/* Week Grid Lines */}
                                {getWeekGridLines.map((week, index) => (
                                  <div
                                    key={index}
                                    className="absolute top-0 bottom-0 border-l border-gray-300"
                                    style={{ left: `${week.start}%` }}
                                  />
                                ))}
                                  
                                {/* Today Indicator */}
                                {(() => {
                                  const today = new Date();
                                  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                                  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                                    
                                  // Only show if today is within the current month view
                                  if (today >= startOfMonth && today <= endOfMonth) {
                                    const todayPercent = ((today.getTime() - startOfMonth.getTime()) / (endOfMonth.getTime() - startOfMonth.getTime())) * 100;
                                    return (
                                      <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-20"
                                        style={{ left: `${todayPercent}%` }}
                                      />
                                    );
                                  }
                                  return null;
                                })()}
                                  
                                <div
                                  className="absolute top-1 left-1 right-1 h-6 rounded transition-all duration-300 hover:opacity-80 cursor-pointer z-10"
                                  style={{
                                    backgroundColor: item.eventColor,
                                    left: `${Math.max(0, ((item.start.getTime() - new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime()) / (new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getTime() - new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime())) * 100)}%`,
                                    width: `${Math.max(5, ((item.end.getTime() - item.start.getTime()) / (new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getTime() - new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime())) * 100)}%`,
                                  }}
                                  onClick={() => {
                                    const event = events.find(e => e.id === item.eventId);
                                    if (event) {
                                      openEventInfoModal(event);
                                    }
                                  }}
                                  title={`${item.task} - ${formatGanttDate(item.start)} to ${formatGanttDate(item.end)}`}
                                >
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-medium text-white drop-shadow-sm px-2 truncate">
                                      {abbreviateTitle(item.task)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatGanttDate(item.start)} - {formatGanttDate(item.end)}
                              </div>
                            </div>
                              
                            {/* Status - Only show if not completed */}
                            {item.status !== 'completed' && (
                              <div className="w-20 flex-shrink-0">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Pending
                                </span>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>




      {/* Event Info Modal */}
      {showEventInfoModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4"
          >
            <ModalHeader
              title="🎯 Edit Event Details"
              subtitle="Modify event information and settings"
              eventId={selectedEvent.id}
              onDelete={handleEventDelete}
              onSave={handleSelectedEventUpdate}
              onClose={closeEventInfoModal}
            />

            <div className="p-8 space-y-8">

              {/* Event Title and Color */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                  <input
                    type="text"
                    value={selectedEvent.name}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, name: e.target.value })}
                    className="form-input w-full text-lg font-semibold"
                    placeholder="Event title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Color</label>
                  <div className="flex space-x-2">
                    {EVENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setSelectedEvent({ ...selectedEvent, color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          selectedEvent.color === color.value
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Date and Time Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedEvent.date}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, date: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={selectedEvent.time}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, time: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={selectedEvent.eventEndTime || ''}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, eventEndTime: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Description</label>
                <textarea
                  value={selectedEvent.eventPurpose}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, eventPurpose: e.target.value })}
                  className="form-input w-full h-24"
                  placeholder="Event description..."
                  rows={3}
                />
              </div>

              {/* Contact Person and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                    {(() => {
                      const suggestedContact = getEventContactPerson(teamMembers);
                      return suggestedContact && !selectedEvent.pointOfContact.name ? (
                        <span className="text-xs text-blue-600 ml-1">(Suggested: {suggestedContact.name})</span>
                      ) : null;
                    })()}
                  </label>
                  <select
                    value={selectedEvent.pointOfContact.name}
                    onChange={(e) => {
                      const selectedCoach = coaches.find(coach => coach.name === e.target.value);
                      if (selectedCoach) {
                        setSelectedEvent({
                          ...selectedEvent,
                          pointOfContact: {
                            name: selectedCoach.name,
                            email: selectedCoach.email,
                            phone: selectedCoach.phone,
                          },
                        });
                      }
                    }}
                    className="form-input w-full"
                  >
                    <option value="">Select a contact person</option>
                    {(() => {
                      const eventLead = getEventContactPerson(teamMembers);
                      const otherCoaches = coaches.filter(coach => 
                        !eventLead || coach.name !== eventLead.name
                      );
                      
                      return (
                        <>
                          {eventLead && (
                            <option key={`event-lead-${eventLead.name}`} value={eventLead.name}>
                              {eventLead.name} (Event Lead - Default)
                            </option>
                          )}
                          {otherCoaches.map((coach) => (
                            <option key={coach.id} value={coach.name}>
                              {coach.name}
                            </option>
                          ))}
                        </>
                      );
                    })()}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={selectedEvent.location}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, location: e.target.value })}
                    className="form-input w-full"
                    placeholder="Event location"
                  />
                </div>
              </div>

              {/* Event Type & Scope */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <select
                    value={selectedEvent.eventType}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, eventType: e.target.value })}
                    className="form-input w-full"
                  >
                    <option value="">Select event type</option>
                    {EVENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Scope</label>
                  <select
                    value={selectedEvent.eventScope}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, eventScope: e.target.value as 'team' | 'individual' })}
                    className="form-input w-full"
                  >
                    {EVENT_SCOPES.map((scope) => (
                      <option key={scope.value} value={scope.value}>
                        {scope.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Marketing Channels & GEMS Ticket */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Marketing Channels</label>
                  <div className="space-y-3">
                    {MARKETING_CHANNELS.map((channel) => (
                      <label key={channel.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedEvent.marketingChannels.includes(channel.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEvent({
                                ...selectedEvent,
                                marketingChannels: [...selectedEvent.marketingChannels, channel.id],
                              });
                            } else {
                              setSelectedEvent({
                                ...selectedEvent,
                                marketingChannels: selectedEvent.marketingChannels.filter(c => c !== channel.id),
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{channel.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">GEMS Ticket Needed?</label>
                  <div className="space-y-3">
                    {TICKETING_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="ticketingNeeds"
                          value={option.value}
                          checked={selectedEvent.ticketingNeeds === option.value}
                          onChange={(e) => setSelectedEvent({ ...selectedEvent, ticketingNeeds: e.target.value })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  
                  {selectedEvent.ticketingNeeds === 'yes' && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">GEMS Ticket Details</label>
                      <textarea
                        value={selectedEvent.gemsDetails || DEFAULT_GEMS_DETAILS}
                        onChange={(e) => setSelectedEvent({ ...selectedEvent, gemsDetails: e.target.value })}
                        className="form-input w-full h-24"
                        placeholder="Specify quantities needed..."
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              </div>









              {/* Special Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                <textarea
                  value={selectedEvent.specialRequirements || ''}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, specialRequirements: e.target.value })}
                  className="form-input w-full h-20"
                  placeholder="Special requirements for this event..."
                />
              </div>

              {/* Other Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Notes</label>
                <textarea
                  value={selectedEvent.otherNotes || ''}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, otherNotes: e.target.value })}
                  className="form-input w-full h-20"
                  placeholder="Additional notes and comments..."
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Timeline Item Modal */}
      {showTimelineItemModal && selectedTimelineItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4"
          >
            <ModalHeader
              title="📋 Timeline Task Details"
              subtitle="Edit this individual timeline task"
              eventId={selectedTimelineEventId}
              onDelete={handleTimelineItemDelete}
              onSave={handleTimelineItemUpdate}
              onClose={closeTimelineItemModal}
              deleteLabel="Delete"
              deleteTitle="Delete Task"
            />

            <div className="p-8 space-y-8">

              {/* Task Title and Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                  <input
                    type="text"
                    value={selectedTimelineItem.title}
                    onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, title: e.target.value })}
                    className="form-input w-full text-lg font-semibold"
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedTimelineItem.category}
                    onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, category: e.target.value as any })}
                    className="form-input w-full"
                  >
                    {TASK_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={selectedTimelineItem.dueDate}
                    onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, dueDate: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Time</label>
                  <input
                    type="time"
                    value={selectedTimelineItem.dueTime}
                    onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, dueTime: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
                <textarea
                  value={selectedTimelineItem.description}
                  onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, description: e.target.value })}
                  className="form-input w-full h-24"
                  placeholder="Describe what needs to be done for this task..."
                />
              </div>

              {/* Priority and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={selectedTimelineItem.priority}
                    onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, priority: e.target.value as any })}
                    className="form-input w-full"
                  >
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedTimelineItem.status}
                    onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, status: e.target.value as any })}
                    className="form-input w-full"
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To
                  {(() => {
                    const suggestedAssignee = getSuggestedAssignee(teamMembers, selectedTimelineItem.category || '');
                    return suggestedAssignee && !selectedTimelineItem.assignedTo ? (
                      <span className="text-xs text-blue-600 ml-1">(Suggested: {suggestedAssignee.name})</span>
                    ) : null;
                  })()}
                </label>
                <select
                  value={selectedTimelineItem.assignedTo || ''}
                  onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, assignedTo: e.target.value })}
                  className="form-input w-full"
                >
                  <option value="">Select who is responsible for this task</option>
                  {(() => {
                    const suggestedAssignee = getSuggestedAssignee(teamMembers, selectedTimelineItem.category || '');
                    const otherCoaches = coaches.filter(coach => 
                      !suggestedAssignee || coach.name !== suggestedAssignee.name
                    );
                    
                    return (
                      <>
                        {suggestedAssignee && (
                          <option key={`suggested-${suggestedAssignee.name}`} value={suggestedAssignee.name}>
                            {suggestedAssignee.name} (Suggested for {selectedTimelineItem.category || 'this task'})
                          </option>
                        )}
                        {otherCoaches.map((coach) => (
                          <option key={coach.id} value={coach.name}>
                            {coach.name}
                          </option>
                        ))}
                      </>
                    );
                  })()}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={selectedTimelineItem.notes || ''}
                  onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, notes: e.target.value })}
                  className="form-input w-full h-20"
                  placeholder="Additional notes for this task..."
                />
              </div>
            </div>


          </motion.div>
        </div>
      )}
    </div>
  );
} 