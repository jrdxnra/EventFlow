'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Users, Settings, Trash2, Edit3, Save } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { getCoaches, createCoach, deleteCoach, getContacts, createContact, deleteContact } from '@/lib/firebase-coaches';
import { Coach, Contact } from '@/lib/types';

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<'coaches' | 'contacts' | 'settings'>('coaches');
  
  // Coach Management
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [showAddCoach, setShowAddCoach] = useState(false);
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
      
      setCoaches([...coaches, newCoachWithId]);
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
      setCoaches(coaches.filter(coach => coach.id !== id));
    } catch (error) {
      console.error('Error removing coach:', error);
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
      
      setContacts([...contacts, newContactWithId]);
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
      setContacts(contacts.filter(contact => contact.id !== id));
    } catch (error) {
      console.error('Error removing contact:', error);
    }
  };

  const saveSettings = () => {
    // Save to localStorage for now
    localStorage.setItem('eventflow-settings', JSON.stringify(settings));
    localStorage.setItem('eventflow-coaches', JSON.stringify(coaches));
    localStorage.setItem('eventflow-contacts', JSON.stringify(contacts));
  };

  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingCoaches(true);
        setIsLoadingContacts(true);
        
        const [coachesData, contactsData] = await Promise.all([
          getCoaches(),
          getContacts(),
        ]);
        
        setCoaches(coachesData);
        setContacts(contactsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoadingCoaches(false);
        setIsLoadingContacts(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    // Load from localStorage
    const savedSettings = localStorage.getItem('eventflow-settings');
    const savedCoaches = localStorage.getItem('eventflow-coaches');
    const savedContacts = localStorage.getItem('eventflow-contacts');
    
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    if (savedCoaches) {
      setCoaches(JSON.parse(savedCoaches));
    }
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
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

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'coaches', label: 'Coaches', icon: Users },
                { id: 'contacts', label: 'Contacts', icon: Users },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Coaches Tab */}
            {activeTab === 'coaches' && (
              <div>
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

                {/* Coaches List */}
                <div className="space-y-4">
                  {coaches.map((coach) => (
                    <motion.div
                      key={coach.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">{coach.name}</h3>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {coach.availability}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center space-x-1">
                              <span>📧 {coach.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>📞 {coach.phone}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              <strong>Specialties:</strong> {coach.specialties.join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingCoach(coach)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeCoach(coach.id)}
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

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div>
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

                {/* Contacts List */}
                <div className="space-y-4">
                  {contacts.map((contact) => (
                    <motion.div
                      key={contact.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">{contact.name}</h3>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {contact.role}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            {contact.email && (
                              <div className="flex items-center space-x-1">
                                <span>📧 {contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center space-x-1">
                                <span>📞 {contact.phone}</span>
                              </div>
                            )}
                          </div>
                          {contact.notes && (
                            <p className="text-sm text-gray-600">{contact.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeContact(contact.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
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
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs text-blue-800">
                        <strong>Note:</strong> These are team defaults. Individual users can set their own preferences in their profile.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 