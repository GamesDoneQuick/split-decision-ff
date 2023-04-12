import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { prisma } from '../../../../../../utils/db';
import { authOptions } from '../../../../auth/[...nextauth]';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../../../../utils/dbHelpers';
import { handleAPIRoute } from '../../../../../../utils/apiUtils';
import { isMemberOfCommittee } from '../../../../../../utils/eventHelpers';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    POST: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });

      const event = await fetchEventWithCommitteeMemberIdsAndNames(req.query.eventId as string);

      if (!event) return res.status(400).json({ message: 'Event does not exist.' });

      if (!session.user.isAdmin && !isMemberOfCommittee(event, session.user)) {
        return res.status(401).json({ message: 'Access denied.' });
      }

      await prisma.gameSubmissionCategory.update({
        where: {
          id: req.query.categoryId as string,
        },
        data: {
          runStatus: req.body.status,
        },
      });

      return res.status(200).json(true);
    },
  });
}
