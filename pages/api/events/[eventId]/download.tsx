import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { Parser } from 'json2csv';
import { compareAsc } from 'date-fns';
import { prisma } from '../../../../utils/db';
import { authOptions } from '../../auth/[...nextauth]';
import { isMemberOfCommittee } from '../../../../utils/eventHelpers';
import { handleAPIRoute } from '../../../../utils/apiUtils';
import { availabilitySlotsToSegments } from '../../../../utils/durationHelpers';

interface ExportedSubmissionRow {
  userName: string;
  pronouns: string;
  email: string;
  showPronouns: string;
  availability: string;
  gameTitle: string;
  platform: string;
  description: string;
  primaryGenre: string;
  secondaryGenre: string;
  technicalNotes: string;
  contentWarning: string;
  flashingLights: string;
  soloCommentary: string;
  categoryName: string;
  url: string;
  estimate: string;
  categoryDescription: string;
}

const EXPORTED_SUBMISSION_FIELDS: [keyof ExportedSubmissionRow, string][] = [
  ['userName', 'Runner'],
  ['pronouns', 'Pronouns'],
  ['email', 'Email'],
  ['showPronouns', 'Show pronouns?'],
  ['availability', 'Availability'],
  ['gameTitle', 'Game Title'],
  ['platform', 'Platform'],
  ['description', 'Description'],
  ['primaryGenre', 'Primary Genre'],
  ['secondaryGenre', 'Secondary Genre'],
  ['technicalNotes', 'Technical Notes'],
  ['contentWarning', 'Content Warning'],
  ['flashingLights', 'Flashing Lights'],
  ['soloCommentary', 'Solo Commentary'],
  ['categoryName', 'Category'],
  ['url', 'URL'],
  ['estimate', 'Estimate'],
  ['categoryDescription', 'Category Description'],
];

const NO_HOURS_TIMESTAMP_REGEX = /^(?:([0-5]\d):)?([0-5]\d)$/;
const SINGLE_DIGIT_HOUR_TIMESTAMP_REGEX = /^(?:(?:([0-9]):)([0-5]\d):)?([0-5]\d)$/;

function normalizeEstimate(estimate: string): string {
  if (estimate.match(SINGLE_DIGIT_HOUR_TIMESTAMP_REGEX)) return `0${estimate}`;
  if (estimate.match(NO_HOURS_TIMESTAMP_REGEX)) return `00:${estimate}`;

  return estimate;
}

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
          user: true,
        },
      });

      const availabilities = await prisma.eventAvailability.findMany({
        where: {
          eventId: event.id,
        },
      });

      const allFields = EXPORTED_SUBMISSION_FIELDS.map(([value, label]) => ({ value, label }));

      const formattedSubmissions = submissions.flatMap(submission => {
        const availability = availabilities.find(item => item.userId === submission.userId);

        let availabilityString = '';

        if (availability) {
          const availabilitySegments = availabilitySlotsToSegments(availability);

          availabilityString = availabilitySegments.map(segment => `${segment.date} ${segment.start}:00-${segment.end === 23 ? '23:59' : `${segment.end}:00`}`).join(', ');
        }
        
        let username = submission.user.name;

        if (submission.user.displayName) {
          username = `${submission.user.displayName} (${submission.user.name})`;
        } else if (!username) {
          username = '<username missing>';
        }

        const baseData = {
          userName: username,
          pronouns: submission.user.pronouns,
          email: submission.user.email,
          showPronouns: submission.user.showPronouns,
          availability: availabilityString,
          gameTitle: submission.gameTitle,
          platform: submission.platform,
          description: submission.description,
          primaryGenre: submission.primaryGenre,
          secondaryGenre: submission.secondaryGenre,
          technicalNotes: submission.technicalNotes,
          contentWarning: submission.contentWarning,
          flashingLights: submission.flashingLights,
          soloCommentary: submission.soloCommentary.toString(),
          updatedAt: submission.updatedAt,
        };
        
        return submission.categories.map(category => ({
          ...baseData,
          categoryName: category.categoryName,
          url: category.videoURL,
          estimate: normalizeEstimate(category.estimate),
          categoryDescription: category.description,
        }));
      });

      formattedSubmissions.sort((a, b) => {
        if (isCommitteeMember) {
          // Sort by updated for committee
          return compareAsc(a.updatedAt ?? new Date(0), b.updatedAt ?? new Date(0));
        }
  
        return a.gameTitle.localeCompare(b.gameTitle);
      });

      const parser = new Parser({
        fields: allFields,
      });

      const csv = parser.parse(formattedSubmissions);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${event.eventName}.csv`);

      return res.send(csv);
    },
  });
}
