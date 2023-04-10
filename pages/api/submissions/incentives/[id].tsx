import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { prisma } from '../../../../utils/db';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handle(req: Request, res: Response) {
  if (req.method === 'DELETE') {
    try {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) {
        res.status(401).json({ message: 'You must be logged in.' });
  
        return;
      }

      if (req.query.id) {
        const existingRecord = await prisma.runIncentive.findFirst({
          where: { id: req.query.id as string },
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

        await prisma.runIncentive.delete({
          where: { id: req.query.id as string },
        });

        res.status(200).json({ message: 'Incentive deleted.' });
      }
    } catch (e) {
      console.error(`Error deleting incentive (DELETE api/submissions/incentives/${req.query.incentiveId}):`);
      console.error(e);

      res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
    }
  } else {
    res.status(400).json({ message: 'Unsupported method.' });
  }
}
