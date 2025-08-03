'use client';

import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Zap, Clock, Users, Target, Calendar, DollarSign, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { auth } from '@/lib/firebase';
import { createEvent } from '@/lib/firebase-events';
import { validateFormData, EventFormData } from '@/lib/validation';


// Quick-fill templates for different event types
const eventTemplates = [
  {
    id: 'popup-class',
    title: 'Pop-up Class',
    description: 'Quick outdoor or indoor session',
    icon: Zap,
    color: 'bg-green-500',
    defaults: {
      eventType: 'popup-class',
      marketingChannels: ['media', 'email'],
      coachSupport: 'solo',
      specialRequirements: 'Portable equipment, outdoor space',
    },
  },
  {
    id: 'workshop',
    title: 'Workshop',
    description: 'Educational session with hands-on training',
    icon: Target,
    color: 'bg-blue-500',
    defaults: {
      eventType: 'workshop',
      marketingChannels: ['media', 'email', 'flyers'],
      coachSupport: 'team',
      specialRequirements: 'Classroom setup, presentation materials',
    },
  },
  {
    id: 'challenge',
    title: 'Challenge',
    description: 'Single-day or multi-day fitness challenge',
    icon: Clock,
    color: 'bg-purple-500',
    defaults: {
      eventType: 'challenge',
      marketingChannels: ['media', 'email', 'collaborations'],
      coachSupport: 'team',
      specialRequirements: 'Progress tracking, daily check-ins',
    },
  },
  {
    id: 'seminar',
    title: 'Google Event',
    description: '',
    icon: Users,
    color: 'bg-orange-500',
    defaults: {
      eventType: 'seminar',
      marketingChannels: ['media', 'email', 'flyers', 'collaborations'],
      coachSupport: 'full-support',
      specialRequirements: 'Venue with presentation capabilities, catering',
    },
  },
];

const formSteps = [
  {
    id: 1,
    title: 'Event Basics',
    description: 'Tell us about your event',
    icon: Calendar,
  },
  {
    id: 2,
    title: 'Contact & Audience',
    description: 'Who to contact and who to reach',
    icon: Users,
  },
  {
    id: 3,
    title: 'Logistics & Requirements',
    description: 'Support needs and special requirements',
    icon: DollarSign,
  },
  {
    id: 4,
    title: 'Review & Launch',
    description: 'Final review and start planning',
    icon: FileText,
  },
];

