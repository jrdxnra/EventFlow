// Role assignment utilities for connecting logistics roles to event forms
import { Coach } from './types';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface RoleAssignments {
  [role: string]: TeamMember | null;
}

/**
 * Get the current role assignments from team members
 */
export function getRoleAssignments(teamMembers: TeamMember[]): RoleAssignments {
  const assignments: RoleAssignments = {};
  
  teamMembers.forEach(member => {
    assignments[member.role] = member;
  });
  
  return assignments;
}

/**
 * Get the Event Lead from team members (fallback person for all roles)
 */
export function getEventLead(teamMembers: TeamMember[]): TeamMember | null {
  return teamMembers.find(member => member.role === 'Event Lead') || null;
}

/**
 * Get the assigned person for a specific role, with Event Lead as fallback
 */
export function getAssignedPerson(teamMembers: TeamMember[], targetRole: string): TeamMember | null {
  // First try to find someone assigned to the specific role
  const assignedPerson = teamMembers.find(member => member.role === targetRole);
  if (assignedPerson) return assignedPerson;
  
  // Fallback to Event Lead
  return getEventLead(teamMembers);
}

/**
 * Get suggested assignee based on task category
 */
export function getSuggestedAssignee(teamMembers: TeamMember[], taskCategory: string): TeamMember | null {
  const categoryRoleMap: { [key: string]: string[] } = {
    'marketing': ['Photography/Media', 'Guest Relations'],
    'logistics': ['Setup Coordinator', 'Equipment Manager'],
    'preparation': ['Activities Coordinator', 'Setup Coordinator'],
    'execution': ['Event Lead', 'Activities Coordinator'],
  };
  
  // Try to find someone assigned to a relevant role for this category
  const relevantRoles = categoryRoleMap[taskCategory] || [];
  
  for (const role of relevantRoles) {
    const assignedPerson = getAssignedPerson(teamMembers, role);
    if (assignedPerson) return assignedPerson;
  }
  
  // Fallback to Event Lead
  return getEventLead(teamMembers);
}

/**
 * Get the contact person (should be Event Lead by default)
 */
export function getEventContactPerson(teamMembers: TeamMember[]): TeamMember | null {
  return getEventLead(teamMembers);
}

/**
 * Get activity leader suggestion based on activity type/role needs
 */
export function getActivityLeaderSuggestion(teamMembers: TeamMember[], activityType?: string): TeamMember | null {
  // For now, suggest Activities Coordinator or fallback to Event Lead
  return getAssignedPerson(teamMembers, 'Activities Coordinator');
}

/**
 * Get responsible person suggestion for schedule items
 */
export function getResponsiblePersonSuggestion(teamMembers: TeamMember[], scheduleType?: string): TeamMember | null {
  const scheduleRoleMap: { [key: string]: string } = {
    'setup': 'Setup Coordinator',
    'registration': 'Registration Lead',
    'cleanup': 'Cleanup Coordinator',
    'activity': 'Activities Coordinator',
  };
  
  const suggestedRole = scheduleRoleMap[scheduleType || ''] || 'Event Lead';
  return getAssignedPerson(teamMembers, suggestedRole);
}