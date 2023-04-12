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

      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          email: req.body.email,
          displayName: req.body.displayName,
          pronouns: req.body.pronouns,
          showPronouns: req.body.showPronouns,
          showSubmissions: req.body.showSubmissions,
        },
      });

      return res.status(200).json({ message: 'Account updated.' });
    },
  });
}
