import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { prisma } from '../../../../utils/db';
import { areIncentivesOpen } from '../../../../utils/eventHelpers';
import { fetchUserWithVettingInfo } from '../../../../utils/models';
import { ValidationSchemas } from '../../../../utils/validation';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handle(req: Request, res: Response) {
  if (req.method === 'POST') {
    try {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) {
        res.status(401).json({ message: 'You must be logged in.' });
  
        return;
      }

      const user = await fetchUserWithVettingInfo(req, res);

      if (!user?.vettingInfo) {
        res.status(401).json({ message: 'You cannot submit to an event until you have filled out the vetting form.' });

        return;
      }
      
      const submission = await prisma.gameSubmission.findFirst({
        where: { id: req.body.gameSubmissionId as string },
        include: {
          event: true,
        },
      });

      if (!submission) {
        res.status(400).json({ message: 'This submission does not exist.' });

        return;
      }

      if (submission.userId !== session.user.id) {
        res.status(401).json({ message: 'You do not have access to this incentive.' });

        return;
      }

      if (!areIncentivesOpen(submission.event)) {
        res.status(400).json({ message: 'Incentive submissions are not open for this event.' });

        return;
      }
 
      if (req.body.id) {
        // Get existing record and ensure that it belongs to this user.
        const existingRecord = await prisma.runIncentive.findFirst({
          where: { id: req.body.id },
          include: {
            gameSubmission: true,
          },
        });

        if (!existingRecord) {
          res.status(400).json({ message: 'This incentive no longer exists; please refresh the page and try again.' });

          return;
        }

        if (existingRecord.gameSubmission.userId !== session.user.id) {
          res.status(401).json({ message: 'You do not have access to this incentive.' });

          return;
        }
      } else {
        // Make sure we're not over the submission limit.
        const existingIncentiveForRun = await prisma.runIncentive.count({
          where: {
            gameSubmissionId: submission.id,
          },
        });
        
        if (existingIncentiveForRun >= submission.event.maxIncentives) {
          res.status(400).json({ message: `You cannot submit more than ${submission.event.maxIncentives} ${submission.event.maxIncentives === 1 ? 'incentive' : 'incentives'} for this run.` });

          return;
        }
      }

      const editableData = {
        name: req.body.name,
        categoryName: req.body.categoryName,
        videoURL: req.body.videoURL,
        estimate: req.body.estimate,
        closeTime: req.body.closeTime,
        description: req.body.description,
      };

      const matchingCategories = await prisma.gameSubmissionCategory.findMany({
        where: {
          id: {
            in: req.body.attachedCategories,
          },
        },
      });

      if (matchingCategories.length !== req.body.attachedCategories.length) {
        res.status(400).json({ message: 'One or more categories could not be found.' });

        return;
      }

      if (matchingCategories.length === 0) {
        res.status(400).json({ message: 'You must attach this incentive to at least one category.' });

        return;
      }

      const categoryConnections = matchingCategories.map(item => ({
        category: {
          connect: { id: item.id },
        },
      }));

      const validation = ValidationSchemas.RunIncentive.validate(editableData);

      if (validation.error) {
        res.status(400).json({ message: validation.error.message });

        return;
      }

      const result = await prisma.runIncentive.upsert({
        where: {
          id: req.body.id ?? '',
        },
        update: {
          ...editableData,
          attachedCategories: {
            deleteMany: {
              incentiveId: req.body.id,
            },
            create: categoryConnections,
          },
        },
        create: {
          ...editableData,
          gameSubmissionId: submission.id,
          attachedCategories: {
            create: categoryConnections,
          },
        },
        include: {
          attachedCategories: true,
        },
      });

      res.status(200).json(result);
    } catch (e) {
      console.error('Error editing incentive (POST api/submissions/incentives):');
      console.error(e);

      res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
    }
  } else {
    res.status(400).json({ message: 'Unsupported method.' });
  }
}
