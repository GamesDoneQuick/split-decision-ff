import { Prisma, User } from '@prisma/client';
import { IncomingMessage, ServerResponse } from 'http';
import { prisma } from './db';
import { EventWithCommitteeMemberIdsAndNames, fetchServerSession } from './models';
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
