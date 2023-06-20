import { Event, EventAvailability, Prisma, User } from '@prisma/client';
import { IncomingMessage, ServerResponse } from 'http';
import { prisma } from './db';
import { EventWithCommitteeMemberIdsAndNames, fetchServerSession, IncentiveWithCategories, prepareRecordForTransfer, prepareSubmissionForTransfer, prepareUserForTransfer, SubmissionWithCategories, UserWithVettingInfo } from './models';
import { pruneUserDataForPublicAccess } from './userHelpers';

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

function pruneCommitteeData(event: Prisma.EventGetPayload<{include: { committeeMembers: true } }>): EventWithCommitteeMemberIdsAndNames {
  return {
    ...event,
    committeeMembers: event.committeeMembers.map(pruneUserDataForPublicAccess),
  };
}

export async function fetchEventsVisibleToUser(user: User | null): Promise<EventWithCommitteeMemberIdsAndNames[]> {
  let whereQuery = { visible: true } as Record<string, unknown>;
  
  if (user) {
    if (user.isAdmin) {
      whereQuery = {};
    } else {
      whereQuery = {
        OR: [
          {
            visible: true,
          },
          {
            committeeMembers: {
              some: {
                id: user.id,
              },
            },
          },
        ],
      };
    }
  }

  const events = await prisma.event.findMany({
    where: whereQuery,
    include: {
      committeeMembers: true,
    },
  });

  return events.map(pruneCommitteeData);
}

export async function fetchEventWithCommitteeMemberIdsAndNames(id: string): Promise<EventWithCommitteeMemberIdsAndNames | null> {
  const event = await prisma.event.findFirst({
    where: { id },
    include: {
      committeeMembers: true,
    },
  });

  if (!event) return null;

  return pruneCommitteeData(event);
}

type NormalizedAvailability = Omit<EventAvailability, 'slots'> & {
  slots: string[];
};

export interface EventSubmissionData {
  user: UserWithVettingInfo,
  event: Event;
  submissions: SubmissionWithCategories[];
  incentives: IncentiveWithCategories[];
  availability: NormalizedAvailability;
}

export async function fetchEventSubmissionDataForUser(event: Event, user: UserWithVettingInfo): Promise<EventSubmissionData | null> {
  const submissions = await prisma.gameSubmission.findMany({
    where: {
      userId: user.id,
      eventId: event.id,
    },
    include: {
      categories: true,
    },
  });
  
  // find or create event availability
  const availability = await prisma.eventAvailability.upsert({
    where: {
      userId_eventId: {
        userId: user.id,
        eventId: event.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      eventId: event.id,
      slots: [],
    },
  });

  const incentives = await prisma.runIncentive.findMany({
    where: {
      gameSubmissionId: {
        in: submissions.map(({ id }) => id),
      },
    },
    include: {
      attachedCategories: true,
    },
  });

  return {
    user: prepareUserForTransfer(user) as UserWithVettingInfo,
    event: prepareRecordForTransfer(event) as Event,
    submissions: submissions.map(prepareSubmissionForTransfer) as SubmissionWithCategories[],
    incentives: incentives.map(prepareRecordForTransfer) as IncentiveWithCategories[],
    availability: {
      ...prepareRecordForTransfer(availability),
      slots: availability.slots.map(slot => slot.toISOString()),
    } as NormalizedAvailability,
  };
}
