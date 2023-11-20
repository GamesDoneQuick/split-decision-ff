import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { GameSubmissionCategory } from '@prisma/client';
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
        soloCommentary: req.body.soloCommentary,
      };

      const categoryData = req.body.categories.map((category: Record<string, unknown>) => ({
        id: category.id,
        categoryName: category.categoryName,
        videoURL: category.videoURL,
        estimate: category.estimate,
        description: category.description,
        isCoop: category.isCoop,
      }));

      if (categoryData.length > event.maxCategories) {
        return res.status(400).json({ message: `You cannot submit more than ${event.maxCategories} ${event.maxCategories === 1 ? 'category' : 'categories'} to this event.` });
      }

      if (categoryData.length === 0) {
        return res.status(400).json({ message: 'You must submit at least one category.' });
      }

      // eslint-disable-next-line no-restricted-syntax
      if (req.body.categories.some((category: GameSubmissionCategory) => category.id && existingCategoryIds.indexOf(category.id) === -1)) {
        return res.status(401).json({ message: 'You do not have access to this category.' });
      }

      const validation = ValidationSchemas.GameSubmission.validate(editableData);

      if (validation.error) return res.status(400).json({ message: validation.error.message });

      const deletedCategoryIds = existingCategoryIds.filter(id => !categoryData.some((category: GameSubmissionCategory) => category.id === id));

      const result = await prisma.$transaction(async tx => {
        const submission = await tx.gameSubmission.upsert({
          where: {
            id: req.body.id ?? '',
          },
          update: editableData,
          create: {
            ...editableData,
            eventId: event.id,
            userId: user.id,
          },
        });
        
        await tx.gameSubmissionCategory.deleteMany({
          where: {
            id: {
              in: deletedCategoryIds,
            },
          },
        });

        const categories = await Promise.all((categoryData as GameSubmissionCategory[]).map(category => (
          tx.gameSubmissionCategory.upsert({
            where: {
              id: category.id ?? '',
            },
            update: category,
            create: {
              ...category,
              gameSubmissionId: submission.id,
            },
          })
        )));

        return {
          ...submission,
          categories,
        };
      });

      if (session.user.id !== user.id) {
        console.info(`Committee member ${session.user.name} (${session.user.id}) edited the submissions of ${user.name} (${user.id}).`);
      }

      return res.status(200).json(result);
    },
  });
}