export default function EventSetup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string>('');
  
  const [formData, setFormData] = useState<EventFormData>({
    eventName: '',
    eventDate: '',
    eventTime: '',
    eventEndTime: '',
    eventLocation: '',
    pointOfContact: {
      name: '',
      email: '',
      phone: '',
    },

    eventPurpose: '',
    coachSupport: '',
    marketingChannels: [],
    ticketingNeeds: '',
    gemsDetails: '',
    specialRequirements: '',

    otherNotes: '',
    eventType: '',
  });

  // Auto-save functionality
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (Object.keys(formData).length > 0) {
        saveDraft();
      }
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [formData]);

  const saveDraft = async () => {
    setSaveStatus('saving');
    try {
      // Save to localStorage as draft
      localStorage.setItem('eventflow-draft', JSON.stringify(formData));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving draft:', error);
    }
  };

  const loadDraft = () => {
    try {
      const draft = localStorage.getItem('eventflow-draft');
      if (draft) {
        setFormData(JSON.parse(draft));
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  // Authentication functions
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setErrors({ auth: error.message });
    }
  };



  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadDraft();
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = eventTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({ ...prev, ...template.defaults }));
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleContactChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      pointOfContact: {
        ...prev.pointOfContact,
        [field]: value,
      },
    }));
    // Clear error when user starts typing
    if (errors[`pointOfContact.${field}`]) {
      setErrors(prev => ({ ...prev, [`pointOfContact.${field}`]: '' }));
    }
  };

  const validateCurrentStep = (): boolean => {
    const stepValidations = {
      1: () => {
        const errors: Record<string, string> = {};
        if (!formData.eventName.trim()) errors.eventName = 'Event name is required';
        if (!formData.eventDate) errors.eventDate = 'Event date is required';
        if (!formData.eventTime) errors.eventTime = 'Event time is required';
        if (!formData.eventEndTime) errors.eventEndTime = 'Event end time is required';
        if (!formData.eventLocation.trim()) errors.eventLocation = 'Event location is required';
        setErrors(errors);
        return Object.keys(errors).length === 0;
      },
      2: () => {
        const errors: Record<string, string> = {};
        if (!formData.pointOfContact.name.trim()) errors['pointOfContact.name'] = 'Contact name is required';
        if (!formData.pointOfContact.email.trim()) errors['pointOfContact.email'] = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.pointOfContact.email)) {
          errors['pointOfContact.email'] = 'Valid email is required';
        }

        if (!formData.eventPurpose.trim() || formData.eventPurpose.length < 10) {
          errors.eventPurpose = 'Please provide a detailed event purpose (at least 10 characters)';
        }
        setErrors(errors);
        return Object.keys(errors).length === 0;
      },
      3: () => {
        const errors: Record<string, string> = {};
        if (!formData.coachSupport) errors.coachSupport = 'Coach support level is required';
        if (formData.marketingChannels.length === 0) errors.marketingChannels = 'Select at least one marketing channel';
        setErrors(errors);
        return Object.keys(errors).length === 0;
      },
    };

    const validation = stepValidations[currentStep as keyof typeof stepValidations];
    return validation ? validation() : true;
  };

  const nextStep = () => {
    console.log('Next button clicked, current step:', currentStep);
    console.log('Form data:', formData);
    
    const isValid = validateCurrentStep();
    console.log('Validation result:', isValid);
    console.log('Current errors:', errors);
    
    if (isValid) {
      if (currentStep < formSteps.length) {
        console.log('Moving to next step:', currentStep + 1);
        setCurrentStep(currentStep + 1);
        setErrors({}); // Clear errors when moving to next step
      }
    } else {
      console.log('Validation failed, staying on current step');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { isValid, errors: submitErrors } = validateFormData(formData);
      if (!isValid) {
        setErrors(submitErrors);
        setIsSubmitting(false);
        return;
      }

      // Save to Firebase now that we have authentication
      const eventId = await createEvent(formData);
      
      // Clear draft after successful submission
      localStorage.removeItem('eventflow-draft');
      
      // Show success screen
      setCreatedEventId(eventId);
      setShowSuccess(true);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error submitting event:', error);
      setErrors({ general: 'Failed to create event. Please try again.' });
      setIsSubmitting(false);
    }
  };

  const getFieldError = (field: string): string => {
    return errors[field] || '';
  };



  const renderStepContent = () => {
    switch (currentStep) {
    case 1:
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Event Type</h3>
            <p className="text-gray-600 mb-6">Select a template to get started quickly, or start from scratch.</p>
              
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {eventTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <div
                    key={template.id}
                    className={`quick-fill-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${template.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{template.title}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">Event Name *</label>
              <input
                type="text"
                className={`form-input ${getFieldError('eventName') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="e.g., Summer Fitness Pop-up, Nutrition Workshop"
                value={formData.eventName}
                onChange={(e) => handleInputChange('eventName', e.target.value)}
              />
              {getFieldError('eventName') && (
                <p className="form-error flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {getFieldError('eventName')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Event Date *</label>
                <input
                  type="date"
                  className={`form-input ${getFieldError('eventDate') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  value={formData.eventDate}
                  onChange={(e) => handleInputChange('eventDate', e.target.value)}
                />
                {getFieldError('eventDate') && (
                  <p className="form-error flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {getFieldError('eventDate')}
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">Start Time *</label>
                <input
                  type="time"
                  className={`form-input w-full ${getFieldError('eventTime') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  value={formData.eventTime}
                  onChange={(e) => handleInputChange('eventTime', e.target.value)}
                />
                {getFieldError('eventTime') && (
                  <p className="form-error flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {getFieldError('eventTime')}
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">End Time *</label>
                <input
                  type="time"
                  className={`form-input w-full ${getFieldError('eventEndTime') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  value={formData.eventEndTime}
                  onChange={(e) => handleInputChange('eventEndTime', e.target.value)}
                />
                {getFieldError('eventEndTime') && (
                  <p className="form-error flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {getFieldError('eventEndTime')}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Event Location *</label>
              <input
                type="text"
                className={`form-input ${getFieldError('eventLocation') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="e.g., Central Park, Local Gym, Community Center"
                value={formData.eventLocation}
                onChange={(e) => handleInputChange('eventLocation', e.target.value)}
              />
              {getFieldError('eventLocation') && (
                <p className="form-error flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {getFieldError('eventLocation')}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      );

    case 2:
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              
            <div>
              <label className="form-label">Point of Contact *</label>
              <input
                type="text"
                className={`form-input ${getFieldError('pointOfContact.name') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Your name or main contact person"
                value={formData.pointOfContact.name}
                onChange={(e) => handleContactChange('name', e.target.value)}
              />
              {getFieldError('pointOfContact.name') && (
                <p className="form-error flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {getFieldError('pointOfContact.name')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className={`form-input ${getFieldError('pointOfContact.email') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="contact@yourbusiness.com"
                  value={formData.pointOfContact.email}
                  onChange={(e) => handleContactChange('email', e.target.value)}
                />
                {getFieldError('pointOfContact.email') && (
                  <p className="form-error flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {getFieldError('pointOfContact.email')}
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="(555) 123-4567"
                  value={formData.pointOfContact.phone}
                  onChange={(e) => handleContactChange('phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">Event Purpose/Goal *</label>
              <textarea
                className={`form-input ${getFieldError('eventPurpose') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                rows={3}
                placeholder="What do you want to achieve with this event? (e.g., build community, generate leads, educate participants)"
                value={formData.eventPurpose}
                onChange={(e) => handleInputChange('eventPurpose', e.target.value)}
              />
              {getFieldError('eventPurpose') && (
                <p className="form-error flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {getFieldError('eventPurpose')}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      );

    case 3:
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Support & Logistics</h3>
              
            <div>
              <label className="form-label">Coach Support Needed *</label>
              <select
                className={`form-input ${getFieldError('coachSupport') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                value={formData.coachSupport}
                onChange={(e) => handleInputChange('coachSupport', e.target.value)}
              >
                <option value="">Select support level</option>
                <option value="solo">Solo - I'll handle everything</option>
                <option value="assistant">Assistant - Need 1-2 helpers</option>
                <option value="team">Team - Need 3+ team members</option>
                <option value="full-support">Full Support - Need comprehensive team</option>
              </select>
              {getFieldError('coachSupport') && (
                <p className="form-error flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {getFieldError('coachSupport')}
                </p>
              )}
            </div>

            <div>
              <label className="form-label">Marketing Channels *</label>
              <div className="space-y-2">
                {[
                  { id: 'media', label: 'Media' },
                  { id: 'email', label: 'Email Marketing' },
                  { id: 'flyers', label: 'Flyers & Posters' },
                  { id: 'collaborations', label: 'Collaborations' },
                  { id: 'showy', label: 'Showy' },
                ].map((channel) => (
                  <label key={channel.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.marketingChannels.includes(channel.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange('marketingChannels', [...formData.marketingChannels, channel.id]);
                        } else {
                          handleInputChange('marketingChannels', formData.marketingChannels.filter(c => c !== channel.id));
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{channel.label}</span>
                  </label>
                ))}
              </div>
              {getFieldError('marketingChannels') && (
                <p className="form-error flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {getFieldError('marketingChannels')}
                </p>
              )}
            </div>

            <div>
              <label className="form-label">GEMS Ticket (Optional)</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="gemsTicket"
                    value="yes"
                    checked={formData.ticketingNeeds === 'yes'}
                    onChange={(e) => handleInputChange('ticketingNeeds', e.target.value)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Yes - Need tables, chairs, supplies</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="gemsTicket"
                    value="no"
                    checked={formData.ticketingNeeds === 'no'}
                    onChange={(e) => handleInputChange('ticketingNeeds', e.target.value)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">No - Bringing own equipment</span>
                </label>
              </div>
                
              {formData.ticketingNeeds === 'yes' && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="form-label">GEMS Ticket Details</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      value={formData.gemsDetails || `# of Chairs:
# of Tables:
# of Table Cloths:`}
                      onChange={(e) => handleInputChange('gemsDetails', e.target.value)}
                    />
                    <p className="text-sm text-gray-500 mt-1">Just add the quantities next to each item. Add any additional items below the template.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Requirements</h3>
              
            <div>
              <label className="form-label">Special Requirements</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Describe what equipment, supplies, or special arrangements you'll need for this event. For example: 'Need 3 tables, 20 chairs, sound system, and water bottles' or 'Require accessible entrance and dietary accommodations'"
                value={formData.specialRequirements}
                onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
              />
            </div>
          </div>
        </motion.div>
      );

    case 4:
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Event Details</h3>
            <p className="text-gray-600 mb-6">Please review all the information before we start planning your event.</p>
              
            <div className="card space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Event Basics</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Name:</strong> {formData.eventName}</p>
                    <p><strong>Date:</strong> {formData.eventDate}</p>
                    <p><strong>Time:</strong> {formData.eventTime} - {formData.eventEndTime}</p>
                    <p><strong>Location:</strong> {formData.eventLocation}</p>
                  </div>
                </div>
                  
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Contact:</strong> {formData.pointOfContact.name}</p>
                    <p><strong>Email:</strong> {formData.pointOfContact.email}</p>
                    <p><strong>Phone:</strong> {formData.pointOfContact.phone}</p>
                  </div>
                </div>
              </div>
                
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Event Purpose</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Purpose:</strong> {formData.eventPurpose}</p>
                  </div>
                </div>
                  
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Logistics</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Support:</strong> {formData.coachSupport}</p>
                    <p><strong>GEMS Ticket:</strong> {formData.ticketingNeeds === 'yes' ? 'Yes' : 'No'}</p>
                    {formData.ticketingNeeds === 'yes' && formData.gemsDetails && (
                      <div className="mt-2">
                        <p><strong>GEMS Details:</strong></p>
                        <pre className="text-sm text-gray-600 whitespace-pre-wrap">{formData.gemsDetails}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                
              {formData.specialRequirements && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Special Requirements</h4>
                  <p className="text-sm text-gray-600">{formData.specialRequirements}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• AI will generate a customized marketing timeline</li>
              <li>• We'll create team role assignments</li>
              <li>• Automated venue booking templates will be prepared</li>
              <li>• Marketing materials will be generated</li>
              <li>• You'll get a complete event planning dashboard</li>
            </ul>
          </div>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errors.general}
              </p>
            </div>
          )}
        </motion.div>
      );

    default:
      return null;
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show success screen after event creation
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Event Created Successfully!</h2>
              <p className="text-gray-600">Your event "{formData.eventName}" has been saved and is ready for planning.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-3">What happens next?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-blue-800">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                         Review marketing timeline
                  </div>
                  <div className="flex items-center text-sm text-blue-800">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                         Confirm tasks → Google Calendar
                  </div>
                  <div className="flex items-center text-sm text-blue-800">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                         Assign team roles
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-blue-800">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                         Create day-of schedule
                  </div>
                  <div className="flex items-center text-sm text-blue-800">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                         Export contact lists
                  </div>
                  <div className="flex items-center text-sm text-blue-800">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                         Track progress
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => window.location.href = `/event/${createdEventId}/logistics`}
                className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Setup Day-of Logistics
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-500">
              <p>Event ID: {createdEventId}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Welcome to EventFlow</h2>
            <p className="mt-2 text-gray-600">Sign in to start planning your event</p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            
            {errors.auth && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-800 text-sm">{errors.auth}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {saveStatus === 'saving' && (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    <span>Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Saved</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>Save failed</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-700">
                  <span>Welcome, {user?.displayName || user?.email}</span>
                </div>
                <button
                  onClick={() => auth.signOut()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Event Setup</h1>
            <span className="text-sm text-gray-500">Step {currentStep} of {formSteps.length}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {formSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`step-indicator ${
                  currentStep > step.id ? 'step-completed' :
                    currentStep === step.id ? 'step-active' : 'step-pending'
                }`}>
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                {index < formSteps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {formSteps[currentStep - 1]?.title || 'Step'}
            </h2>
            <p className="text-gray-600">{formSteps[currentStep - 1]?.description || ''}</p>
          </div>

          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`btn-secondary ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            <div className="flex items-center space-x-4">
              {currentStep < formSteps.length ? (
                <button onClick={nextStep} className="btn-primary">
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`btn-primary ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Event...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Start Planning
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 