// Single source of truth for all event-related constants
// Used by both creation flow and edit modal to ensure consistency

export const EVENT_TYPES = [
  { value: 'popup-class', label: 'Pop up Event' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Google Event' },
] as const;

export const EVENT_SCOPES = [
  { value: 'team', label: 'Team Event' },
  { value: 'individual', label: 'Individual Event' },
] as const;

export const MARKETING_CHANNELS = [
  { id: 'media', label: 'Media' },
  { id: 'email', label: 'Email Marketing' },
  { id: 'flyers', label: 'Flyers & Posters' },
  { id: 'collaborations', label: 'Collaborations' },
  { id: 'showy', label: 'Showy' },
] as const;

export const EVENT_COLORS = [
  { value: '#10B981', label: 'Green' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#F59E0B', label: 'Orange' },
  { value: '#EF4444', label: 'Red' },
  { value: '#EC4899', label: 'Pink' },
] as const;

export const TICKETING_OPTIONS = [
  { value: 'yes', label: 'Yes - Need tables, chairs, supplies' },
  { value: 'no', label: 'No - Bringing own equipment' },
] as const;

// Timeline/Task specific constants
export const TASK_CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'preparation', label: 'Preparation' },
  { value: 'execution', label: 'Execution' },
] as const;

export const TASK_PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

export const TASK_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
] as const;

export const TEAM_ROLES = [
  'Event Lead',
  'Setup Coordinator', 
  'Registration Lead',
  'Activities Coordinator',
  'Safety Monitor',
  'Cleanup Coordinator',
  'Tech Support',
  'Photography/Media',
  'Guest Relations',
  'Equipment Manager',
] as const;

export const CONTACT_CATEGORIES = [
  { value: 'team', label: 'Team' },
  { value: 'venue', label: 'Venue' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'other', label: 'Other' },
] as const;

// Arrival time options for team members
// Values are in minutes relative to event start time (negative = before, 0 = at start)
export const ARRIVAL_TIME_OPTIONS = [
  { value: -180, label: '3 hours before' },
  { value: -120, label: '2 hours before' },
  { value: -60, label: '1 hour before' },
  { value: -30, label: '30 minutes before' },
  { value: 0, label: 'At event start' },
  { value: 'custom', label: 'Custom time' },
] as const;

// Default GEMS details template
export const DEFAULT_GEMS_DETAILS = `# of Chairs:
# of Tables:
# of Table Cloths:`;