'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Users, Calendar, Clock, User, Phone, Mail, MapPin, Trash2, Edit3 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { getEventById } from '@/lib/firebase-events';
import { EventData } from '@/lib/types';

// Required for static export - generates empty params since this is a dynamic route
export async function generateStaticParams() {
  return [];
}

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  arrivalTime: string
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
  const params = useParams();
  const eventId = params.eventId as string;
  
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
    arrivalTime: '',
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

  const roleOptions = [
    'Event Lead',
    'Setup Coordinator',
    'Registration Lead',
    'Activity Lead',
    'Cleanup Coordinator',
    'Safety Monitor',
    'Photographer',
    'Equipment Manager',
    'Catering Coordinator',
    'Transportation Lead',
  ];



  useEffect(() => {
    const loadEvent = async () => {
      try {
        const eventData = await getEventById(eventId);
        if (eventData) {
          setEvent(eventData);
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
  }, [eventId]);

  const generateDefaultTeam = (eventData: EventData) => {
    const defaultTeam: TeamMember[] = [
      {
        id: '1',
        name: eventData.pointOfContact.name,
        email: eventData.pointOfContact.email,
        phone: eventData.pointOfContact.phone,
        role: 'Event Lead',
        arrivalTime: '2 hours before',
        responsibilities: ['Overall event coordination', 'Emergency contact'],
      },
      {
        id: '2',
        name: 'Unassigned',
        email: '',
        phone: '',
        role: 'Setup Coordinator',
        arrivalTime: '2 hours before',
        responsibilities: ['Set up venue and equipment', 'Manage setup team', 'Coordinate with venue'],
      },
      {
        id: '3',
        name: 'Unassigned',
        email: '',
        phone: '',
        role: 'Activity Lead',
        arrivalTime: '1 hour before',
        responsibilities: ['Lead event activities', 'Manage participant engagement', 'Coordinate with coaches'],
      },
      {
        id: '4',
        name: 'Unassigned',
        email: '',
        phone: '',
        role: 'Clean Up Coordinator',
        arrivalTime: 'During event',
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

  const addTeamMember = () => {
    if (newTeamMember.name && newTeamMember.role) {
      const member: TeamMember = {
        id: Date.now().toString(),
        ...newTeamMember,
        responsibilities: newTeamMember.responsibilities.filter(r => r.trim() !== ''),
      };
      setTeamMembers([...teamMembers, member]);
      setNewTeamMember({
        name: '',
        email: '',
        phone: '',
        role: '',
        arrivalTime: '',
        responsibilities: [''],
      });
      setShowAddTeamMember(false);
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

  const removeScheduleItem = (id: string) => {
    setDayOfSchedule(dayOfSchedule.filter(item => item.id !== id));
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
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Day-of Schedule Preview */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Day-of Schedule Preview</h2>
                <p className="text-gray-600 mt-1">Your event day timeline. Use the setup tabs below to configure team roles, activities, and schedule items.</p>
              </div>
              <button 
                onClick={printSchedule}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Schedule</span>
              </button>
            </div>
          </div>
          
          {/* Schedule Preview */}
          <div className="p-6">
            <div className="space-y-3">
              {dayOfSchedule.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900 min-w-[60px]">{item.time}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.activity}</div>
                    <div className="text-sm text-gray-600">{item.location} • {item.responsible}</div>
                  </div>
                </div>
              ))}
              {dayOfSchedule.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No schedule items yet. Use the setup tabs below to build your day-of schedule.</p>
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={newTeamMember.name}
                            onChange={(e) => setNewTeamMember({...newTeamMember, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={newTeamMember.email}
                            onChange={(e) => setNewTeamMember({...newTeamMember, email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={newTeamMember.phone}
                            onChange={(e) => setNewTeamMember({...newTeamMember, phone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                          <select
                            value={newTeamMember.role}
                            onChange={(e) => setNewTeamMember({...newTeamMember, role: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select a role</option>
                            {roleOptions.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time</label>
                          <input
                            type="text"
                            value={newTeamMember.arrivalTime}
                            onChange={(e) => setNewTeamMember({...newTeamMember, arrivalTime: e.target.value})}
                            placeholder="e.g., 2 hours before event"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                          <input
                            type="text"
                            value={editingTeamMember.name}
                            onChange={(e) => setEditingTeamMember({...editingTeamMember, name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={editingTeamMember.email}
                            onChange={(e) => setEditingTeamMember({...editingTeamMember, email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={editingTeamMember.phone}
                            onChange={(e) => setEditingTeamMember({...editingTeamMember, phone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time</label>
                          <input
                            type="text"
                            value={editingTeamMember.arrivalTime}
                            onChange={(e) => setEditingTeamMember({...editingTeamMember, arrivalTime: e.target.value})}
                            placeholder="e.g., 2 hours before event"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
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
                                <span>Arrive: {member.arrivalTime}</span>
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
                  <button
                    onClick={() => setShowAddActivity(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Activity</span>
                  </button>
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
                          <input
                            type="text"
                            value={newActivity.leader}
                            onChange={(e) => setNewActivity({...newActivity, leader: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
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
                        <button
                          onClick={addActivity}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          Add Activity
                        </button>
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
                        <button
                          onClick={() => removeActivity(activity.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                  <button
                    onClick={() => setShowAddScheduleItem(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Schedule Item</span>
                  </button>
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
                          <input
                            type="text"
                            value={newScheduleItem.responsible}
                            onChange={(e) => setNewScheduleItem({...newScheduleItem, responsible: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
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
                        <button
                          onClick={addScheduleItem}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          Add Item
                        </button>
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
                          <button
                            onClick={() => removeScheduleItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Contact</span>
                  </button>
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
                        <button
                          onClick={addContact}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          Add Contact
                        </button>
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

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            View Calendar
          </button>
          
          <button
            onClick={() => window.location.href = '/event-setup'}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Create Another Event
          </button>
        </div>
      </main>
    </div>
  );
} 