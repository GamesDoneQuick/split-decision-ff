import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { handleAPIRoute } from '../../../utils/apiUtils';
import { prisma } from '../../../utils/db';
import { authOptions } from '../auth/[...nextauth]';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    POST: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });

      const editableData = {
        twitterAccounts: req.body.twitterAccounts,
        twitchAccounts: req.body.twitchAccounts,
        instagramAccounts: req.body.instagramAccounts,
        tiktokAccounts: req.body.tiktokAccounts,
      };

      await prisma.vettingInfo.upsert({
        where: {
          userId: session.user.id,
        },
        update: editableData,
        create: {
          ...editableData,
          userId: session.user.id,
        },
      });

      return res.status(200).json({ message: 'Runner info updated.' });
    },
  });
}
