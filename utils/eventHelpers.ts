import { Event, User } from '@prisma/client';
import { isAfter, isBefore, parseISO } from 'date-fns';
import { EventWithCommitteeMemberIdsAndNames } from './models';

export function forceAsDate(value: string | Date): Date {
  if (typeof value === 'string') return parseISO((value as unknown) as string);

  return value;
}

export function forceAsString(value: string | Date): string {
  if (typeof value === 'string') return value;
  
  return value.toISOString();
}

export function isBeforeSubmissionPeriod(event: Event): boolean {
  const now = new Date().getTime();
  const startDate = forceAsDate(event.gameSubmissionPeriodStart);

  return isBefore(now, startDate);
}

export function isAfterSubmissionPeriod(event: Event): boolean {
  const now = new Date().getTime();
  const endDate = forceAsDate(event.gameSubmissionPeriodEnd);

  return isAfter(now, endDate);
}

export function isAfterIncentivePeriod(event: Event): boolean {
  const now = new Date().getTime();
  const endDate = forceAsDate(event.incentiveSubmissionPeriodEnd);

  return isAfter(now, endDate);
}

export function areSubmissionsOpen(event: Event): boolean {
  return !isBeforeSubmissionPeriod(event) && !isAfterSubmissionPeriod(event);
}

export function areIncentivesOpen(event: Event): boolean {
  return !isBeforeSubmissionPeriod(event) && !isAfterIncentivePeriod(event);
}

export function isMemberOfCommittee(event: EventWithCommitteeMemberIdsAndNames, user: User): boolean {
  return event.committeeMembers.some(member => member.id === user.id);
}

export function canUserViewEvent(event: EventWithCommitteeMemberIdsAndNames, user: User | null): boolean {
  if (event.visible) return true;
  
  return user ? (user.isAdmin || event.committeeMembers.some(member => member.id === user.id)) : false;
}
