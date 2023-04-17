import { Event, RunIncentive, Prisma } from '@prisma/client';
import { IncomingMessage, ServerResponse } from 'http';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export type UserWithVettingInfo = Prisma.UserGetPayload<{ include: { vettingInfo: true } }>;

export type PublicUserData = { id: string; name: string | null; };
export type EventWithCommitteeMemberIdsAndNames = Event & {
  committeeMembers: PublicUserData[];
};

export type SubmissionWithCategories = Prisma.GameSubmissionGetPayload<{ include: { categories: true } }>;

export type SubmissionWithCategoriesAndUsername = Prisma.GameSubmissionGetPayload<{
  include: {
    categories: true,
    user: true,
  },
}>;

export type CommitteeVisibleSubmission = Prisma.GameSubmissionGetPayload<{
  include: {
    categories: true,
    user: true,
    incentives: {
      include: {
        attachedCategories: true,
      },
    },
  },
}>;

export type IncentiveWithCategories = Prisma.RunIncentiveGetPayload<{ include: { attachedCategories: true } }>;
export type IncentiveWithCategoryIds = RunIncentive & { attachedCategories: string[] };

export type EventWithStringDates<T extends Event = Event> = Omit<T, 'gameSubmissionPeriodStart' | 'gameSubmissionPeriodEnd' | 'incentiveSubmissionPeriodEnd' | 'eventStart'> & {
  gameSubmissionPeriodStart: string;
  gameSubmissionPeriodEnd: string;
  incentiveSubmissionPeriodEnd: string;
  eventStart: string;
}

export type SchedulableCategory = Prisma.GameSubmissionCategoryGetPayload<{
  include: {
    gameSubmission: {
      include: {
        user: {
          include: {
            eventAvailabilities: true,
          },
        },
      },
    },
  },
}>;

export function prepareAllRecordsForTransfer(records: (Record<string, unknown> | null)[]): (Record<string, unknown> | null)[] {
  return records.map(prepareRecordForTransfer);
}

function normalizeValueForTransfer(value: unknown): unknown {
  if (value === null) return null;
  if (value === undefined) return undefined;

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) return value.map(normalizeValueForTransfer);

  if (typeof value === 'object') return prepareRecordForTransfer(value as Record<string, unknown>);

  return value;
}

export function prepareRecordForTransfer(record: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!record) return null;

  return Object.entries(record).reduce((acc, [key, value]) => ({ ...acc, [key]: normalizeValueForTransfer(value) }), {});
}

export function prepareSubmissionForTransfer(submission: SubmissionWithCategories | null): Record<string, unknown> | null {
  if (!submission) return null;

  return {
    ...prepareRecordForTransfer(submission),
    categories: submission.categories.map(prepareRecordForTransfer),
  };
}

export function prepareUserForTransfer(user: UserWithVettingInfo | null | undefined): Record<string, unknown> | null {
  if (!user) return null;

  return {
    ...prepareRecordForTransfer(user),
    vettingInfo: user.vettingInfo ? prepareRecordForTransfer(user.vettingInfo) : null,
  };
}

export async function fetchServerSession(req: IncomingMessage | undefined, res: ServerResponse<IncomingMessage> | undefined) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unstable_getServerSession(req as any, res as any, authOptions);
}
