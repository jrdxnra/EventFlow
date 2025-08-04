'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Users, Settings, Trash2, Edit3, Save } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { getCoaches, createCoach, deleteCoach, updateCoach, getContacts, createContact, deleteContact } from '@/lib/firebase-coaches';
import { Coach, Contact } from '@/lib/types';

export default function ConfigPage() {
  // Coach Management
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [showAddCoach, setShowAddCoach] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [newCoach, setNewCoach] = useState({
    name: '',
    email: '',
    phone: '',
    specialties: [''],
    availability: [''],
    bio: '',
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

  // Settings
  const [settings, setSettings] = useState({
    defaultVenueContact: {
      name: 'Venue Manager',
      email: '',
      phone: '',
      notes: 'Contact for venue access, setup, and logistics',
    },
    defaultEmergencyContact: {
      name: 'Emergency Services',
      email: '',
      phone: '911',
      notes: 'Primary emergency contact for the event',
    },
    autoSyncToCalendar: false, // Off by default
    enableNotifications: false, // Off by default
  });

  const addCoach = async () => {
    if (!newCoach.name || !newCoach.email) return;
    
    try {
      const coachData = {
        ...newCoach,
        specialties: newCoach.specialties.filter(s => s.trim() !== ''),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const coachId = await createCoach(coachData);
      const newCoachWithId = { id: coachId, ...coachData };
      
      const updatedCoaches = [...coaches, newCoachWithId];
      setCoaches(updatedCoaches);
      
      // Update cache
      localStorage.setItem('eventflow-coaches', JSON.stringify(updatedCoaches));
      
      setNewCoach({
        name: '',
        email: '',
        phone: '',
        specialties: [''],
        availability: [''],
        bio: '',
      });
      setShowAddCoach(false);
    } catch (error) {
      console.error('Error adding coach:', error);
    }
  };

  const removeCoach = async (id: string) => {
    try {
      await deleteCoach(id);
      const updatedCoaches = coaches.filter(coach => coach.id !== id);
      setCoaches(updatedCoaches);
      
      // Update cache
      localStorage.setItem('eventflow-coaches', JSON.stringify(updatedCoaches));
    } catch (error) {
      console.error('Error removing coach:', error);
    }
  };

  const handleUpdateCoach = async () => {
    if (!editingCoach || !editingCoach.name || !editingCoach.email) return;
    
    try {
      // Update in Firebase
      await updateCoach(editingCoach.id, editingCoach);
      
      // Update local state
      const updatedCoaches = coaches.map(coach => 
        coach.id === editingCoach.id ? editingCoach : coach
      );
      setCoaches(updatedCoaches);
      
      // Update cache
      localStorage.setItem('eventflow-coaches', JSON.stringify(updatedCoaches));
      
      // Close modal
      setEditingCoach(null);
    } catch (error) {
      console.error('Error updating coach:', error);
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.role) return;
    
    try {
      const contactData = {
        ...newContact,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const contactId = await createContact(contactData);
      const newContactWithId = { id: contactId, ...contactData };
      
      const updatedContacts = [...contacts, newContactWithId];
      setContacts(updatedContacts);
      
      // Update cache
      localStorage.setItem('eventflow-contacts', JSON.stringify(updatedContacts));
      
      setNewContact({
        name: '',
        email: '',
        phone: '',
        role: '',
        category: 'other',
        notes: '',
      });
      setShowAddContact(false);
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const removeContact = async (id: string) => {
    try {
      await deleteContact(id);
      const updatedContacts = contacts.filter(contact => contact.id !== id);
      setContacts(updatedContacts);
      
      // Update cache
      localStorage.setItem('eventflow-contacts', JSON.stringify(updatedContacts));
    } catch (error) {
      console.error('Error removing contact:', error);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('eventflow-settings', JSON.stringify(settings));
    localStorage.setItem('eventflow-coaches', JSON.stringify(coaches));
    localStorage.setItem('eventflow-contacts', JSON.stringify(contacts));
  };

  // Load data with smart caching to prevent excessive Firebase reads
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check localStorage first (no Firebase reads)
        const savedCoaches = localStorage.getItem('eventflow-coaches');
        const savedContacts = localStorage.getItem('eventflow-contacts');
        const lastFetch = localStorage.getItem('eventflow-last-fetch');
        
        const now = Date.now();
        const cacheAge = lastFetch ? now - parseInt(lastFetch) : Infinity;
        const cacheTimeout = process.env.NODE_ENV === 'development' ? 300000 : 600000; // 5 min dev, 10 min prod
        
        // Use cached data if it's fresh enough
        if (savedCoaches && savedContacts && cacheAge < cacheTimeout) {
          console.log('Using cached coaches and contacts data');
          setCoaches(JSON.parse(savedCoaches));
          setContacts(JSON.parse(savedContacts));
          return;
        }
        
        // Only fetch from Firebase if cache is stale or empty
        console.log('Fetching fresh data from Firebase');
        const [coachesData, contactsData] = await Promise.all([
          getCoaches(),
          getContacts(),
        ]);
        
        // Update state and cache
        setCoaches(coachesData);
        setContacts(contactsData);
        localStorage.setItem('eventflow-coaches', JSON.stringify(coachesData));
        localStorage.setItem('eventflow-contacts', JSON.stringify(contactsData));
        localStorage.setItem('eventflow-last-fetch', now.toString());
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    // Load settings from localStorage (no Firebase reads)
    const savedSettings = localStorage.getItem('eventflow-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Team Configuration</h1>
                <p className="text-gray-600">Manage shared coaches, contacts, and team settings</p>
              </div>
            </div>
            <button
              onClick={saveSettings}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Save className="h-4 w-4" />
              <span>Save All</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Coaches Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Coach Management</h2>
              <button
                onClick={() => setShowAddCoach(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Coach</span>
              </button>
            </div>

            {/* Coaches List */}
            <div className="space-y-2">
              {coaches.map((coach) => (
                <motion.div
                  key={coach.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{coach.name}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingCoach(coach)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Edit coach"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeCoach(coach.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete coach"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
              {coaches.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No coaches yet. Add some using the button above.</p>
                </div>
              )}
            </div>
          </div>

          {/* Contacts Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Contact Management</h2>
              <button
                onClick={() => setShowAddContact(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Contact</span>
              </button>
            </div>

            {/* Contacts List */}
            <div className="space-y-2">
              {contacts.map((contact) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900">{contact.name}</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {contact.role}
                    </span>
                  </div>
                  <button
                    onClick={() => removeContact(contact.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete contact"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
              {contacts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No contacts yet. Add some using the button above.</p>
                </div>
              )}
            </div>
          </div>

          {/* Settings Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">System Settings</h2>
            
            <div className="space-y-6">
              {/* Default Contacts */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4">Default Contacts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Default Venue Contact</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={settings.defaultVenueContact.name}
                        onChange={(e) => setSettings({
                          ...settings,
                          defaultVenueContact: { ...settings.defaultVenueContact, name: e.target.value },
                        })}
                        placeholder="Venue Manager"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="email"
                        value={settings.defaultVenueContact.email}
                        onChange={(e) => setSettings({
                          ...settings,
                          defaultVenueContact: { ...settings.defaultVenueContact, email: e.target.value },
                        })}
                        placeholder="venue@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="tel"
                        value={settings.defaultVenueContact.phone}
                        onChange={(e) => setSettings({
                          ...settings,
                          defaultVenueContact: { ...settings.defaultVenueContact, phone: e.target.value },
                        })}
                        placeholder="(555) 123-4567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Default Emergency Contact</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={settings.defaultEmergencyContact.name}
                        onChange={(e) => setSettings({
                          ...settings,
                          defaultEmergencyContact: { ...settings.defaultEmergencyContact, name: e.target.value },
                        })}
                        placeholder="Emergency Services"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="email"
                        value={settings.defaultEmergencyContact.email}
                        onChange={(e) => setSettings({
                          ...settings,
                          defaultEmergencyContact: { ...settings.defaultEmergencyContact, email: e.target.value },
                        })}
                        placeholder="emergency@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="tel"
                        value={settings.defaultEmergencyContact.phone}
                        onChange={(e) => setSettings({
                          ...settings,
                          defaultEmergencyContact: { ...settings.defaultEmergencyContact, phone: e.target.value },
                        })}
                        placeholder="911"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Default Settings */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4">Team Default Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Default Auto-sync Setting</h4>
                      <p className="text-sm text-gray-500">Default sync preference for new team members (individual users can override)</p>
                    </div>
                    <button
                      onClick={() => setSettings({...settings, autoSyncToCalendar: !settings.autoSyncToCalendar})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.autoSyncToCalendar ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.autoSyncToCalendar ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Default Notifications Setting</h4>
                      <p className="text-sm text-gray-500">Default notification preference for new team members (individual users can override)</p>
                    </div>
                    <button
                      onClick={() => setSettings({...settings, enableNotifications: !settings.enableNotifications})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.enableNotifications ? 'bg-primary-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Coach Modal */}
        {showAddCoach && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add Coach</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newCoach.name}
                    onChange={(e) => setNewCoach({...newCoach, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newCoach.email}
                    onChange={(e) => setNewCoach({...newCoach, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newCoach.phone}
                    onChange={(e) => setNewCoach({...newCoach, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
                  <input
                    type="text"
                    value={newCoach.specialties.join(', ')}
                    onChange={(e) => setNewCoach({...newCoach, specialties: e.target.value.split(',').map(s => s.trim())})}
                    placeholder="HIIT, Yoga, Strength Training"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                  <input
                    type="text"
                    value={newCoach.availability[0] || ''}
                    onChange={(e) => setNewCoach({...newCoach, availability: [e.target.value]})}
                    placeholder="Weekends, Weekdays, Flexible"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={newCoach.bio}
                    onChange={(e) => setNewCoach({...newCoach, bio: e.target.value})}
                    rows={3}
                    placeholder="Tell us about this coach..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddCoach(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={addCoach}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add Coach
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Coach Modal */}
        {editingCoach && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Edit Coach</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={editingCoach.name}
                    onChange={(e) => setEditingCoach({...editingCoach, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={editingCoach.email}
                    onChange={(e) => setEditingCoach({...editingCoach, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editingCoach.phone}
                    onChange={(e) => setEditingCoach({...editingCoach, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
                  <input
                    type="text"
                    value={editingCoach.specialties.join(', ')}
                    onChange={(e) => setEditingCoach({...editingCoach, specialties: e.target.value.split(',').map(s => s.trim())})}
                    placeholder="HIIT, Yoga, Strength Training"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                  <input
                    type="text"
                    value={editingCoach.availability.join(', ')}
                    onChange={(e) => setEditingCoach({...editingCoach, availability: e.target.value.split(',').map(s => s.trim())})}
                    placeholder="Weekends, Weekdays, Flexible"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={editingCoach.bio}
                    onChange={(e) => setEditingCoach({...editingCoach, bio: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingCoach(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCoach}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Update Coach
                </button>
              </div>
            </div>
          </div>
        )}

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
                    rows={3}
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
      </main>
    </div>
  );
} 