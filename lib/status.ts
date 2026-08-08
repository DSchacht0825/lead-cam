export const STATUSES = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'DEMO_BUILT',
  'APPOINTMENT',
  'PROPOSAL',
  'WON',
  'FOLLOW_UP',
] as const;

export type StatusValue = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<StatusValue, string> = {
  NEW: 'New Leads',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  DEMO_BUILT: 'Demo Built',
  APPOINTMENT: 'Appointment',
  PROPOSAL: 'Proposal',
  WON: 'Won',
  FOLLOW_UP: 'Follow-Up',
};
