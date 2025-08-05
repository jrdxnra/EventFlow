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
  onTimelineItemStatusUpdate: (eventId: string, itemId: string, newStatus: 'pending' | 'confirmed' | 'completed') => void
  onToggleCollapsed: () => void
  isTeamMode: boolean
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
  onTimelineItemStatusUpdate,
  onToggleCollapsed,
  isTeamMode,
}: EventSidebarProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

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
    <div
      key={event.id}
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
                      return <span className="text-gray-600">{diffWeeks}w</span>;
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
          <div
            className={`border-t overflow-hidden transition-all duration-300 ease-in-out ${
              expandedTimelines.has(event.id) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
            style={{
              backgroundColor: event.color ? `${event.color}05` : '#f9fafb',
            }}
          >
            <div className="p-1 space-y-0.5">
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
                    <div className="flex items-center space-x-2">
                      {/* Confirm Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStatus = item.status === 'confirmed' ? 'completed' : 'confirmed';
                          onTimelineItemStatusUpdate(event.id, item.id, newStatus);
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          item.status === 'confirmed' || item.status === 'completed'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-300 text-red-800 hover:bg-red-400'
                        }`}
                        title={
                          item.status === 'completed' ? 'Completed' : 
                          item.status === 'confirmed' ? 'Confirmed - Click to mark completed' : 
                          'Add to calendar'
                        }
                      >
                        {item.status === 'completed' ? (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Done
                          </span>
                        ) : item.status === 'confirmed' ? (
                          <span className="flex items-center">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </span>
                        )}
                      </button>
                      {/* Detail Button */}
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
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full h-full relative">
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
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          },
          '.ps-menu-button': {
            backgroundColor: 'transparent',
          },
          '.ps-menu-button:hover': {
            backgroundColor: '#f3f4f6',
          },
          // Completely disable hover expansion
          '&:hover': {
            width: collapsed ? '60px' : '280px',
          },
          // Hide scrollbar completely
          '.ps-sidebar-container::-webkit-scrollbar': {
            display: 'none',
          },
          // Also hide scrollbar on the content div
          '.flex-1::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        <div className="h-full flex flex-col">
          {/* Content */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto" 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
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
              {/* Hamburger Menu */}
              <div className="flex justify-center p-2">
                <button
                  onClick={onToggleCollapsed}
                  className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Toggle sidebar"
                >
                  <div className="flex flex-col space-y-0.5 sm:space-y-1">
                    <div className={`w-5 h-1 sm:w-6 sm:h-1 rounded-full ${isTeamMode ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}></div>
                    <div className={`w-5 h-1 sm:w-6 sm:h-1 rounded-full ${isTeamMode ? 'bg-[#3B82F6]' : 'bg-[#EF4444]'}`}></div>
                    <div className={`w-5 h-1 sm:w-6 sm:h-1 rounded-full ${isTeamMode ? 'bg-[#8B5CF6]' : 'bg-[#EC4899]'}`}></div>
                  </div>
                </button>
              </div>
              
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
                        <p className="text-xs text-gray-600">Use the + button to create your first event</p>
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