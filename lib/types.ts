export interface TimelineItem {
  id: string
  title: string
  description: string
  dueDate: string
  dueTime: string
  category: 'marketing' | 'logistics' | 'preparation' | 'execution'
  status: 'pending' | 'confirmed' | 'completed'
  priority: 'high' | 'medium' | 'low'
  assignedTo?: string
  notes?: string
}

export interface Event {
  id: string
  name: string
  date: string
  time: string
  eventEndTime: string
  location: string
  pointOfContact: {
    name: string
    email: string
    phone: string
  }

  eventPurpose: string
  coachSupport: string
  marketingChannels: string[]
  ticketingNeeds: string
  gemsDetails: string
  specialRequirements: string

  otherNotes: string
  eventType: string
  status: 'draft' | 'active' | 'completed'
  color?: string // Calendar color for event distinction
  timelineItems?: TimelineItem[]
  createdAt: Date
  updatedAt: Date
}

export interface FormErrors {
  [key: string]: string
}

export interface Step {
  id: number
  title: string
  description: string
  status: 'pending' | 'active' | 'completed'
  data?: any
  completedAt?: Date
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  assignedTasks: string[]
} 