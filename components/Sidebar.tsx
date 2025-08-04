'use client';

import { motion } from 'framer-motion';
import { 
  Calendar, 
  Plus, 
  ChevronRight, 
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Sidebar, Menu as ProMenu, MenuItem } from 'react-pro-sidebar';

import { EventData } from '@/lib/types';

interface TimelineItem {
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

interface EventSidebarProps {
  events: EventData[]
  isLoading: boolean
  expandedTimelines: Set<string>
  collapsedEventGroups: Set<string>
  eventTimelines: Record<string, TimelineItem[]>
  collapsed: boolean
  onToggleTimeline: (eventId: string) => void
  onToggleEventGroup: (eventId: string) => void
  onOpenDetailsModal: (event: EventData) => void
  onTimelineItemClick: (eventId: string, item: TimelineItem) => void

  onToggleCollapsed: () => void
}

const EventSidebar = React.memo(function EventSidebar({
  events,
  isLoading,
  expandedTimelines,
  collapsedEventGroups,
  eventTimelines,
  collapsed,
  onToggleTimeline,
  onToggleEventGroup,
  onOpenDetailsModal,
  onTimelineItemClick,

  onToggleCollapsed,
}: EventSidebarProps) {

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
      });
    }
  };



  const EventCard = ({ event }: { event: EventData }) => (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="border rounded-lg overflow-hidden mb-3"
      style={{
        backgroundColor: event.color ? `${event.color}15` : '#f8f9fa',
        borderLeftColor: event.color || '#e5e7eb',
        borderLeftWidth: '4px',
      }}
    >
      {collapsedEventGroups.has(event.id) ? (
        /* Collapsed State - Clean with Text */
        <div 
          className="p-3 hover:bg-primary-50 cursor-pointer transition-colors"
          onClick={() => onToggleEventGroup(event.id)}
          style={{
            backgroundColor: '#f8faff',
          }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
              style={{
                backgroundColor: event.color || '#10B981',
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{event.name}</div>
              <div className="text-xs text-gray-500">
                {formatDate(new Date(event.date))} at {event.time}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      ) : (
        /* Expanded State */
        <>
          <div className="p-2">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium text-gray-900">{event.name}</div>
              <div className="flex items-center space-x-1">
                <div className="text-xs text-gray-600">
                  {(() => {
                    const eventDate = new Date(event.date + ' ' + event.time);
                    const now = new Date();
                    const diffTime = eventDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                    if (diffDays < 0) {
                      return <span className="text-red-600">Event passed</span>;
                    } else if (diffDays === 0) {
                      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                      if (diffHours <= 0) {
                        return <span className="text-green-600 font-medium">Today!</span>;
                      } else {
                        return <span className="text-orange-600">{diffHours}h away</span>;
                      }
                    } else if (diffDays === 1) {
                      return <span className="text-orange-600">Tomorrow</span>;
                    } else if (diffDays <= 7) {
                      return <span className="text-blue-600">{diffDays} days</span>;
                    } else {
                      const diffWeeks = Math.ceil(diffDays / 7);
                      return <span className="text-gray-600">{diffWeeks} week{diffWeeks > 1 ? 's' : ''}</span>;
                    }
                  })()}
                </div>
                <button
                  onClick={() => onOpenDetailsModal(event)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Edit event details"
                >
                  <div
                    className="w-3 h-3 rounded-full shadow-sm"
                    style={{
                      backgroundColor: event.color || '#10B981',
                    }}
                  />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 truncate">{event.location}</p>
              <div className="flex items-center space-x-1">
                <Link
                  href={`/logistics?eventId=${event.id}`}
                  className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  title="View logistics"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </Link>
                <button
                  onClick={() => onToggleTimeline(event.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Toggle timeline tasks"
                >
                  {expandedTimelines.has(event.id) ? (
                    <ChevronDown className="h-4 w-4 font-bold" />
                  ) : (
                    <ChevronRight className="h-4 w-4 font-bold" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Tasks */}
          {expandedTimelines.has(event.id) && eventTimelines[event.id] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t p-1 space-y-0.5"
              style={{
                backgroundColor: event.color ? `${event.color}05` : '#f9fafb',
              }}
            >
              {eventTimelines[event.id]?.map((item) => (
                <div 
                  key={item.id} 
                  className="p-1.5 rounded border relative cursor-pointer hover:shadow-sm transition-shadow"
                  style={{
                    backgroundColor: event.color ? `${event.color}15` : '#f8f9fa',
                    borderLeftColor: event.color || '#e5e7eb',
                    borderLeftWidth: '3px',
                  }}
                  onClick={() => onTimelineItemClick(event.id, item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-medium text-gray-900 truncate">{item.title}</h5>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {item.dueDate} at {item.dueTime}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTimelineItemClick(event.id, item);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Edit timeline item"
                    >
                      <div
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{
                          backgroundColor: event.color || '#10B981',
                        }}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );

  return (
    <div className="w-full relative">
      <Sidebar
        collapsed={collapsed}
        collapsedWidth="60px"
        width="280px"
        backgroundColor="#ffffff"
        rootStyles={{
          border: 'none',
          height: '100%',
          '.ps-sidebar-container': {
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            height: '100%',
          },
          '.ps-menu-button': {
            backgroundColor: 'transparent',
          },
          '.ps-menu-button:hover': {
            backgroundColor: '#f3f4f6',
          },
        }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            {!collapsed && (
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
            )}
            <button
              onClick={onToggleCollapsed}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <ProMenu
              menuItemStyles={{
                button: {
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  '&:hover': {
                    backgroundColor: '#f3f4f6',
                  },
                },
              }}
            >
              {/* Create Event Button */}
              <MenuItem
                icon={<Plus className="h-4 w-4" />}
                component={<Link href="/event-setup" />}
              >
                {!collapsed && 'Create Event'}
              </MenuItem>

              {/* Events List */}
              <div className="p-2">
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                    {!collapsed && <p className="text-sm text-gray-600">Loading events...</p>}
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-4">
                    <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    {!collapsed && (
                      <>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">No events yet</h4>
                        <p className="text-xs text-gray-600 mb-3">Create your first event to get started</p>
                        <Link href="/event-setup" className="btn-primary text-sm px-3 py-1">
                          <Plus className="h-3 w-3 mr-1" />
                            Create Event
                        </Link>
                      </>
                    )}
                  </div>
                ) : collapsed ? (
                /* Collapsed View - Just colored icons */
                  <div className="space-y-1">
                    {events
                      .filter(event => new Date(event.date) >= new Date())
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 8)
                      .map((event) => (
                        <div
                          key={event.id}
                          className="flex justify-center p-2 rounded-lg hover:bg-primary-50 cursor-pointer transition-colors"
                          style={{
                            backgroundColor: '#f8faff',
                          }}
                          onClick={() => onOpenDetailsModal(event)}
                          title={`${event.name} - ${formatDate(new Date(event.date))} at ${event.time}`}
                        >
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{
                              backgroundColor: event.color || '#10B981',
                            }}
                          />
                        </div>
                      ))}
                  </div>
                ) : (
                /* Expanded View - Full event cards */
                  <div className="space-y-2">
                    {events
                      .filter(event => new Date(event.date) >= new Date())
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 8)
                      .map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                  </div>
                )}
              </div>
            </ProMenu>
          </div>
        </div>
      </Sidebar>
    </div>
  );
});

export default EventSidebar;