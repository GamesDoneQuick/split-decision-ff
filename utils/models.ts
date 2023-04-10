import { User, Event, GameSubmission, GameSubmissionCategory, VettingInfo, RunIncentive, IncentivesOnCategories } from '@prisma/client';
import { IncomingMessage, ServerResponse } from 'http';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { authOptions } from '../pages/api/auth/[...nextauth]';

export type UserWithVettingInfo = User & { vettingInfo?: VettingInfo | null };

export type SubmissionWithCategories = GameSubmission & { categories: GameSubmissionCategory[] };

export type SubmissionWithCategoriesAndUsername = SubmissionWithCategories & {
  user: string | null,
};

export type IncentiveWithCategories = RunIncentive & { attachedCategories: IncentivesOnCategories[] };
export type IncentiveWithCategoryIds = RunIncentive & { attachedCategories: string[] };

export type EventWithStringDates = Omit<Event, 'gameSubmissionPeriodStart' | 'gameSubmissionPeriodEnd' | 'incentiveSubmissionPeriodEnd' | 'eventStart'> & {
  gameSubmissionPeriodStart: string;
  gameSubmissionPeriodEnd: string;
  incentiveSubmissionPeriodEnd: string;
  eventStart: string;
}

export function prepareRecordForTransfer(record: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!record) return null;

  return Object.entries(record).reduce((acc, [key, value]) => {
    if (value instanceof Date) {
      return {
        ...acc,
        [key]: value.toISOString(),
      };
    }

    return { ...acc, [key]: value };
  }, {});
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

export async function fetchUserWithVettingInfo(req: IncomingMessage | undefined, res: ServerResponse<IncomingMessage> | undefined) {
  const session = await fetchServerSession(req, res);

  if (!session) return null;

  return prisma?.user.findFirst({
    where: {
      id: session.user.id,
    },
    include: {
      vettingInfo: true,
    },
  });
}

export async function fetchServerSession(req: IncomingMessage | undefined, res: ServerResponse<IncomingMessage> | undefined) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unstable_getServerSession(req as any, res as any, authOptions);
}
