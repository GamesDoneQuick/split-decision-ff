import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { handleAPIRoute } from '../../../utils/apiUtils';
import { prisma } from '../../../utils/db';
import { authOptions } from '../auth/[...nextauth]';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    GET: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });
      if (!session.user.isAdmin) return res.status(401).json({ message: 'You are not an administrator.' });

      const queryResult = await prisma.user.findMany({
        where: {
          name: {
            contains: req.query.query?.toString(),
            mode: 'insensitive',
          },
        },
      });

      return res.status(200).json(queryResult);
    },
  });
}
