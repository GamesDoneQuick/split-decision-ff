import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { handleAPIRoute } from '../../../../utils/apiUtils';
import { prisma } from '../../../../utils/db';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../../utils/dbHelpers';
import { userMatchesOrIsCommittee } from '../../../../utils/eventHelpers';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    POST: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });

      if (!req.query.eventId) return res.status(400).json({ message: 'Event ID is required' });
       
      const event = await fetchEventWithCommitteeMemberIdsAndNames(req.query.eventId as string);

      if (!event) {
        return res.status(400).json({ message: 'This event no longer exists; please refresh the page and try again.' });
      }

      const user = await prisma.user.findFirst({
        where: { id: req.body.userId as string },
      });

      if (!user) {
        return res.status(400).json({ message: 'This user no longer exists; please refresh the page and try again.' });
      }
      
      if (!userMatchesOrIsCommittee(session, user.id, event)) {
        return res.status(401).json({ message: 'Access denied.' });
      }

      await prisma.eventAvailability.upsert({
        where: {
          userId_eventId: {
            userId: user.id,
            eventId: event.id,
          },
        },
        update: {
          slots: req.body.slots,
        },
        create: {
          userId: user.id,
          eventId: event.id,
          slots: req.body.slots,
        },
      });

      return res.status(200).json({ message: 'Availability updated.' });
    },
  });
}
