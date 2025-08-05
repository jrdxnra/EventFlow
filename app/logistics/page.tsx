'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Users, Calendar, Clock, User, Phone, Mail, MapPin, Trash2, Edit3, Save, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { getEventLogistics, saveEventLogistics, getCoaches } from '@/lib/firebase-coaches';
import { getEventById } from '@/lib/firebase-events';
import { EventData, Coach } from '@/lib/types';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, TEAM_ROLES, CONTACT_CATEGORIES, ARRIVAL_TIME_OPTIONS } from '@/lib/event-constants';
import ModalButton from '@/components/ModalButton';



interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  arrivalTime: number | 'custom' // Minutes relative to event start, or 'custom' for custom input
  customArrivalTime?: string // For custom time input
  responsibilities: string[]
}

interface EventActivity {
  id: string
  name: string
  description: string
  startTime: string
  endTime: string
  leader: string
  location: string
  materials: string[]
}

interface DayOfSchedule {
  id: string
  time: string
  activity: string
  location: string
  responsible: string
  notes: string
}

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  role: string
  category: 'team' | 'venue' | 'emergency' | 'vendor' | 'other'
  notes?: string
}

export default function EventLogistics() {
  // Get event ID from URL query parameter
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'team' | 'activities' | 'schedule' | 'contacts'>('team');
  
  // Team Management
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [newTeamMember, setNewTeamMember] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    arrivalTime: -60 as number | 'custom', // Default to 1 hour before
    customArrivalTime: '',
    responsibilities: [''],
  });
  const [showEditTeamMember, setShowEditTeamMember] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);

  // Activity Management
  const [activities, setActivities] = useState<EventActivity[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    leader: '',
    location: '',
    materials: [''],
  });
  const [showEditActivity, setShowEditActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<EventActivity | null>(null);

  // Day-of Schedule
  const [dayOfSchedule, setDayOfSchedule] = useState<DayOfSchedule[]>([]);
  const [showAddScheduleItem, setShowAddScheduleItem] = useState(false);
  const [newScheduleItem, setNewScheduleItem] = useState({
    time: '07:00',
    activity: '',
    location: '',
    responsible: '',
    notes: '',
  });
  const [showEditScheduleItem, setShowEditScheduleItem] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<DayOfSchedule | null>(null);

  // Contact Management
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    category: 'other' as const,
    notes: '',
  });

  // Key Contacts Management
  const [venueContact, setVenueContact] = useState({
    name: 'Venue Contact',
    email: '',
    phone: '',
    notes: 'Contact venue directly',
  });
  const [emergencyContact, setEmergencyContact] = useState({
    name: 'Emergency Contact',
    email: '',
    phone: '911',
    notes: 'Call 911 if needed',
  });
  const [showEditVenue, setShowEditVenue] = useState(false);
  const [showEditEmergency, setShowEditEmergency] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const roleOptions = TEAM_ROLES;

  // Get default arrival time based on team role
  const getDefaultArrivalTime = (role: string): number | 'custom' => {
    switch (role) {
      case 'Event Lead':
        return -120; // 2 hours before
      case 'Setup Coordinator':
        return -120; // 2 hours before
      case 'Registration Lead':
        return -60; // 1 hour before
      case 'Activities Coordinator':
        return -30; // 30 minutes before
      case 'Safety Monitor':
        return -30; // 30 minutes before
      case 'Cleanup Coordinator':
        return 0; // At event start
      case 'Tech Support':
        return -60; // 1 hour before
      case 'Photography/Media':
        return -30; // 30 minutes before
      case 'Guest Relations':
        return -60; // 1 hour before
      case 'Equipment Manager':
        return -120; // 2 hours before
      default:
        return -60; // Default to 1 hour before
    }
  };

  // Convert arrival time number to readable label
  const getArrivalTimeLabel = (arrivalTime: number | 'custom' | string): string => {
    console.log('getArrivalTimeLabel called with:', arrivalTime, 'type:', typeof arrivalTime);
    
    if (arrivalTime === 'custom') return 'Custom time';
    
    // Handle string format (old data)
    if (typeof arrivalTime === 'string') {
      return arrivalTime; // Return the string as-is since it's already readable
    }
    
    // Handle numeric format (new data)
    switch (arrivalTime) {
      case -180: return '3 hours before';
      case -120: return '2 hours before';
      case -60: return '1 hour before';
      case -30: return '30 minutes before';
      case 0: return 'At event start';
      default: 
        console.log('No match found for arrival time:', arrivalTime);
        return 'Custom time';
    }
  };

  // Convert arrival time to dropdown value (for edit modal)
  const getArrivalTimeDropdownValue = (arrivalTime: number | 'custom' | string): string => {
    if (arrivalTime === 'custom') return 'custom';
    
    // Handle string format (old data) - convert back to numeric
    if (typeof arrivalTime === 'string') {
      switch (arrivalTime) {
        case '3 hours before': return '-180';
        case '2 hours before': return '-120';
        case '1 hour before': return '-60';
        case '30 minutes before': return '-30';
        case 'At event start': return '0';
        default: return 'custom';
      }
    }
    
    // Handle numeric format (new data)
    return arrivalTime.toString();
  };



  useEffect(() => {
    // Get event ID from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('eventId');
    setEventId(id);

    const loadEvent = async () => {
      try {
        let eventData: EventData = loadSampleEvent(); // Default fallback
        
        if (id) {
          // Check cache first to prevent unnecessary Firebase reads
          const cacheKey = `eventflow-event-${id}`;
          const logisticsCacheKey = `eventflow-logistics-${id}`;
          const lastFetchKey = `eventflow-event-fetch-${id}`;
          
          const now = Date.now();
          const lastFetch = localStorage.getItem(lastFetchKey);
          const cacheAge = lastFetch ? now - parseInt(lastFetch) : Infinity;
          const cacheTimeout = process.env.NODE_ENV === 'development' ? 300000 : 600000; // 5 min dev, 10 min prod
          
          // Try cached event data first
          const cachedEvent = localStorage.getItem(cacheKey);
          if (cachedEvent && cacheAge < cacheTimeout) {
            console.log('Using cached event data for logistics page');
            eventData = JSON.parse(cachedEvent);
            setEvent(eventData);
            
            // Also try cached logistics data
            const cachedLogistics = localStorage.getItem(logisticsCacheKey);
            if (cachedLogistics) {
              console.log('Using cached logistics data');
              const logisticsData = JSON.parse(cachedLogistics);
              setTeamMembers(logisticsData.teamMembers || []);
              setActivities(logisticsData.activities || []);
              setDayOfSchedule(logisticsData.dayOfSchedule || []);
              setContacts(logisticsData.contacts || []);
            } else {
              // Generate defaults if no cached logistics
              generateDefaultTeam(eventData);
              generateDefaultActivities(eventData);
              generateDefaultSchedule(eventData);
            }
            return;
          }
          
          // Cache miss - fetch from Firebase
          console.log('Cache miss - fetching event and logistics from Firebase');
          try {
            const firebaseEvent = await getEventById(id);
            if (firebaseEvent) {
              eventData = firebaseEvent;
              // Cache the event data
              localStorage.setItem(cacheKey, JSON.stringify(firebaseEvent));
              localStorage.setItem(lastFetchKey, now.toString());
            }
          } catch (error) {
            console.error('Error loading event from Firebase:', error);
            // Fallback to localStorage if Firebase fails
            const storedEvents = localStorage.getItem('events');
            if (storedEvents) {
              const events = JSON.parse(storedEvents);
              const foundEvent = events.find((e: EventData) => e.id === id);
              if (foundEvent) {
                eventData = foundEvent;
              }
            }
          }
        }
        
        setEvent(eventData);
        
        // Try to load existing logistics data from Firebase (with caching)
        if (id) {
          const logisticsCacheKey = `eventflow-logistics-${id}`;
          const cachedLogistics = localStorage.getItem(logisticsCacheKey);
          const lastFetchKey = `eventflow-event-fetch-${id}`;
          const lastFetch = localStorage.getItem(lastFetchKey);
          const now = Date.now();
          const cacheAge = lastFetch ? now - parseInt(lastFetch) : Infinity;
          const cacheTimeout = process.env.NODE_ENV === 'development' ? 300000 : 600000; // 5 min dev, 10 min prod
          
          if (cachedLogistics && cacheAge < cacheTimeout) {
            console.log('Using cached logistics data (2nd check)');
            const logisticsData = JSON.parse(cachedLogistics);
            setTeamMembers(logisticsData.teamMembers || []);
            setActivities(logisticsData.activities || []);
            setDayOfSchedule(logisticsData.dayOfSchedule || []);
            setContacts(logisticsData.contacts || []);
          } else {
            try {
              const logisticsData = await getEventLogistics(id);
              if (logisticsData) {
                // Cache the logistics data
                localStorage.setItem(logisticsCacheKey, JSON.stringify(logisticsData));
                localStorage.setItem(lastFetchKey, now.toString());
                
                setTeamMembers(logisticsData.teamMembers || []);
                setActivities(logisticsData.activities || []);
                setDayOfSchedule(logisticsData.dayOfSchedule || []);
                setContacts(logisticsData.contacts || []);
              } else {
                // Generate default data if no logistics exist
                generateDefaultTeam(eventData);
                generateDefaultActivities(eventData);
                generateDefaultSchedule(eventData);
              }
            } catch (error) {
              console.error('Error loading logistics data:', error);
              // Generate default data if loading fails
              generateDefaultTeam(eventData);
              generateDefaultActivities(eventData);
              generateDefaultSchedule(eventData);
            }
          }
        } else {
          // Generate default team members based on event data
          generateDefaultTeam(eventData);
          // Generate default activities based on event type
          generateDefaultActivities(eventData);
          // Generate default day-of schedule
          generateDefaultSchedule(eventData);
        }
      } catch (error) {
        console.error('Error loading event:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, []);

  // Load coaches for dropdowns
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

  const saveLogisticsToFirebase = async () => {
    if (!eventId) return;
    
    try {
      setSaveStatus('saving');
      const logisticsData = {
        teamMembers,
        activities,
        dayOfSchedule,
        contacts,
      };
      
      await saveEventLogistics(eventId, logisticsData);
      setSaveStatus('saved');
      
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving logistics to Firebase:', error);
      setSaveStatus('error');
      
      // Reset to idle after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const loadSampleEvent = (): EventData => {
    return {
      id: 'popup-fitness-class',
      name: 'Summer Fitness Pop-up',
      date: new Date().toISOString().split('T')[0] || '',
      time: '09:00',
      eventEndTime: '10:30',
      location: 'Central Park - Fitness Area',
      eventScope: 'team',
      pointOfContact: {
        name: 'Sarah Johnson',
        email: 'sarah@fitnessstudio.com',
        phone: '(555) 123-4567',
      },
      eventPurpose: 'Outdoor fitness class to promote healthy lifestyle',
      teamRoles: ['Event Lead'],
      marketingChannels: ['Social Media', 'Email'],
      ticketingNeeds: 'Free event, registration required',
      gemsDetails: 'N/A',
      specialRequirements: 'Portable equipment, outdoor space, weather backup plan',
      otherNotes: 'Bring water, comfortable workout clothes, and positive energy!',
      eventType: 'popup-class',
      status: 'active',
      createdBy: 'sample-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const generateDefaultTeam = (eventData: EventData) => {
    const defaultTeam: TeamMember[] = [
      {
        id: '1',
        name: eventData.pointOfContact.name,
        email: eventData.pointOfContact.email,
        phone: eventData.pointOfContact.phone,
        role: 'Event Lead',
        arrivalTime: -120, // 2 hours before
        responsibilities: ['Overall event coordination', 'Emergency contact'],
      },
      {
        id: '2',
        name: 'Unassigned',
        email: '',
        phone: '',
        role: 'Setup Coordinator',
        arrivalTime: -120, // 2 hours before
        responsibilities: ['Set up venue and equipment', 'Manage setup team', 'Coordinate with venue'],
      },
      {
        id: '3',
        name: 'Unassigned',
        email: '',
        phone: '',
        role: 'Activity Lead',
        arrivalTime: -60, // 1 hour before
        responsibilities: ['Lead event activities', 'Manage participant engagement', 'Coordinate with coaches'],
      },
      {
        id: '4',
        name: 'Unassigned',
        email: '',
        phone: '',
        role: 'Clean Up Coordinator',
        arrivalTime: 0, // At event start
        responsibilities: ['Coordinate cleanup', 'Manage breakdown', 'Ensure venue is left clean'],
      },
    ];
    setTeamMembers(defaultTeam);
  };

  const generateDefaultActivities = (eventData: EventData) => {
    const defaultActivities: EventActivity[] = [
      {
        id: '1',
        name: 'Event Setup',
        description: 'Set up venue, equipment, and registration area',
        startTime: '2 hours before event',
        endTime: '30 minutes before event',
        leader: eventData.pointOfContact.name,
        location: eventData.location,
        materials: ['Tables', 'Chairs', 'Signage', 'Equipment'],
      },
      {
        id: '2',
        name: 'Registration & Check-in',
        description: 'Welcome participants and manage registration',
        startTime: '30 minutes before event',
        endTime: '15 minutes after start',
        leader: 'TBD',
        location: 'Registration table',
        materials: ['Sign-in sheets', 'Name tags', 'Information packets'],
      },
    ];
    setActivities(defaultActivities);
  };

  const generateDefaultSchedule = (eventData: EventData) => {
    const eventTime = new Date(`${eventData.date}T${eventData.time}`);
    const defaultSchedule: DayOfSchedule[] = [
      {
        id: '1',
        time: new Date(eventTime.getTime() - 2 * 60 * 60 * 1000).toTimeString().slice(0, 5), // 2 hours before
        activity: 'Setup begins',
        location: eventData.location,
        responsible: eventData.pointOfContact.name,
        notes: 'Arrive early to set up venue and equipment',
      },
      {
        id: '2',
        time: new Date(eventTime.getTime() - 30 * 60 * 1000).toTimeString().slice(0, 5), // 30 minutes before
        activity: 'Registration opens',
        location: 'Registration table',
        responsible: 'Registration Lead',
        notes: 'Welcome participants and collect information',
      },
      {
        id: '3',
        time: eventData.time,
        activity: 'Event starts',
        location: eventData.location,
        responsible: eventData.pointOfContact.name,
        notes: 'Main event activities begin',
      },
      {
        id: '4',
        time: eventData.eventEndTime,
        activity: 'Event ends',
        location: eventData.location,
        responsible: 'Cleanup Coordinator',
        notes: 'Begin cleanup and breakdown',
      },
    ];
    setDayOfSchedule(defaultSchedule);
  };

  const addTeamMember = async () => {
    if (newTeamMember.name && newTeamMember.role) {
      const member: TeamMember = {
        id: Date.now().toString(),
        ...newTeamMember,
        responsibilities: newTeamMember.responsibilities.filter(r => r.trim() !== ''),
      };
      const updatedTeamMembers = [...teamMembers, member];
      setTeamMembers(updatedTeamMembers);
      setNewTeamMember({
        name: '',
        email: '',
        phone: '',
        role: '',
        arrivalTime: -60 as number | 'custom',
        customArrivalTime: '',
        responsibilities: [''],
      });
      setShowAddTeamMember(false);
      
      // Save to Firebase
      await saveLogisticsToFirebase();
    }
  };

  const addActivity = () => {
    if (newActivity.name && newActivity.startTime) {
      const activity: EventActivity = {
        id: Date.now().toString(),
        ...newActivity,
        materials: newActivity.materials.filter(m => m.trim() !== ''),
      };
      setActivities([...activities, activity]);
      setNewActivity({
        name: '',
        description: '',
        startTime: '',
        endTime: '',
        leader: '',
        location: '',
        materials: [''],
      });
      setShowAddActivity(false);
    }
  };

  const addScheduleItem = () => {
    if (newScheduleItem.time && newScheduleItem.activity) {
      const item: DayOfSchedule = {
        id: Date.now().toString(),
        ...newScheduleItem,
      };
      setDayOfSchedule([...dayOfSchedule, item]);
      setNewScheduleItem({
        time: '07:00',
        activity: '',
        location: '',
        responsible: '',
        notes: '',
      });
      setShowAddScheduleItem(false);
    }
  };

  const removeTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
  };

  const editTeamMember = (member: TeamMember) => {
    setEditingTeamMember(member);
    setShowEditTeamMember(true);
  };

  const updateTeamMember = () => {
    if (!editingTeamMember) return;
    
    setTeamMembers(prev => prev.map(member => 
      member.id === editingTeamMember.id ? editingTeamMember : member
    ));
    setShowEditTeamMember(false);
    setEditingTeamMember(null);
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter(activity => activity.id !== id));
  };

  const editActivity = (activity: EventActivity) => {
    setEditingActivity(activity);
    setShowEditActivity(true);
  };

  const updateActivity = () => {
    if (editingActivity) {
      setActivities(prev => prev.map(activity => 
        activity.id === editingActivity.id ? editingActivity : activity
      ));
      setShowEditActivity(false);
      setEditingActivity(null);
    }
  };

  const removeScheduleItem = (id: string) => {
    setDayOfSchedule(dayOfSchedule.filter(item => item.id !== id));
  };

  const editScheduleItem = (item: DayOfSchedule) => {
    setEditingScheduleItem(item);
    setShowEditScheduleItem(true);
  };

  const updateScheduleItem = () => {
    if (editingScheduleItem) {
      setDayOfSchedule(prev => prev.map(item => 
        item.id === editingScheduleItem.id ? editingScheduleItem : item
      ));
      setShowEditScheduleItem(false);
      setEditingScheduleItem(null);
    }
  };

  const addContact = () => {
    if (newContact.name && newContact.role) {
      const contact: Contact = {
        id: Date.now().toString(),
        ...newContact,
      };
      setContacts([...contacts, contact]);
      setNewContact({
        name: '',
        email: '',
        phone: '',
        role: '',
        category: 'other',
        notes: '',
      });
      setShowAddContact(false);
    }
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  // Check if logistics planning is complete
  const isLogisticsComplete = () => {
    if (!event) return false;
    
    // Check if team has at least the Event Lead assigned
    const hasEventLead = teamMembers.some(member => 
      member.role === 'Event Lead' && member.name !== 'Unassigned'
    );
    
    // Check if we have at least some schedule items
    const hasSchedule = dayOfSchedule.length > 0;
    
    // Check if we have at least some activities
    const hasActivities = activities.length > 0;
    
    return hasEventLead && hasSchedule && hasActivities;
  };

  const handleCompleteLogistics = () => {
    if (isLogisticsComplete()) {
      setShowCompletionModal(true);
    }
  };

  const printSchedule = () => {
    if (!event) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Day-of Schedule - ${event.name}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .event-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .event-details { font-size: 14px; color: #666; margin-bottom: 20px; }
              .schedule-item { display: flex; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
              .time { font-weight: bold; min-width: 80px; font-size: 16px; }
              .activity { flex: 1; }
              .activity-title { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
              .activity-details { font-size: 14px; color: #666; }
              .team-section { margin-top: 40px; }
              .team-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px; }
              .team-member { margin-bottom: 10px; }
              .contact-section { margin-top: 40px; }
              .contact-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px; }
              .contact-item { margin-bottom: 8px; }
              @page { margin: 1in; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .event-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .event-details { font-size: 14px; color: #666; margin-bottom: 20px; }
            .schedule-item { display: flex; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .time { font-weight: bold; min-width: 80px; font-size: 16px; }
            .activity { flex: 1; }
            .activity-title { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
            .activity-details { font-size: 14px; color: #666; }
            .team-section { margin-top: 40px; }
            .team-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px; }
            .team-member { margin-bottom: 10px; }
            .contact-section { margin-top: 40px; }
            .contact-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px; }
            .contact-item { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="event-title">${event.name}</div>
            <div class="event-details">
              ${event.date} • ${event.time} - ${event.eventEndTime} • ${event.location}
            </div>
            <div class="event-details">
              Contact: ${event.pointOfContact.name} (${event.pointOfContact.email})
            </div>
          </div>

          <div class="schedule-section">
            <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 5px;">Day-of Schedule</h2>
            ${dayOfSchedule.map(item => `
              <div class="schedule-item">
                <div class="time">${item.time}</div>
                <div class="activity">
                  <div class="activity-title">${item.activity}</div>
                  <div class="activity-details">${item.location} • ${item.responsible}</div>
                  ${item.notes ? `<div class="activity-details">${item.notes}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          ${teamMembers.length > 0 ? `
            <div class="team-section">
              <div class="team-title">Team Roles & Responsibilities</div>
              ${teamMembers.map(member => `
                <div class="team-member">
                  <strong>${member.name}</strong> - ${member.role}<br>
                  ${member.email} • ${member.phone}<br>
                  <em>Arrival: ${member.arrivalTime}</em><br>
                  <em>Responsibilities: ${member.responsibilities.join(', ')}</em>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${activities.length > 0 ? `
            <div class="team-section">
              <div class="team-title">Event Activities</div>
              ${activities.map(activity => `
                <div class="team-member">
                  <strong>${activity.name}</strong><br>
                  ${activity.description}<br>
                  <em>Time: ${activity.startTime} - ${activity.endTime}</em><br>
                  <em>Location: ${activity.location}</em><br>
                  <em>Leader: ${activity.leader}</em><br>
                  <em>Materials: ${activity.materials.join(', ')}</em>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="contact-section">
            <div class="contact-title">Emergency Contacts</div>
            <div class="contact-item">
              <strong>Event Lead:</strong> ${event.pointOfContact.name} - ${event.pointOfContact.phone}
            </div>
            ${teamMembers.filter(m => 
    (m.role.toLowerCase().includes('lead') || m.role.toLowerCase().includes('coordinator')) && 
              m.name !== event.pointOfContact.name
  ).map(member => `
              <div class="contact-item">
                <strong>${member.role}:</strong> ${member.name} - ${member.phone}
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading logistics...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-4">The event you're looking for doesn't exist.</p>
          <Link href="/event-setup" className="text-primary-600 hover:text-primary-700">
            Create New Event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Calendar</span>
            </Link>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900">Day-of Logistics</h1>
              <p className="text-sm text-gray-500">{event.name}</p>
            </div>
            {saveStatus === 'saving' ? (
              <button
                disabled
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg font-medium cursor-not-allowed"
              >
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
                <span className="hidden md:inline">Saving...</span>
              </button>
            ) : saveStatus === 'saved' ? (
              <button className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 border border-green-200 rounded-lg font-medium">
                <Check className="h-4 w-4" />
                <span className="hidden md:inline">Saved!</span>
              </button>
            ) : saveStatus === 'error' ? (
              <button className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-800 border border-red-200 rounded-lg font-medium">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden md:inline">Error</span>
              </button>
            ) : (
              <ModalButton
                variant="save"
                onClick={saveLogisticsToFirebase}
                icon={<Save className="h-4 w-4" />}
              >
                Save
              </ModalButton>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Completion Progress */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Logistics Planning Progress</h3>
                <p className="text-sm text-gray-600 mt-1">Complete all sections below to finish your logistics planning</p>
              </div>
              {isLogisticsComplete() && (
                <ModalButton
                  variant="logistics"
                  onClick={handleCompleteLogistics}
                  icon={<Check className="h-4 w-4" />}
                >
                  Review & Complete
                </ModalButton>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { id: 'team', label: 'Team Roles', icon: Users, complete: teamMembers.some(m => m.role === 'Event Lead' && m.name !== 'Unassigned'), description: 'Assign team members to roles' },
                { id: 'activities', label: 'Event Activities', icon: Calendar, complete: activities.length > 0, description: 'Define event activities and leaders' },
                { id: 'schedule', label: 'Day Schedule', icon: Clock, complete: dayOfSchedule.length > 0, description: 'Create day-of timeline' },
                { id: 'contacts', label: 'Contact List', icon: User, complete: contacts.length > 0, description: 'Add key contacts' }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <div key={tab.id} className={`p-4 rounded-lg border-2 transition-all ${
                    tab.complete 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tab.complete 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {tab.complete ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h4 className={`font-medium ${
                          tab.complete ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {tab.label}
                        </h4>
                        <p className={`text-xs ${
                          tab.complete ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          {tab.complete ? 'Complete' : tab.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full text-sm font-medium py-2 px-3 rounded transition-colors ${
                        tab.complete
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {tab.complete ? 'Review' : 'Complete'}
                    </button>
                  </div>
                );
              })}
            </div>
            
            {isLogisticsComplete() && (
              <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-green-900">All sections complete! 🎉</h4>
                      <p className="text-sm text-green-700">Your logistics plan is ready for review and finalization.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Day-of Schedule Preview */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Day-of Schedule Preview</h2>
                <p className="text-gray-600 mt-1">Your event day timeline. Use the setup tabs below to configure team roles, activities, and schedule items.</p>
              </div>
              <ModalButton
                variant="logistics"
                onClick={printSchedule}
                icon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                }
              >
                Print Schedule
              </ModalButton>
            </div>
          </div>
          
          {/* Schedule Preview - Sidebar Style */}
          <div className="p-6">
            <div className="space-y-2">
              {dayOfSchedule.length > 0 ? (
                dayOfSchedule.map((item, index) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-gray-900 min-w-[60px]">{item.time}</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.activity}</div>
                          <div className="text-sm text-gray-600">{item.location}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {item.responsible}
                        </span>
                        <button
                          onClick={() => editScheduleItem(item)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit schedule item"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {item.notes && (
                      <div className="px-4 pb-4">
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          <span className="font-medium">Notes:</span> {item.notes}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No schedule items yet. Use the Schedule Items tab below to build your day-of timeline.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Setup Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="border-b">
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Setup Your Day-of Schedule</h3>
              <p className="text-sm text-gray-600 mt-1">Configure the components that will build your event day timeline.</p>
            </div>
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'team', label: 'Team Roles', icon: Users, number: 1 },
                { id: 'activities', label: 'Event Activities', icon: Calendar, number: 2 },
                { id: 'schedule', label: 'Schedule Items', icon: Clock, number: 3 },
                { id: 'contacts', label: 'Contact List', icon: User, number: 4 },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        activeTab === tab.id
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {tab.number}
                      </div>
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Team Roles Tab */}
            {activeTab === 'team' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Team Roles & Responsibilities</h2>
                  <button
                    onClick={() => setShowAddTeamMember(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Team Member</span>
                  </button>
                </div>

                {/* Add Team Member Modal */}
                {showAddTeamMember && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">Add Team Member</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Team Member</label>
                          <select
                            value={newTeamMember.name}
                            onChange={(e) => {
                              const selectedCoach = coaches.find(coach => coach.name === e.target.value);
                              if (selectedCoach) {
                                setNewTeamMember({
                                  ...newTeamMember, 
                                  name: selectedCoach.name,
                                  email: selectedCoach.email,
                                  phone: selectedCoach.phone,
                                });
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select a team member</option>
                            {coaches.map((coach) => (
                              <option key={coach.id} value={coach.name}>
                                {coach.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <select
                            value={newTeamMember.role}
                            onChange={(e) => {
                              const selectedRole = e.target.value;
                              const defaultArrivalTime = getDefaultArrivalTime(selectedRole);
                              setNewTeamMember({
                                ...newTeamMember, 
                                role: selectedRole,
                                arrivalTime: defaultArrivalTime
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select a role</option>
                            {roleOptions.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Arrival Time
                            {newTeamMember.role && newTeamMember.arrivalTime !== -60 && (
                              <span className="text-xs text-blue-600 ml-2">(Auto-set for {newTeamMember.role})</span>
                            )}
                          </label>
                          <select
                            value={newTeamMember.arrivalTime === 'custom' ? 'custom' : newTeamMember.arrivalTime.toString()}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === 'custom') {
                                setNewTeamMember({...newTeamMember, arrivalTime: 'custom'});
                              } else if (value !== '') {
                                setNewTeamMember({...newTeamMember, arrivalTime: parseInt(value)});
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                              newTeamMember.role && newTeamMember.arrivalTime !== -60 
                                ? 'border-blue-300 bg-blue-50' 
                                : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select arrival time</option>
                            {ARRIVAL_TIME_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {newTeamMember.arrivalTime === 'custom' && (
                            <input
                              type="text"
                              placeholder="Enter custom time (e.g., 15 minutes before)"
                              value={newTeamMember.customArrivalTime}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                              onChange={(e) => setNewTeamMember({...newTeamMember, customArrivalTime: e.target.value})}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => setShowAddTeamMember(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addTeamMember}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          Add Member
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Team Member Modal */}
                {showEditTeamMember && editingTeamMember && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">
                        {editingTeamMember.name === 'Unassigned' ? 'Assign Team Member' : 'Edit Team Member'}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Assign Team Member *</label>
                          <select
                            value={editingTeamMember.name}
                            onChange={(e) => {
                              const selectedCoach = coaches.find(coach => coach.name === e.target.value);
                              if (selectedCoach) {
                                // Set smart default arrival time based on role
                                const defaultArrivalTime = getDefaultArrivalTime(editingTeamMember.role);
                                setEditingTeamMember({
                                  ...editingTeamMember,
                                  name: selectedCoach.name,
                                  email: selectedCoach.email,
                                  phone: selectedCoach.phone,
                                  arrivalTime: defaultArrivalTime
                                });
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select team member</option>
                            {coaches.map((coach) => (
                              <option key={coach.id} value={coach.name}>
                                {coach.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <input
                            type="text"
                            value={editingTeamMember.role}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Arrival Time
                            {editingTeamMember.role && editingTeamMember.arrivalTime !== -60 && editingTeamMember.arrivalTime !== 'custom' && (
                              <span className="text-xs text-blue-600 ml-2">(Auto-set for {editingTeamMember.role})</span>
                            )}
                          </label>
                          <select
                            value={getArrivalTimeDropdownValue(editingTeamMember.arrivalTime)}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === 'custom') {
                                setEditingTeamMember({...editingTeamMember, arrivalTime: 'custom'});
                              } else if (value !== '') {
                                setEditingTeamMember({...editingTeamMember, arrivalTime: parseInt(value)});
                              }
                            }}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                              editingTeamMember.role && editingTeamMember.arrivalTime !== -60 && editingTeamMember.arrivalTime !== 'custom'
                                ? 'border-blue-300 bg-blue-50' 
                                : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select arrival time</option>
                            {ARRIVAL_TIME_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {editingTeamMember.arrivalTime === 'custom' && (
                            <input
                              type="text"
                              placeholder="Enter custom time (e.g., 15 minutes before)"
                              value={editingTeamMember.customArrivalTime || ''}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                              onChange={(e) => setEditingTeamMember({...editingTeamMember, customArrivalTime: e.target.value})}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => {
                            setShowEditTeamMember(false);
                            setEditingTeamMember(null);
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={updateTeamMember}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          {editingTeamMember.name === 'Unassigned' ? 'Assign Member' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Members List */}
                <div className="space-y-4">
                  {teamMembers.map((member) => {
                    const isUnassigned = member.name === 'Unassigned';
                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 relative"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-gray-900">
                                {isUnassigned ? '⚠️ Unassigned' : member.name}
                              </h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                isUnassigned 
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {member.role}
                              </span>
                              {isUnassigned && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                  Needs Assignment
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                              {!isUnassigned && (
                                <>
                                  <div className="flex items-center space-x-1">
                                    <Mail className="h-4 w-4" />
                                    <span>{member.email}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Phone className="h-4 w-4" />
                                    <span>{member.phone}</span>
                                  </div>
                                </>
                              )}
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>Arrive: {getArrivalTimeLabel(member.arrivalTime)}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">
                                <strong>Responsibilities:</strong> {member.responsibilities.join(', ')}
                              </p>
                            </div>
                            {isUnassigned && (
                              <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                                <p className="text-sm text-yellow-800">
                                  <strong>Action needed:</strong> This role must be assigned to someone before the event.
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => editTeamMember(member)}
                              className="text-blue-600 hover:text-blue-800"
                              title={isUnassigned ? 'Assign this role' : 'Edit team member'}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeTeamMember(member.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Event Activities Tab */}
            {activeTab === 'activities' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Event Activities</h2>
                  <ModalButton
                    variant="save"
                    onClick={() => setShowAddActivity(true)}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Activity
                  </ModalButton>
                </div>

                {/* Add Activity Modal */}
                {showAddActivity && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">Add Event Activity</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
                          <input
                            type="text"
                            value={newActivity.name}
                            onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={newActivity.description}
                            onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input
                              type="text"
                              value={newActivity.startTime}
                              onChange={(e) => setNewActivity({...newActivity, startTime: e.target.value})}
                              placeholder="e.g., 2 hours before"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <input
                              type="text"
                              value={newActivity.endTime}
                              onChange={(e) => setNewActivity({...newActivity, endTime: e.target.value})}
                              placeholder="e.g., 30 minutes before"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Activity Leader</label>
                          <select
                            value={newActivity.leader}
                            onChange={(e) => setNewActivity({...newActivity, leader: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select activity leader</option>
                            {coaches.map((coach) => (
                              <option key={coach.id} value={coach.name}>
                                {coach.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                          <input
                            type="text"
                            value={newActivity.location}
                            onChange={(e) => setNewActivity({...newActivity, location: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => setShowAddActivity(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <ModalButton
                          variant="save"
                          onClick={addActivity}
                          icon={<Plus className="h-4 w-4" />}
                        >
                          Add Activity
                        </ModalButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Activity Modal */}
                {showEditActivity && editingActivity && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">Edit Activity</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
                          <input
                            type="text"
                            value={editingActivity.name}
                            onChange={(e) => setEditingActivity({...editingActivity, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={editingActivity.description}
                            onChange={(e) => setEditingActivity({...editingActivity, description: e.target.value})}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={editingActivity.startTime}
                              onChange={(e) => setEditingActivity({...editingActivity, startTime: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <input
                              type="time"
                              value={editingActivity.endTime}
                              onChange={(e) => setEditingActivity({...editingActivity, endTime: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Activity Leader</label>
                          <select
                            value={editingActivity.leader}
                            onChange={(e) => setEditingActivity({...editingActivity, leader: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select activity leader</option>
                            {coaches.map((coach) => (
                              <option key={coach.id} value={coach.name}>
                                {coach.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                          <input
                            type="text"
                            value={editingActivity.location}
                            onChange={(e) => setEditingActivity({...editingActivity, location: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Materials</label>
                          <div className="space-y-2">
                            {editingActivity.materials.map((material, index) => (
                              <input
                                key={index}
                                type="text"
                                value={material}
                                onChange={(e) => {
                                  const newMaterials = [...editingActivity.materials];
                                  newMaterials[index] = e.target.value;
                                  setEditingActivity({...editingActivity, materials: newMaterials});
                                }}
                                placeholder={`Material ${index + 1}`}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            ))}
                            <button
                              onClick={() => setEditingActivity({
                                ...editingActivity, 
                                materials: [...editingActivity.materials, '']
                              })}
                              className="text-primary-600 hover:text-primary-700 text-sm"
                            >
                              + Add Material
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => {
                            setShowEditActivity(false);
                            setEditingActivity(null);
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <ModalButton
                          variant="save"
                          onClick={updateActivity}
                          icon={<Save className="h-4 w-4" />}
                        >
                          Update Activity
                        </ModalButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activities List */}
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">{activity.name}</h3>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {activity.leader}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{activity.startTime} - {activity.endTime}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{activity.location}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              <strong>Materials:</strong> {activity.materials.join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => editActivity(activity)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeActivity(activity.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Day-of Schedule Tab */}
            {activeTab === 'schedule' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Day-of Schedule</h2>
                  <ModalButton
                    variant="save"
                    onClick={() => setShowAddScheduleItem(true)}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Schedule Item
                  </ModalButton>
                </div>

                {/* Add Schedule Item Modal */}
                {showAddScheduleItem && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">Add Schedule Item</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                          <input
                            type="time"
                            value={newScheduleItem.time}
                            onChange={(e) => setNewScheduleItem({...newScheduleItem, time: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
                          <input
                            type="text"
                            value={newScheduleItem.activity}
                            onChange={(e) => setNewScheduleItem({...newScheduleItem, activity: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                          <input
                            type="text"
                            value={newScheduleItem.location}
                            onChange={(e) => setNewScheduleItem({...newScheduleItem, location: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Person</label>
                          <select
                            value={newScheduleItem.responsible}
                            onChange={(e) => setNewScheduleItem({...newScheduleItem, responsible: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select responsible person</option>
                            {coaches.map((coach) => (
                              <option key={coach.id} value={coach.name}>
                                {coach.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={newScheduleItem.notes}
                            onChange={(e) => setNewScheduleItem({...newScheduleItem, notes: e.target.value})}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => setShowAddScheduleItem(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <ModalButton
                          variant="save"
                          onClick={addScheduleItem}
                          icon={<Plus className="h-4 w-4" />}
                        >
                          Add Item
                        </ModalButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Schedule Item Modal */}
                {showEditScheduleItem && editingScheduleItem && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">Edit Schedule Item</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                          <input
                            type="time"
                            value={editingScheduleItem.time}
                            onChange={(e) => setEditingScheduleItem({...editingScheduleItem, time: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
                          <input
                            type="text"
                            value={editingScheduleItem.activity}
                            onChange={(e) => setEditingScheduleItem({...editingScheduleItem, activity: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                          <input
                            type="text"
                            value={editingScheduleItem.location}
                            onChange={(e) => setEditingScheduleItem({...editingScheduleItem, location: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Person</label>
                          <select
                            value={editingScheduleItem.responsible}
                            onChange={(e) => setEditingScheduleItem({...editingScheduleItem, responsible: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select responsible person</option>
                            {coaches.map((coach) => (
                              <option key={coach.id} value={coach.name}>
                                {coach.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={editingScheduleItem.notes}
                            onChange={(e) => setEditingScheduleItem({...editingScheduleItem, notes: e.target.value})}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => {
                            setShowEditScheduleItem(false);
                            setEditingScheduleItem(null);
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <ModalButton
                          variant="save"
                          onClick={updateScheduleItem}
                          icon={<Save className="h-4 w-4" />}
                        >
                          Update Item
                        </ModalButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* Schedule List */}
                <div className="space-y-4">
                  {dayOfSchedule
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-5 w-5 text-primary-600" />
                                <span className="font-medium text-gray-900">{item.time}</span>
                              </div>
                              <h3 className="font-medium text-gray-900">{item.activity}</h3>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-4 w-4" />
                                <span>{item.location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <User className="h-4 w-4" />
                                <span>{item.responsible}</span>
                              </div>
                            </div>
                            {item.notes && (
                              <p className="text-sm text-gray-600">{item.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => editScheduleItem(item)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeScheduleItem(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>
            )}

            {/* Contact List Tab */}
            {activeTab === 'contacts' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Contact List</h2>
                  <ModalButton
                    variant="save"
                    onClick={() => setShowAddContact(true)}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Contact
                  </ModalButton>
                </div>

                {/* Add Contact Modal */}
                {showAddContact && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">Add Contact</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                          <input
                            type="text"
                            value={newContact.name}
                            onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={newContact.email}
                            onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={newContact.phone}
                            onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                          <input
                            type="text"
                            value={newContact.role}
                            onChange={(e) => setNewContact({...newContact, role: e.target.value})}
                            placeholder="e.g., Venue Manager, Caterer, Photographer"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                          <select
                            value={newContact.category}
                            onChange={(e) => setNewContact({...newContact, category: e.target.value as any})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="team">Team Member</option>
                            <option value="venue">Venue</option>
                            <option value="emergency">Emergency</option>
                            <option value="vendor">Vendor</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={newContact.notes}
                            onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                            rows={2}
                            placeholder="Additional notes about this contact..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => setShowAddContact(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <ModalButton
                          variant="save"
                          onClick={addContact}
                          icon={<Plus className="h-4 w-4" />}
                        >
                          Add Contact
                        </ModalButton>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team Contacts */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-4">Team Contacts</h3>
                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="bg-white rounded p-3">
                          <div className="font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-600">{member.role}</div>
                          <div className="text-sm text-gray-600">{member.email}</div>
                          <div className="text-sm text-gray-600">{member.phone}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Contacts */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-green-900 mb-4">Additional Contacts</h3>
                    <div className="space-y-3">
                      {contacts.map((contact) => (
                        <motion.div
                          key={contact.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded p-3 relative"
                        >
                          <button
                            onClick={() => removeContact(contact.id)}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div className="font-medium text-gray-900">{contact.name}</div>
                          <div className="text-sm text-gray-600">{contact.role}</div>
                          {contact.email && <div className="text-sm text-gray-600">{contact.email}</div>}
                          {contact.phone && <div className="text-sm text-gray-600">{contact.phone}</div>}
                          {contact.notes && <div className="text-sm text-gray-500 italic mt-1">{contact.notes}</div>}
                        </motion.div>
                      ))}
                      {contacts.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No additional contacts yet. Add some using the button above.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key Contacts */}
                <div className="mt-6 bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 mb-4">Key Contacts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded p-3">
                      <div className="font-medium text-gray-900">Event Lead</div>
                      <div className="text-sm text-gray-600">{event.pointOfContact.name}</div>
                      <div className="text-sm text-gray-600">{event.pointOfContact.email}</div>
                      <div className="text-sm text-gray-600">{event.pointOfContact.phone}</div>
                    </div>
                    <div className="bg-white rounded p-3 relative">
                      <button
                        onClick={() => setShowEditVenue(true)}
                        className="absolute top-2 right-2 text-blue-600 hover:text-blue-800"
                        title="Edit venue contact"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <div className="font-medium text-gray-900">{venueContact.name}</div>
                      <div className="text-sm text-gray-600">{event.location}</div>
                      {venueContact.email && <div className="text-sm text-gray-600">{venueContact.email}</div>}
                      {venueContact.phone && <div className="text-sm text-gray-600">{venueContact.phone}</div>}
                      <div className="text-sm text-gray-600">{venueContact.notes}</div>
                    </div>
                    <div className="bg-white rounded p-3 relative">
                      <button
                        onClick={() => setShowEditEmergency(true)}
                        className="absolute top-2 right-2 text-blue-600 hover:text-blue-800"
                        title="Edit emergency contact"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <div className="font-medium text-gray-900">{emergencyContact.name}</div>
                      <div className="text-sm text-gray-600">{emergencyContact.phone}</div>
                      {emergencyContact.email && <div className="text-sm text-gray-600">{emergencyContact.email}</div>}
                      <div className="text-sm text-gray-600">{emergencyContact.notes}</div>
                      <div className="text-sm text-gray-600">Event Lead: {event.pointOfContact.phone}</div>
                    </div>
                  </div>
                </div>

                {/* Edit Venue Contact Modal */}
                {showEditVenue && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">Edit Venue Contact</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
                          <input
                            type="text"
                            value={event.location}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                          <input
                            type="text"
                            value={venueContact.name}
                            onChange={(e) => setVenueContact({...venueContact, name: e.target.value})}
                            placeholder="e.g., John Smith, Venue Manager"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={venueContact.email}
                            onChange={(e) => setVenueContact({...venueContact, email: e.target.value})}
                            placeholder="venue@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={venueContact.phone}
                            onChange={(e) => setVenueContact({...venueContact, phone: e.target.value})}
                            placeholder="(555) 123-4567"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={venueContact.notes}
                            onChange={(e) => setVenueContact({...venueContact, notes: e.target.value})}
                            rows={2}
                            placeholder="Additional venue contact information..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => setShowEditVenue(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => setShowEditVenue(false)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Emergency Contact Modal */}
                {showEditEmergency && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">Edit Emergency Contact</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                          <input
                            type="text"
                            value={emergencyContact.name}
                            onChange={(e) => setEmergencyContact({...emergencyContact, name: e.target.value})}
                            placeholder="e.g., Emergency Contact, Security"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={emergencyContact.phone}
                            onChange={(e) => setEmergencyContact({...emergencyContact, phone: e.target.value})}
                            placeholder="911 or specific emergency number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={emergencyContact.email}
                            onChange={(e) => setEmergencyContact({...emergencyContact, email: e.target.value})}
                            placeholder="emergency@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={emergencyContact.notes}
                            onChange={(e) => setEmergencyContact({...emergencyContact, notes: e.target.value})}
                            rows={2}
                            placeholder="Emergency contact instructions..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => setShowEditEmergency(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => setShowEditEmergency(false)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


      </main>

      {/* Logistics Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Logistics Planning Complete! 🎉
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Your event logistics are ready. Here's what you can do next:
              </p>
              
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Logistics Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Team Members:</span>
                      <span className="ml-2 font-medium">{teamMembers.filter(m => m.name !== 'Unassigned').length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Activities:</span>
                      <span className="ml-2 font-medium">{activities.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Schedule Items:</span>
                      <span className="ml-2 font-medium">{dayOfSchedule.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Contacts:</span>
                      <span className="ml-2 font-medium">{contacts.length}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-900">Print your logistics plan for the team</span>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V7a2 2 0 012-2h4a2 2 0 012 2v0M8 7v10a2 2 0 002 2h4a2 2 0 002-2V7M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                  </svg>
                  <span className="text-sm font-medium text-green-900">Return to calendar to see your event</span>
                </div>
              </div>
              
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    printSchedule();
                    setShowCompletionModal(false);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Print Logistics Plan
                </button>
                
                <button
                  onClick={() => {
                    setShowCompletionModal(false);
                    window.location.href = '/';
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Return to Calendar
                </button>
                
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Continue Editing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 