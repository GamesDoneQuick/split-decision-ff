import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { handleAPIRoute } from '../../../utils/apiUtils';
import { prisma } from '../../../utils/db';
import { fetchEventsVisibleToUser } from '../../../utils/dbHelpers';
import { PublicUserData } from '../../../utils/models';
import { ValidationSchemas } from '../../../utils/validation';
import { authOptions } from '../auth/[...nextauth]';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    GET: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      // const isAdmin = session?.user.isAdmin ?? false;
      // const filter = {
      //   where: {
      //     visible: isAdmin && req.query.includeHidden ? { not: undefined } : true,
      //   },
      // };
      
      const events = await fetchEventsVisibleToUser(session?.user ?? null);

      // const events = await prisma.event.findMany({
      //   ...filter,
      //   include: {
      //     committeeMembers: true,
      //   },
      // });

      return res.status(200).json(events);
    },
    POST: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });

      if (!session.user.isAdmin) return res.status(401).json({ message: 'You are not an administrator.' });
  
      if (req.body.id) {
        // Get existing record and ensure that it belongs to this user.
        const existingEvent = await prisma.event.findFirst({
          where: { id: req.body.id },
        });

        if (!existingEvent) {
          return res.status(400).json({ message: 'This event no longer exists; please refresh the page and try again.' });
        }
      }

      const editableData = {
        eventName: req.body.eventName,
        gameSubmissionPeriodStart: req.body.gameSubmissionPeriodStart,
        gameSubmissionPeriodEnd: req.body.gameSubmissionPeriodEnd,
        incentiveSubmissionPeriodEnd: req.body.incentiveSubmissionPeriodEnd,
        eventStart: req.body.eventStart,
        eventDays: Number(req.body.eventDays),
        maxSubmissions: Number(req.body.maxSubmissions),
        maxCategories: Number(req.body.maxCategories),
        maxIncentives: Number(req.body.maxIncentives),
        startTime: Number(req.body.startTime),
        endTime: Number(req.body.endTime),
        visible: req.body.visible,
        runStatusVisible: req.body.runStatusVisible,
        genres: req.body.genres,
        committeeDiscordChannelId: req.body.committeeDiscordChannelId,
        committeeMembers: {
          connect: (req.body.committeeMembers as PublicUserData[]).map(member => ({ id: member.id })),
        },
      };

      const validation = ValidationSchemas.Event.validate(editableData);

      if (validation.error) return res.status(400).json({ message: validation.error.message });

      const result = await prisma.$transaction(async tx => {
        if (req.body.id) {
          // Clear existing committee members
          await tx.event.update({
            where: {
              id: req.body.id ?? '',
            },
            data: {
              committeeMembers: {
                set: [],
              },
            },
          });
        }
        
        return tx.event.upsert({
          where: {
            id: req.body.id ?? '',
          },
          update: editableData,
          create: editableData,
          include: {
            committeeMembers: true,
          },
        });
      });

      return res.status(200).json(result);
    },
  });
}
