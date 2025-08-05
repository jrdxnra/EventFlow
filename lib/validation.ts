import { z } from 'zod';

export const eventFormSchema = z.object({
  eventName: z.string().min(1, 'Event name is required').max(100, 'Event name must be less than 100 characters'),
  eventDate: z.string().min(1, 'Event date is required'),
  eventTime: z.string().min(1, 'Event time is required'),
  eventEndTime: z.string().min(1, 'Event end time is required'),
  eventLocation: z.string().min(1, 'Event location is required'),
  eventScope: z.enum(['team', 'individual'], { required_error: 'Please select event scope' }),
  pointOfContact: z.object({
    name: z.string().min(1, 'Contact name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
  }),

  eventPurpose: z.string().min(10, 'Please provide a detailed event purpose (at least 10 characters)'),
  teamRoles: z.array(z.string()).min(1, 'At least one team role is required'),
  marketingChannels: z.array(z.string()).min(1, 'Select at least one marketing channel'),
  ticketingNeeds: z.string().optional(),
  gemsDetails: z.string().optional(),
  specialRequirements: z.string().optional(),

  otherNotes: z.string().optional(),
  eventType: z.string().optional(),
});

export type EventFormData = z.infer<typeof eventFormSchema>

export const validateFormData = (data: any): { isValid: boolean; errors: Record<string, string> } => {
  try {
    eventFormSchema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: 'Validation failed' } };
  }
}; 