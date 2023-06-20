import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { handleAPIRoute } from '../../../../../utils/apiUtils';
import { prisma } from '../../../../../utils/db';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../../../utils/dbHelpers';
import { areIncentivesOpen, isMemberOfCommittee, userMatchesOrIsCommittee } from '../../../../../utils/eventHelpers';
import { authOptions } from '../../../auth/[...nextauth]';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    DELETE: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });

      const event = await fetchEventWithCommitteeMemberIdsAndNames(req.query.eventId as string);

      if (!event) return res.status(400).json({ message: 'Event does not exist.' });
   
      if (!areIncentivesOpen(event) && !isMemberOfCommittee(event, session.user)) {
        return res.status(401).json({ message: 'The incentive submission window has closed for this event.' });
      }

      if (!req.query.incentiveId) return res.status(400).json({ message: 'Incentive ID is required.' });
      
      const existingRecord = await prisma.runIncentive.findFirst({
        where: { id: req.query.incentiveId as string },
        include: {
          gameSubmission: true,
        },
      });

      if (!existingRecord) {
        return res.status(400).json({ message: 'This incentive no longer exists; please refresh the page and try again.' });
      }

      if (!userMatchesOrIsCommittee(session, existingRecord.gameSubmission.userId, event)) {
        return res.status(401).json({ message: 'You do not have access to this incentive.' });
      }

      await prisma.runIncentive.delete({
        where: { id: existingRecord.id as string },
      });

      return res.status(200).json({ message: 'Incentive deleted.' });
    },
  });
}
