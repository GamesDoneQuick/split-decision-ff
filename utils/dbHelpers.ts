import { IncomingMessage, ServerResponse } from 'http';
import { prisma } from './db';
import { EventWithCommitteeMemberIdsAndNames, fetchServerSession } from './models';

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

export async function fetchEventWithCommitteeMemberIdsAndNames(id: string): Promise<EventWithCommitteeMemberIdsAndNames | null> {
  const event = await prisma.event.findFirst({
    where: { id },
    include: {
      committeeMembers: true,
    },
  });

  if (!event) return null;

  return {
    ...event,
    committeeMembers: event.committeeMembers.map(member => ({
      id: member.id,
      name: member.id,
    })),
  };
}
