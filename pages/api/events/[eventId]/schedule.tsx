import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { ScheduledRun } from '@prisma/client';
import { prisma } from '../../../../utils/db';
import { authOptions } from '../../auth/[...nextauth]';
import { isMemberOfCommittee } from '../../../../utils/eventHelpers';
import { handleAPIRoute } from '../../../../utils/apiUtils';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    POST: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });

      if (!req.query.eventId) return res.status(400).json({ message: 'Event ID is required' });
       
      // Get existing record and ensure that it belongs to this user.
      const event = await prisma.event.findFirst({
        where: { id: req.query.eventId as string },
        include: {
          committeeMembers: true,
        },
      });

      if (!event) {
        return res.status(400).json({ message: 'This event no longer exists; please refresh the page and try again.' });
      }

      if (!session.user.isAdmin && !isMemberOfCommittee(event, session.user)) return res.status(404);

      // Insert the new schedule
      const recordsForInsertion = (req.body.schedule as ScheduledRun[]).map(record => ({
        eventId: event.id, // should probably validate all categories belong to the event tbh
        categoryId: record.categoryId,
        nextRunId: null,
        setupTime: record.setupTime,
        isInterstitial: record.isInterstitial,
        interstitialName: record.interstitialName,
      }));

      await prisma.$transaction(async tx => {
        // Delete the existing schedule
        await tx.scheduledRun.deleteMany({
          where: {
            eventId: event.id,
          },
        });

        const records = await Promise.all(recordsForInsertion.map(async data => tx.scheduledRun.create({ data })));

        // Build the linked list references
        await Promise.all(records.map(async (data, index, list) => tx.scheduledRun.update({
          where: {
            id: data.id,
          },
          data: {
            nextRunId: list[index + 1]?.id ?? null,
          },
        })));
        
        return tx.event.update({
          where: {
            id: event.id,
          },
          data: {
            firstRunId: records.length > 0 ? records[0].id : null,
          },
        });
      });

      return res.status(200).json({ success: true });
    },
  });
}
