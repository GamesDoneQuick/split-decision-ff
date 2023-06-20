import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { prisma } from '../../../../../../utils/db';
import { areSubmissionsOpen, isMemberOfCommittee, userMatchesOrIsCommittee } from '../../../../../../utils/eventHelpers';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../../../../utils/dbHelpers';
import { authOptions } from '../../../../auth/[...nextauth]';
import { handleAPIRoute } from '../../../../../../utils/apiUtils';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    DELETE: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });

      if (!req.query.eventId) return res.status(400).json({ message: 'Event ID is required' });

      const event = await fetchEventWithCommitteeMemberIdsAndNames(req.query.eventId as string);

      if (!event) return res.status(400).json({ message: 'Event does not exist.' });

      if (!areSubmissionsOpen(event) && !isMemberOfCommittee(event, session.user)) {
        return res.status(401).json({ message: 'The submission window has closed for this event.' });
      }

      if (!req.query.submissionId) return res.status(400).json({ message: 'Submisson ID is required' });

      // Get existing record and ensure that it belongs to this user.
      const existingRecord = await prisma.gameSubmission.findFirst({
        where: { id: req.query.submissionId as string },
      });

      if (!existingRecord) {
        return res.status(400).json({ message: 'This submission no longer exists; please refresh the page and try again.' });
      }

      if (!userMatchesOrIsCommittee(session, existingRecord.userId, event)) {
        return res.status(401).json({ message: 'You do not have access to this submission.' });
      }

      await prisma.gameSubmission.delete({
        where: { id: existingRecord.id as string },
      });

      return res.status(200).json({ message: 'Submission deleted.' });
    },
  });
}
