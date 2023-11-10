import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { prisma } from '../../../../../utils/db';
import { areSubmissionsOpen, isCommitteeOrAdmin, userMatchesOrIsCommittee } from '../../../../../utils/eventHelpers';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../../../utils/dbHelpers';
import { ValidationSchemas } from '../../../../../utils/validation';
import { handleAPIRoute } from '../../../../../utils/apiUtils';
import { pluralizeWithValue } from '../../../../../utils/humanize';
import { authOptions } from '../../../auth/[...nextauth]';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    POST: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });

      const user = await prisma.user.findFirst({
        where: { id: req.body.userId as string },
        include: {
          vettingInfo: true,
        },
      });

      if (!user) return res.status(401).json({ message: 'User does not exist.' });

      if (!user?.vettingInfo) {
        return res.status(401).json({ message: 'You cannot submit to an event until you have filled out the runner info form.' });
      }
      
      let existingCategoryIds: string[] = [];

      const event = await fetchEventWithCommitteeMemberIdsAndNames(req.query.eventId as string);

      if (!event) return res.status(400).json({ message: 'This event does not exist.' });

      if (!userMatchesOrIsCommittee(session, user.id, event)) {
        return res.status(401).json({ message: 'Permission denied.' });
      }

      if (!areSubmissionsOpen(event) && !isCommitteeOrAdmin(event, session.user)) {
        return res.status(400).json({ message: 'Submissions are not open for this event.' });
      }
 
      if (req.body.id) {
        // Get existing record and ensure that it belongs to this user.
        const existingRecord = await prisma.gameSubmission.findFirst({
          where: { id: req.body.id },
          include: {
            categories: true,
          },
        });

        if (!existingRecord) {
          return res.status(400).json({ message: 'This submission no longer exists; please refresh the page and try again.' });
        }

        if (!userMatchesOrIsCommittee(session, existingRecord.userId, event)) {
          return res.status(401).json({ message: 'You do not have access to this submission.' });
        }

        existingCategoryIds = existingRecord.categories.map(item => item.id);
      } else {
        // Make sure we're not over the submission limit.
        const existingSubmissionsForEvent = await prisma.gameSubmission.count({
          where: {
            eventId: event.id,
            userId: user.id,
          },
        });
        
        if (existingSubmissionsForEvent >= event.maxSubmissions) {
          return res.status(400).json({ message: `You cannot submit more than ${pluralizeWithValue(event.maxSubmissions, 'submission')} to this event.` });
        }
      }

      const editableData = {
        gameTitle: req.body.gameTitle,
        platform: req.body.platform,
        primaryGenre: req.body.primaryGenre,
        secondaryGenre: req.body.secondaryGenre,
        description: req.body.description,
        flashingLights: req.body.flashingLights,
        technicalNotes: req.body.technicalNotes,
        contentWarning: req.body.contentWarning,
        categories: req.body.categories.map((category: Record<string, unknown>) => ({
          categoryName: category.categoryName,
          videoURL: category.videoURL,
          estimate: category.estimate,
          description: category.description,
          isCoop: category.isCoop,
        })),
        soloCommentary: req.body.soloCommentary,
      };

      if (editableData.categories.length > event.maxCategories) {
        return res.status(400).json({ message: `You cannot submit more than ${event.maxCategories} ${event.maxCategories === 1 ? 'category' : 'categories'} to this event.` });
      }

      if (editableData.categories.length === 0) {
        return res.status(400).json({ message: 'You must submit at least one category.' });
      }

      const validation = ValidationSchemas.GameSubmission.validate(editableData);

      if (validation.error) return res.status(400).json({ message: validation.error.message });

      const result = await prisma.gameSubmission.upsert({
        where: {
          id: req.body.id ?? '',
        },
        update: {
          ...editableData,
          categories: {
            deleteMany: { id: { in: existingCategoryIds } },
            createMany: { data: editableData.categories },
          },
        },
        create: {
          ...editableData,
          eventId: event.id,
          userId: user.id,
          categories: {
            createMany: { data: editableData.categories },
          },
        },
        include: {
          categories: true,
        },
      });

      if (session.user.id !== user.id) {
        console.info(`Committee member ${session.user.name} (${session.user.id}) edited the submissions of ${user.name} (${user.id}).`);
      }

      return res.status(200).json(result);
    },
  });
}
