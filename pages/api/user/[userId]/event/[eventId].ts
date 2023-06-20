import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { fetchEventSubmissionDataForUser, fetchEventWithCommitteeMemberIdsAndNames } from '../../../../../utils/dbHelpers';
import { isCommitteeOrAdmin } from '../../../../../utils/eventHelpers';
import { handleAPIRoute } from '../../../../../utils/apiUtils';
import { prisma } from '../../../../../utils/db';
import { authOptions } from '../../../auth/[...nextauth]';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    GET: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });

      const event = await fetchEventWithCommitteeMemberIdsAndNames(req.query.eventId as string);

      if (!event) {
        return res.status(400).json({ message: 'This event does not exist.' });
      }

      if (!isCommitteeOrAdmin(event, session.user)) {
        return res.status(401).json({ message: 'Access denied.' });
      }

      const user = await prisma.user.findFirst({
        where: { id: req.query.userId as string },
        include: {
          vettingInfo: true,
        },
      });

      if (!user) {
        return res.status(400).json({ message: 'This user does not exist.' });
      }
            
      const submissionData = await fetchEventSubmissionDataForUser(event, user);

      return res.status(200).json(submissionData);
    },
  });
}
