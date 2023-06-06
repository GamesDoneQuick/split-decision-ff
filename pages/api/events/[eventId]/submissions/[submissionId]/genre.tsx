import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../../../../utils/dbHelpers';
import { handleAPIRoute } from '../../../../../../utils/apiUtils';
import { prisma } from '../../../../../../utils/db';
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

      const submission = await prisma.gameSubmission.findFirst({
        where: {
          id: req.query.submissionId as string,
        },
      });

      if (!submission) return res.status(400).json({ message: 'Submission does not exist.' });

      if (req.body.field !== 'primaryGenre' && req.body.field !== 'secondaryGenre') {
        return res.status(400).json({ message: `${req.body.field} is not a valid genre field for submission records.` });
      }

      const isValidGenre = event.genres.indexOf(req.body.value) !== -1 || (req.body.field === 'secondaryGenre' && req.body.value === '');

      if (!isValidGenre) {
        return res.status(400).json({ message: `Invalid value for "${req.body.field}": ${req.body.value}. Valid options are: ${event.genres.map(item => `"${item}"`).join(', ')}` });
      }

      await prisma.gameSubmission.update({
        where: {
          id: req.query.submissionId as string,
        },
        data: {
          [req.body.field]: req.body.value,
        },
      });

      return res.status(200).json(true);
    },
  });
}
