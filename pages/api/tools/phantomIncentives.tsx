import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { prisma } from '../../../utils/db';
import { authOptions } from '../auth/[...nextauth]';
import { isMemberOfCommittee } from '../../../utils/eventHelpers';
import { handleAPIRoute } from '../../../utils/apiUtils';
import { getUserName } from '../../../utils/userHelpers';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    GET: async () => {
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

      const isCommitteeMember = isMemberOfCommittee(event, session.user);

      if (!session.user.isAdmin && !isCommitteeMember) return res.status(404);

      const submissions = await prisma.gameSubmission.findMany({
        where: {
          eventId: event.id,
        },
        include: {
          categories: true,
          incentives: {
            include: {
              attachedCategories: true,
            },
          },
          user: {
            include: {
              vettingInfo: true,
            },
          },
        },
      });

      const incentivesWithErrors = submissions.reduce((acc, submission) => {
        const unmappedIncentives = submission.incentives.filter(incentive => {
          const unattached = incentive.attachedCategories.filter(attachedCat => (
            !submission.categories.some(subCat => subCat.id === attachedCat.categoryId)
          ));

          return incentive.attachedCategories.length === 0 || unattached.length !== 0;
        });

        if (unmappedIncentives.length > 0) {
          return [...acc, ...unmappedIncentives.map(incentive => ({
            ...incentive,
            username: getUserName(submission.user),
            gameTitle: submission.gameTitle,
          }))];
        }

        return acc;
      }, [] as Record<string, unknown>[]);

      return res.json(incentivesWithErrors);
    },
  });
}
