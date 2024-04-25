import { Request, Response } from 'express';
import { Parser } from 'json2csv';
import { compareAsc } from 'date-fns';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { prisma } from '../../../../../utils/db';
import { isMemberOfCommittee } from '../../../../../utils/eventHelpers';
import { handleAPIRoute } from '../../../../../utils/apiUtils';
import { normalizeEstimate } from '../../../../../utils/durationHelpers';
import { authOptions } from '../../../auth/[...nextauth]';

type IncentiveExport = {
  userName: string,
  pronouns: string,
  email: string,
  name: string,
  estimate: string,
  deadline: string,
  description: string,
  updatedAt: string,
}

const EXPORTED_SUBMISSION_FIELDS: [keyof IncentiveExport, string][] = [
  ['userName', 'Runner'],
  ['pronouns', 'Pronouns'],
  ['email', 'Email'],
  ['name', 'Incentive Name'],
  ['estimate', 'Estimate'],
  ['deadline', 'Deadline'],
  ['description', 'Description'],
];

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
          user: true,
        },
      });

      const allFields = EXPORTED_SUBMISSION_FIELDS.map(([value, label]) => ({ value, label }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedSubmissions = submissions.flatMap(submission => {
        let username = submission.user.name;

        if (submission.user.displayName) {
          username = `${submission.user.displayName} (${submission.user.name})`;
        } else if (!username) {
          username = '<username missing>';
        }

        return submission.incentives.map(incentive => ({
          userName: username,
          pronouns: submission.user.pronouns,
          email: submission.user.email,
          name: incentive.name,
          estimate: normalizeEstimate(incentive.estimate),
          deadline: incentive.closeTime,
          description: incentive.description,
          updatedAt: incentive.updatedAt,
        }));
      });

      formattedSubmissions.sort((a, b) => (
        compareAsc(a.updatedAt ?? new Date(0), b.updatedAt ?? new Date(0))
      ));

      const parser = new Parser({
        fields: allFields,
      });

      const csv = parser.parse(formattedSubmissions);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${event.eventName}-incentives.csv`);

      return res.send(csv);
    },
  });
}
