'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Target, TrendingUp, CheckCircle, FileText, Zap, Plus, ChevronLeft, ChevronRight, BarChart3, RefreshCw, GripVertical, CalendarPlus } from 'lucide-react';
import Link from 'next/link';

import { getEvents, updateEvent, updateEventTimelineItem } from '@/lib/firebase-events';
import { Event } from '@/lib/types';
import { createTimelineEvent, formatTimeForCalendar } from '@/lib/google-calendar';
import EventSidebar from '@/components/Sidebar';


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

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'gantt'>('calendar');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedTimelines, setExpandedTimelines] = useState<Set<string>>(new Set());
  const [collapsedEventGroups, setCollapsedEventGroups] = useState<Set<string>>(new Set());
  const [eventTimelines, setEventTimelines] = useState<Record<string, TimelineItem[]>>({});
  const [showDetailsModal, setShowDetailsModal] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showEventInfoModal, setShowEventInfoModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showTimelineItemModal, setShowTimelineItemModal] = useState(false);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<TimelineItem | null>(null);
  const [selectedTimelineEventId, setSelectedTimelineEventId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await getEvents()
        console.log('Loaded events data:', eventsData)
        console.log('Event colors:', eventsData.map(e => ({ name: e.name, color: e.color })))
        setEvents(eventsData)
        
        // Load timeline items from Firebase for each event
        const timelineData: { [key: string]: TimelineItem[] } = {}
        for (const event of eventsData) {
          if (event.timelineItems && event.timelineItems.length > 0) {
            // Migrate timeline items to have unique IDs if they don't already
            const migratedTimeline = event.timelineItems.map((item, index) => {
              // Check if the item has an old hardcoded ID (just a number)
              if (/^\d+$/.test(item.id)) {
                return {
                  ...item,
                  id: `${event.id}-${index + 1}`
                }
              }
              return item
            })
            timelineData[event.id] = migratedTimeline
          } else {
            // Generate timeline if not stored in Firebase
            timelineData[event.id] = generateTimelineForEvent(event)
          }
        }
        setEventTimelines(timelineData)
      } catch (error) {
        console.error('Error loading events:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEvents()
  }, [])

  // Refresh events when returning to the page
  useEffect(() => {
    const handleFocus = () => {
      // Refresh events when user returns to the tab
      const loadEvents = async () => {
        try {
          const eventsData = await getEvents()
          setEvents(eventsData)
        } catch (error) {
          console.error('Error loading events:', error)
        }
      }
      loadEvents()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    return { daysInMonth, startingDayOfWeek }
  }

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    const eventEvents = events.filter(event => event.date === dateString)
    
    // Add confirmed timeline items for this date
    const timelineEvents = Object.values(eventTimelines).flat().filter(item => 
      item.dueDate === dateString && item.status === 'confirmed'
    ).map(item => ({
      id: `timeline-${item.id}`,
      name: item.title,
      date: item.dueDate,
      time: item.dueTime,
      location: 'Timeline Task',
      status: 'confirmed' as const,
      category: item.category,
      isTimelineItem: true
    }))
    
    return [...eventEvents, ...timelineEvents]
  }

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }



  const refreshEvents = async () => {
    setIsRefreshing(true)
    try {
      const eventsData = await getEvents()
      setEvents(eventsData)
      
      // Load timeline items from Firebase for each event
      const timelineData: { [key: string]: TimelineItem[] } = {}
      for (const event of eventsData) {
        if (event.timelineItems && event.timelineItems.length > 0) {
          // Migrate timeline items to have unique IDs if they don't already
          const migratedTimeline = event.timelineItems.map((item, index) => {
            // Check if the item has an old hardcoded ID (just a number)
            if (/^\d+$/.test(item.id)) {
              return {
                ...item,
                id: `${event.id}-${index + 1}`
              }
            }
            return item
          })
          timelineData[event.id] = migratedTimeline
        } else {
          // Generate timeline if not stored in Firebase
          timelineData[event.id] = generateTimelineForEvent(event)
        }
      }
      setEventTimelines(timelineData)
    } catch (error) {
      console.error('Error refreshing events:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const generateTimelineForEvent = (eventData: Event): TimelineItem[] => {
    const eventDate = new Date(eventData.date)
    const timeline: TimelineItem[] = []
    let idCounter = 1

    // Marketing timeline - First priority (30 days before)
    if (eventData.marketingChannels.includes('media')) {
      timeline.push({
        id: `${eventData.id}-${idCounter++}`,
        title: 'Create Social Media Content',
        description: 'Design and schedule social media posts for event promotion',
        dueDate: new Date(eventDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days before
        dueTime: '07:00',
        category: 'marketing',
        status: 'pending',
        priority: 'high'
      })
    }

    if (eventData.marketingChannels.includes('flyers')) {
      timeline.push({
        id: `${eventData.id}-${idCounter++}`,
        title: 'Design and Print Flyers',
        description: 'Create event flyers and arrange printing',
        dueDate: new Date(eventDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days before
        dueTime: '07:00',
        category: 'marketing',
        status: 'pending',
        priority: 'high'
      })
    }

    // Logistics timeline - GEMS ticket (21 days before)
    if (eventData.ticketingNeeds === 'yes') {
      timeline.push({
        id: `${eventData.id}-${idCounter++}`,
        title: 'Submit GEMS Ticket',
        description: `Request: ${eventData.gemsDetails || 'Tables, chairs, and supplies'}`,
        dueDate: new Date(eventDate.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 21 days before (3 weeks)
        dueTime: '07:00',
        category: 'logistics',
        status: 'pending',
        priority: 'high'
      })
    }

    // Email Campaign (14 days before)
    if (eventData.marketingChannels.includes('email')) {
      timeline.push({
        id: `${eventData.id}-${idCounter++}`,
        title: 'Send Email Campaign',
        description: 'Send promotional emails to target audience',
        dueDate: new Date(eventDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days before (2 weeks)
        dueTime: '07:00',
        category: 'marketing',
        status: 'pending',
        priority: 'high'
      })
    }

    // Preparation timeline
    timeline.push({
      id: `${eventData.id}-${idCounter++}`,
      title: 'Prepare Event Materials',
      description: 'Gather all materials, signage, and equipment',
      dueDate: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days before
      dueTime: '07:00',
      category: 'preparation',
      status: 'pending',
      priority: 'medium'
    })

    timeline.push({
      id: `${eventData.id}-${idCounter++}`,
      title: 'Final Venue Walkthrough',
      description: 'Visit venue to confirm setup and logistics',
      dueDate: new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days before
      dueTime: '07:00',
      category: 'logistics',
      status: 'pending',
      priority: 'high'
    })

    timeline.push({
      id: `${eventData.id}-${idCounter++}`,
      title: 'Team Briefing',
      description: 'Meet with team to review roles and responsibilities',
      dueDate: new Date(eventDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day before
      dueTime: '07:00',
      category: 'preparation',
      status: 'pending',
      priority: 'high'
    })

    // Execution timeline
    timeline.push({
      id: `${eventData.id}-${idCounter++}`,
      title: 'Event Setup',
      description: 'Arrive early to set up venue and equipment',
      dueDate: eventData.date,
      dueTime: '07:00',
      category: 'execution',
      status: 'pending',
      priority: 'high'
    })

    return timeline.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  }



  const toggleTimelineExpanded = (eventId: string) => {
    setExpandedTimelines(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
        // Generate timeline when expanding
        const event = events.find(e => e.id === eventId)
        if (event && !eventTimelines[eventId]) {
          const timeline = generateTimelineForEvent(event)
          setEventTimelines(prev => ({ ...prev, [eventId]: timeline }))
        }
      }
      return newSet
    })
  }

  const toggleEventGroup = (eventId: string) => {
    setCollapsedEventGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
        console.log(`Expanded event group: ${eventId}`)
      } else {
        newSet.add(eventId)
        console.log(`Collapsed event group: ${eventId}`)
        
        // When collapsing an event group, also collapse its timeline if it's expanded
        setExpandedTimelines(prevTimelines => {
          const newTimelineSet = new Set(prevTimelines)
          if (newTimelineSet.has(eventId)) {
            newTimelineSet.delete(eventId)
            console.log(`Auto-collapsed timeline for event: ${eventId}`)
          }
          return newTimelineSet
        })
      }
      return newSet
    })
  }

  const openDetailsModal = (event: Event) => {
    console.log('Opening event details:', event)
    console.log('Event color:', event.color)
    setEditingEvent({ ...event })
    setShowDetailsModal(event.id)
  }

  const closeDetailsModal = () => {
    setShowDetailsModal(null)
    setEditingEvent(null)
  }

  const openEventInfoModal = (event: Event) => {
    setSelectedEvent(event)
    setShowEventInfoModal(true)
  }

  const closeEventInfoModal = () => {
    setShowEventInfoModal(false)
    setSelectedEvent(null)
  }

  const openTimelineItemModal = (timelineItem: TimelineItem, eventId: string) => {
    setSelectedTimelineItem(timelineItem)
    setSelectedTimelineEventId(eventId)
    setShowTimelineItemModal(true)
  }

  const closeTimelineItemModal = () => {
    setShowTimelineItemModal(false)
    setSelectedTimelineItem(null)
    setSelectedTimelineEventId('')
  }

  const handleSelectedEventUpdate = async () => {
    if (!selectedEvent) return

    try {
      await updateEvent(selectedEvent.id, selectedEvent)
      
      // Refresh events
      const eventsData = await getEvents()
      setEvents(eventsData)
      
      closeEventInfoModal()
      console.log('Event updated successfully')
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Failed to update event. Please try again.')
    }
  }

  const handleTimelineItemUpdate = async () => {
    if (!selectedTimelineItem || !selectedTimelineEventId) return

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
        [selectedTimelineEventId]: updatedTimeline
      }))
      
      // Persist to Firebase
      await updateEventTimelineItem(selectedTimelineEventId, updatedTimeline)
      
      closeTimelineItemModal()
      console.log('Timeline item updated successfully')
    } catch (error) {
      console.error('Error updating timeline item:', error)
      alert('Failed to update timeline item. Please try again.')
    }
  }

  const handleEventUpdate = async () => {
    if (!editingEvent) return

    try {
      await updateEvent(editingEvent.id, editingEvent)
      // Refresh events
      const eventsData = await getEvents()
      setEvents(eventsData)
      
      // Also refresh timeline data to ensure colors are updated
      const timelineData: { [key: string]: TimelineItem[] } = {}
      for (const event of eventsData) {
        if (event.timelineItems && event.timelineItems.length > 0) {
          // Migrate timeline items to have unique IDs if they don't already
          const migratedTimeline = event.timelineItems.map((item, index) => {
            // Check if the item has an old hardcoded ID (just a number)
            if (/^\d+$/.test(item.id)) {
              return {
                ...item,
                id: `${event.id}-${index + 1}`
              }
            }
            return item
          })
          timelineData[event.id] = migratedTimeline
        } else {
          // Generate timeline if not stored in Firebase
          timelineData[event.id] = generateTimelineForEvent(event)
        }
      }
      setEventTimelines(timelineData)
      
      closeDetailsModal()
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Failed to update event. Please try again.')
    }
  }

  const syncToGoogleCalendar = async () => {
    setIsSyncing(true)
    try {
      // Get all confirmed timeline items
      const confirmedItems = Object.values(eventTimelines).flat().filter(item => 
        item.status === 'confirmed'
      )
      
      if (confirmedItems.length === 0) {
        alert('No confirmed timeline items to sync!')
        return
      }

      // Create calendar events for each confirmed item
      const syncPromises = confirmedItems.map(async (item) => {
        const event = events.find(e => 
          Object.values(eventTimelines).flat().some(t => t.id === item.id && eventTimelines[e.id]?.includes(t))
        )
        
        if (!event) return null

        return createTimelineEvent(
          event.name,
          item.title,
          item.dueDate,
          formatTimeForCalendar(item.dueTime),
          item.dueDate,
          formatTimeForCalendar(item.dueTime),
          event.location,
          item.description,
          [event.pointOfContact.email]
        )
      })

      const results = await Promise.all(syncPromises)
      const successfulSyncs = results.filter(r => r !== null).length
      
      alert(`✅ Successfully synced ${successfulSyncs} timeline items to Google Calendar!`)
      
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error)
      alert('❌ Failed to sync to Google Calendar. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }



  const confirmTimelineItem = async (eventId: string, itemId: string) => {
    const event = events.find(e => e.id === eventId)
    const timeline = eventTimelines[eventId]
    const item = timeline?.find(t => t.id === itemId);
    
    if (!event || !item || !timeline) return;

    try {
      // Update timeline status immediately for better UX
      const updatedTimeline = timeline.map(t => 
        t.id === itemId ? { ...t, status: 'confirmed' as const } : t
      );
      
      setEventTimelines(prev => ({
        ...prev,
        [eventId]: updatedTimeline
      }))

      // Persist timeline items to Firebase
      await updateEventTimelineItem(eventId, updatedTimeline)

      // Update event status in Firebase if this is the first confirmed item
      const confirmedCount = updatedTimeline.filter(t => t.status === 'confirmed').length
      if (confirmedCount === 1) {
        await updateEvent(event.id, { status: 'active' })
        // Refresh events
        const eventsData = await getEvents()
        setEvents(eventsData)
      }

      // Log for debugging
      console.log(`Timeline item confirmed: ${item.title}`)
      
    } catch (error) {
      console.error('Error confirming timeline item:', error)
      alert('❌ Failed to confirm timeline item. Please try again.')
    }
  }



  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'marketing': return <TrendingUp className="h-4 w-4" />
      case 'logistics': return <Calendar className="h-4 w-4" />
      case 'preparation': return <Target className="h-4 w-4" />
      case 'execution': return <Zap className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'marketing': return 'bg-blue-100 text-blue-800'
      case 'logistics': return 'bg-green-100 text-green-800'
      case 'preparation': return 'bg-yellow-100 text-yellow-800'
      case 'execution': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const generateGanttData = (): GanttItem[] => {
    const ganttData: GanttItem[] = []
    
    // Only include timeline items from expanded events (dash doesn't affect Gantt chart)
    events.forEach(event => {
      if (expandedTimelines.has(event.id) && eventTimelines[event.id]) {
        eventTimelines[event.id].forEach(timelineItem => {
          const startDate = new Date(timelineItem.dueDate + ' ' + timelineItem.dueTime)
          const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // 2 hour duration default
          
          // Create a unique ID for Gantt items to avoid conflicts
          const uniqueId = `${event.id}-${timelineItem.id}-gantt`
          
          ganttData.push({
            id: uniqueId,
            eventId: event.id,
            eventName: event.name,
            task: timelineItem.title,
            start: startDate,
            end: endDate,
            category: timelineItem.category,
            status: timelineItem.status === 'confirmed' ? 'completed' : 'pending',
            eventColor: event.color || '#10B981' // Add event color to Gantt items
          })
        })
      }
    })
    
    return ganttData.sort((a, b) => a.start.getTime() - b.start.getTime())
  }



  const formatGanttDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

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
      'Clean Up Venue': 'Cleanup'
    }
    
    return abbreviations[title] || title.length > 20 ? title.substring(0, 20) + '...' : title
  }

  const getWeekGridLines = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const totalDays = endOfMonth.getDate()
    const weeks = []
    
    for (let day = 1; day <= totalDays; day += 7) {
      const weekStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const weekEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), Math.min(day + 6, totalDays))
      
      const weekStartPercent = ((weekStart.getTime() - startOfMonth.getTime()) / (endOfMonth.getTime() - startOfMonth.getTime())) * 100
      const weekEndPercent = ((weekEnd.getTime() - startOfMonth.getTime()) / (endOfMonth.getTime() - startOfMonth.getTime())) * 100
      
      // Get the actual week number of the year
      const weekNumber = getWeekNumber(weekStart)
      
      weeks.push({
        start: weekStartPercent,
        end: weekEndPercent,
        label: `Week ${weekNumber}`
      })
    }
    
    return weeks
  }

  const getWeekNumber = (date: Date) => {
    // Get the first Thursday of the year
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const firstThursday = new Date(firstDayOfYear)
    firstThursday.setDate(firstDayOfYear.getDate() + (4 - firstDayOfYear.getDay() + 7) % 7)
    
    // Get the first day of the week containing the first Thursday
    const firstWeekStart = new Date(firstThursday)
    firstWeekStart.setDate(firstThursday.getDate() - 3)
    
    // Calculate the week number
    const daysDiff = (date.getTime() - firstWeekStart.getTime()) / (1000 * 60 * 60 * 24)
    return Math.floor(daysDiff / 7) + 1
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
  const currentYear = new Date().getFullYear()
  const monthName = currentDate.getFullYear() === currentYear 
    ? currentDate.toLocaleDateString('en-US', { month: 'long' })
    : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const monthNameShort = currentDate.getFullYear() === currentYear 
    ? currentDate.toLocaleDateString('en-US', { month: 'short' })
    : currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex">
          {/* Header content aligned with sidebar */}
          <div className="w-[225px] flex-shrink-0 hidden lg:block"></div>
          <div className="flex-1 pr-4 sm:pr-6 lg:pr-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">EventFlow</h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={refreshEvents}
                  disabled={isRefreshing}
                  className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Refresh events"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <Link href="/event-setup" className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                  <CalendarPlus className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex h-[calc(100vh-88px)] overflow-hidden">
        {/* Sidebar */}
        <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[60px]' : 'w-[225px]'}`}>
          <EventSidebar
            events={events}
            isLoading={isLoading}
            expandedTimelines={expandedTimelines}
            collapsedEventGroups={collapsedEventGroups}
            eventTimelines={eventTimelines}
            collapsed={sidebarCollapsed}
            onToggleTimeline={toggleTimelineExpanded}
            onToggleEventGroup={toggleEventGroup}
            onOpenDetailsModal={openDetailsModal}
            onTimelineItemClick={(eventId, item) => openTimelineItemModal(item, eventId)}
            onConfirmTimelineItem={confirmTimelineItem}
            onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Calendar/Timeline - Main Content */}
        <div className="flex-1 overflow-hidden relative ml-0 transition-all duration-300 ease-in-out">
          <div className="bg-white shadow-sm h-full w-full">
            <div className={`pr-4 sm:pr-6 lg:pr-8 py-2.5 border-b ${sidebarCollapsed ? 'pl-6 sm:pl-8 lg:pl-10' : 'pl-[120px] sm:pl-[120px] lg:pl-[140px]'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Event/Calendar Icon */}
                    <div className="flex items-center space-x-2">
                      {viewMode === 'calendar' ? (
                        <Calendar className="h-6 w-6 text-primary-600" />
                      ) : (
                        <BarChart3 className="h-6 w-6 text-primary-600" />
                      )}
                    </div>
                    
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
                        className={`flex items-center space-x-2 px-2 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
                        className={`flex items-center space-x-2 px-2 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          viewMode === 'gantt'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden lg:inline">Timeline</span>
                      </button>
                    </div>
                    
                    {/* Sync Button */}
                    {viewMode === 'calendar' && (
                      <button
                        onClick={syncToGoogleCalendar}
                        disabled={isSyncing}
                        className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Sync confirmed timeline items to Google Calendar"
                      >
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      </button>
                    )}
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
                      const dayNumber = i + 1
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber)
                      const dayEvents = getEventsForDate(date)
                      const isCurrentDay = isToday(date)

                      return (
                        <div
                          key={`${currentDate.getFullYear()}-${currentDate.getMonth()}-${dayNumber}`}
                          className={`h-32 border rounded-lg p-1 md:p-2 ${
                            isCurrentDay ? 'bg-primary-50 border-primary-200' : 'bg-white hover:bg-gray-50'
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.currentTarget.style.backgroundColor = '#f3f4f6' // Light gray background when dragging over
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isCurrentDay ? '#eff6ff' : '#ffffff' // Reset background
                          }}
                                                      onDrop={async (e) => {
                              e.preventDefault()
                              // Reset background color
                              e.currentTarget.style.backgroundColor = isCurrentDay ? '#eff6ff' : '#ffffff'
                              
                                                            try {
                                const jsonData = e.dataTransfer.getData('application/json')
                                console.log('Drop data received:', jsonData)
                                
                                if (!jsonData) {
                                  console.log('No drag data found')
                                  return
                                }
                                
                                                                const data = JSON.parse(jsonData)
                                console.log('Parsed drag data:', data)
                                
                                const { eventId, eventType, originalDate, timelineItemId } = data
                                const targetDate = date.toISOString().split('T')[0]
                                console.log('Target date:', targetDate, 'Original date:', originalDate)
                               
                                if (eventType === 'timeline') {
                                  // Handle timeline item drag
                                  const timeline = eventTimelines[eventId]
                                  if (!timeline) {
                                    console.log('Timeline not found for event:', eventId)
                                    return
                                  }
                                  
                                  const updatedTimeline = timeline.map(t => 
                                    t.id === timelineItemId ? { ...t, dueDate: targetDate } : t
                                  )
                                
                                // Update local state
                                setEventTimelines(prev => ({
                                  ...prev,
                                  [eventId]: updatedTimeline
                                }))
                                
                                // Persist to Firebase
                                await updateEventTimelineItem(eventId, updatedTimeline)
                                console.log(`Timeline item moved to ${targetDate}`)
                              } else {
                                // Handle regular event drag
                                console.log('Handling regular event drag')
                                const event = events.find(e => e.id === eventId)
                                if (!event) {
                                  console.log('Event not found:', eventId)
                                  return
                                }
                                
                                console.log('Found event:', event.name, 'Current date:', event.date)
                                
                                // Update event date
                                const updatedEvent = { ...event, date: targetDate }
                                console.log('Updating event with new date:', targetDate)
                                await updateEvent(eventId, updatedEvent)
                                
                                // Refresh events
                                console.log('Refreshing events...')
                                const eventsData = await getEvents()
                                setEvents(eventsData)
                                console.log(`Event moved to ${targetDate}`)
                              }
                            } catch (error) {
                              console.error('Error dropping event:', error)
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
                            {dayEvents.slice(0, 3).map((event, index) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded cursor-move text-left hover:opacity-80`}
                                style={{
                                  backgroundColor: (event as any).isTimelineItem 
                                    ? (() => {
                                        // For timeline items, find the parent event color
                                        const parentEvent = events.find(e => {
                                          const timeline = eventTimelines[e.id]
                                          return timeline && timeline.some(t => t.dueDate === event.date && t.title === event.name)
                                        })
                                        return parentEvent?.color || '#10B981'
                                      })()
                                    : ((event as Event).color || '#10B981'),
                                  color: '#FFFFFF'
                                }}
                                draggable
                                onDragStart={(e) => {
                                  if ((event as any).isTimelineItem) {
                                    // For timeline items, we need to find the parent event
                                    const parentEvent = events.find(e => {
                                      const timeline = eventTimelines[e.id]
                                      return timeline && timeline.some(t => t.dueDate === event.date && t.title === event.name)
                                    })
                                    
                                    if (parentEvent) {
                                      const timeline = eventTimelines[parentEvent.id]
                                      const timelineItem = timeline.find(t => t.dueDate === event.date && t.title === event.name)
                                      
                                      const dragData = { 
                                        eventId: parentEvent.id,
                                        timelineItemId: timelineItem?.id,
                                        eventType: 'timeline',
                                        originalDate: event.date,
                                        eventName: event.name
                                      }
                                      console.log('Timeline drag started with data:', dragData)
                                      e.dataTransfer.setData('application/json', JSON.stringify(dragData))
                                      e.dataTransfer.effectAllowed = 'move'
                                    }
                                  } else {
                                    // For regular events
                                    const dragData = { 
                                      eventId: event.id, 
                                      eventType: 'event',
                                      originalDate: event.date,
                                      eventName: event.name
                                    }
                                    console.log('Event drag started with data:', dragData)
                                    e.dataTransfer.setData('application/json', JSON.stringify(dragData))
                                    e.dataTransfer.effectAllowed = 'move'
                                  }
                                }}
                                onClick={() => {
                                  if ((event as any).isTimelineItem) {
                                    // For timeline items, find the parent event and timeline item
                                    const parentEvent = events.find(e => {
                                      const timeline = eventTimelines[e.id]
                                      return timeline && timeline.some(t => t.dueDate === event.date && t.title === event.name)
                                    })
                                    if (parentEvent) {
                                      const timeline = eventTimelines[parentEvent.id]
                                      const timelineItem = timeline.find(t => t.dueDate === event.date && t.title === event.name)
                                      if (timelineItem) {
                                        openTimelineItemModal(timelineItem, parentEvent.id)
                                      }
                                    }
                                  } else {
                                    // For regular events, open the event info modal
                                    const actualEvent = events.find(e => e.id === event.id)
                                    if (actualEvent) {
                                      openEventInfoModal(actualEvent)
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
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Gantt Timeline */}
              {viewMode === 'gantt' && (
                <div className={`pr-4 sm:pr-6 lg:pr-8 py-6 overflow-y-auto h-full ${sidebarCollapsed ? 'pl-6 sm:pl-8 lg:pl-10' : 'pl-[120px] sm:pl-[120px] lg:pl-[140px]'}`}>
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
                  ) : generateGanttData().length === 0 ? (
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
                            {getWeekGridLines().map((week, index) => (
                              <div
                                key={index}
                                className="absolute text-xs text-gray-500 font-medium"
                                style={{ 
                                  left: `${week.start}%`,
                                  transform: 'translateX(-50%)'
                                }}
                              >
                                {week.label}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Gantt Bars */}
                        <div className="p-4 space-y-3">
                          {generateGanttData().map((item) => (
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
                                  {getWeekGridLines().map((week, index) => (
                                    <div
                                      key={index}
                                      className="absolute top-0 bottom-0 border-l border-gray-300"
                                      style={{ left: `${week.start}%` }}
                                    />
                                  ))}
                                  
                                  {/* Today Indicator */}
                                  {(() => {
                                    const today = new Date()
                                    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                                    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                                    
                                    // Only show if today is within the current month view
                                    if (today >= startOfMonth && today <= endOfMonth) {
                                      const todayPercent = ((today.getTime() - startOfMonth.getTime()) / (endOfMonth.getTime() - startOfMonth.getTime())) * 100
                                      return (
                                        <div
                                          className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-20"
                                          style={{ left: `${todayPercent}%` }}
                                        />
                                      )
                                    }
                                    return null
                                  })()}
                                  
                                  <div
                                    className="absolute top-1 left-1 right-1 h-6 rounded transition-all duration-300 hover:opacity-80 cursor-pointer z-10"
                                    style={{
                                      backgroundColor: item.eventColor,
                                      left: `${Math.max(0, ((item.start.getTime() - new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime()) / (new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getTime() - new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime())) * 100)}%`,
                                      width: `${Math.max(5, ((item.end.getTime() - item.start.getTime()) / (new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getTime() - new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime())) * 100)}%`
                                    }}
                                    onClick={() => {
                                      const event = events.find(e => e.id === item.eventId)
                                      if (event) {
                                        openEventInfoModal(event)
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

      {/* Details Modal */}
      {showDetailsModal && editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
                <button
                  onClick={closeDetailsModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  <input
                    type="text"
                    value={editingEvent.name}
                    onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <input
                    type="text"
                    value={editingEvent.eventType || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, eventType: e.target.value })}
                    className="form-input w-full"
                    placeholder="e.g., Workshop, Pop-up Class"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Color</label>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-gray-300 cursor-pointer"
                      style={{ backgroundColor: editingEvent.color || '#10B981' }}
                      onClick={() => {
                        const colors = [
                          '#10B981', // Green (default)
                          '#3B82F6', // Blue
                          '#F59E0B', // Amber
                          '#EF4444', // Red
                          '#8B5CF6', // Purple
                          '#EC4899', // Pink
                          '#06B6D4', // Cyan
                          '#84CC16', // Lime
                          '#F97316', // Orange
                          '#6B7280', // Gray
                        ]
                        const currentIndex = colors.indexOf(editingEvent.color || '#10B981')
                        const nextIndex = (currentIndex + 1) % colors.length
                        setEditingEvent({ ...editingEvent, color: colors[nextIndex] })
                      }}
                      title="Click to cycle through colors"
                    />
                    <span className="text-sm text-gray-600">
                      {editingEvent.color || '#10B981'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={editingEvent.time}
                    onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={editingEvent.eventEndTime || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, eventEndTime: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editingEvent.location}
                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Point of Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editingEvent.pointOfContact.name}
                      onChange={(e) => setEditingEvent({
                        ...editingEvent,
                        pointOfContact: { ...editingEvent.pointOfContact, name: e.target.value }
                      })}
                      className="form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editingEvent.pointOfContact.email}
                      onChange={(e) => setEditingEvent({
                        ...editingEvent,
                        pointOfContact: { ...editingEvent.pointOfContact, email: e.target.value }
                      })}
                      className="form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editingEvent.pointOfContact.phone || ''}
                      onChange={(e) => setEditingEvent({
                        ...editingEvent,
                        pointOfContact: { ...editingEvent.pointOfContact, phone: e.target.value }
                      })}
                      className="form-input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Purpose</label>
                <textarea
                  value={editingEvent.eventPurpose}
                  onChange={(e) => setEditingEvent({ ...editingEvent, eventPurpose: e.target.value })}
                  className="form-input w-full h-20"
                  placeholder="Describe the purpose and goals of this event..."
                />
              </div>

              {/* Marketing Channels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marketing Channels</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['media', 'flyers', 'email', 'showy'].map((channel) => (
                    <label key={channel} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingEvent.marketingChannels.includes(channel)}
                        onChange={(e) => {
                          const newChannels = e.target.checked
                            ? [...editingEvent.marketingChannels, channel]
                            : editingEvent.marketingChannels.filter(c => c !== channel)
                          setEditingEvent({ ...editingEvent, marketingChannels: newChannels })
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* GEMS Ticket */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GEMS Ticket</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="ticketingNeeds"
                      value="yes"
                      checked={editingEvent.ticketingNeeds === 'yes'}
                      onChange={(e) => setEditingEvent({ ...editingEvent, ticketingNeeds: e.target.value })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="ticketingNeeds"
                      value="no"
                      checked={editingEvent.ticketingNeeds === 'no'}
                      onChange={(e) => setEditingEvent({ ...editingEvent, ticketingNeeds: e.target.value })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
                {editingEvent.ticketingNeeds === 'yes' && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">GEMS Details</label>
                    <textarea
                      value={editingEvent.gemsDetails || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, gemsDetails: e.target.value })}
                      className="form-input w-full h-20"
                      placeholder="# of Chairs:&#10;# of Tables:&#10;# of Table Cloths:&#10;Additional requirements:"
                    />
                  </div>
                )}
              </div>

              {/* Special Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                <textarea
                  value={editingEvent.specialRequirements || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, specialRequirements: e.target.value })}
                  className="form-input w-full h-20"
                  placeholder="Any special requirements, equipment, or accommodations needed..."
                />
              </div>

              {/* Other Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Notes</label>
                <textarea
                  value={editingEvent.otherNotes || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, otherNotes: e.target.value })}
                  className="form-input w-full h-20"
                  placeholder="Additional notes or comments..."
                />
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={closeDetailsModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEventUpdate}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Event Info Modal */}
      {showEventInfoModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Event Information</h3>
                <button
                  onClick={closeEventInfoModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Calendar Event Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">📅 Calendar Event Details</h4>
                <p className="text-xs text-blue-700">Edit these details before syncing to Google Calendar</p>
              </div>

              {/* Basic Calendar Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                  <input
                    type="text"
                    value={selectedEvent.name}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, name: e.target.value })}
                    className="form-input w-full"
                    placeholder="Event title for calendar"
                  />
                </div>
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
                <div className="md:col-span-2">
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

              {/* Event Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Description</label>
                <textarea
                  value={selectedEvent.eventPurpose}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, eventPurpose: e.target.value })}
                  className="form-input w-full h-24"
                  placeholder="Description that will appear in the calendar event..."
                />
              </div>

              {/* Contact Information for Calendar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={selectedEvent.pointOfContact.name}
                      onChange={(e) => setSelectedEvent({
                        ...selectedEvent,
                        pointOfContact: { ...selectedEvent.pointOfContact, name: e.target.value }
                      })}
                      className="form-input w-full"
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={selectedEvent.pointOfContact.email}
                      onChange={(e) => setSelectedEvent({
                        ...selectedEvent,
                        pointOfContact: { ...selectedEvent.pointOfContact, email: e.target.value }
                      })}
                      className="form-input w-full"
                      placeholder="Contact email"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={selectedEvent.specialRequirements || ''}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, specialRequirements: e.target.value })}
                  className="form-input w-full h-20"
                  placeholder="Any additional notes for the calendar event..."
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Make your changes, then save and sync to Google Calendar
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={closeEventInfoModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSelectedEventUpdate}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Save
                </button>
                <button
                  onClick={async () => {
                    await handleSelectedEventUpdate()
                    // After saving, sync to Google Calendar
                    try {
                      await syncToGoogleCalendar()
                      closeEventInfoModal()
                    } catch (error) {
                      console.error('Error syncing to calendar:', error)
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Save & Sync to Calendar</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Timeline Item Modal */}
      {showTimelineItemModal && selectedTimelineItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit Timeline Task</h3>
                <button
                  onClick={closeTimelineItemModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Task Details */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <h4 className="text-sm font-medium text-green-900 mb-2">📋 Timeline Task Details</h4>
                <p className="text-xs text-green-700">Edit this individual timeline task</p>
              </div>

              {/* Basic Task Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                  <input
                    type="text"
                    value={selectedTimelineItem.title}
                    onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, title: e.target.value })}
                    className="form-input w-full"
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
                    <option value="marketing">Marketing</option>
                    <option value="logistics">Logistics</option>
                    <option value="preparation">Preparation</option>
                    <option value="execution">Execution</option>
                  </select>
                </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={selectedTimelineItem.priority}
                    onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, priority: e.target.value as any })}
                    className="form-input w-full"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedTimelineItem.status}
                    onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, status: e.target.value as any })}
                    className="form-input w-full"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                  </select>
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

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <input
                  type="text"
                  value={selectedTimelineItem.assignedTo || ''}
                  onChange={(e) => setSelectedTimelineItem({ ...selectedTimelineItem, assignedTo: e.target.value })}
                  className="form-input w-full"
                  placeholder="Who is responsible for this task?"
                />
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

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Edit this timeline task and save your changes
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={closeTimelineItemModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTimelineItemUpdate}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
} 