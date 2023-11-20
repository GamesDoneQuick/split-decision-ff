import { Request, Response } from 'express';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { EmbedBuilder, ForumChannel } from 'discord.js';
import { authOptions } from '../../../../auth/[...nextauth]';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../../../../utils/dbHelpers';
import { handleAPIRoute } from '../../../../../../utils/apiUtils';
import { prisma } from '../../../../../../utils/db';
import { isMemberOfCommittee } from '../../../../../../utils/eventHelpers';
import { DiscordClient } from '../../../../../../utils/discord';
import { getUserName } from '../../../../../../utils/userHelpers';

export default async function handle(req: Request, res: Response) {
  await handleAPIRoute(req, res, {
    POST: async () => {
      const session = await unstable_getServerSession(req, res, authOptions);

      if (!session) return res.status(401).json({ message: 'You must be logged in.' });

      const event = await fetchEventWithCommitteeMemberIdsAndNames(req.query.eventId as string);

      if (!event) return res.status(400).json({ message: 'Event does not exist.' });

      if (!session.user.isAdmin && !isMemberOfCommittee(event, session.user)) {
        return res.status(401).json({ message: 'Access denied.' });
      }

      const category = await prisma.gameSubmissionCategory.findFirst({
        where: {
          id: req.query.categoryId as string,
        },
        include: {
          gameSubmission: {
            include: {
              user: true,
              incentives: {
                include: {
                  attachedCategories: true,
                },
              },
            },
          },
        },
      });

      if (!category) return res.status(400).json({ message: 'Submission category does not exist.' });

      if (!event.committeeDiscordChannelId) {
        return res.status(400).json({ message: 'Committee vote feature is not configured.' });
      }

      // something jank with the typings idk
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const guild = await (DiscordClient.guilds.fetch as any)(process.env.DISCORD_SERVER_ID);

      if (!guild) {
        return res.status(400).json({ message: 'There is no matching guild - this is a backend configuration error.' });
      }

      const channel = await guild.channels.fetch(event.committeeDiscordChannelId) as ForumChannel;

      if (!channel) {
        return res.status(400).json({ message: 'There is no matching channel - this is an event configuration error.' });
      }

      const matchingThread = (await channel.threads.fetch()).threads.find(thread => thread.name.toLowerCase().indexOf(category.gameSubmission.primaryGenre.toLowerCase()) !== -1);

      if (!matchingThread) {
        return res.status(400).json({ message: `There is no thread that matches the genre ${category.gameSubmission.primaryGenre} - this is a Discord configuration error.` });
      }

      const incentiveCount = category.gameSubmission.incentives
        .filter(incentive => incentive.attachedCategories.some(attached => attached.categoryId === category.id));

      const embed = new EmbedBuilder()
        .setColor('#4C3973')
        .setAuthor({ name: 'Committee Vote' })
        .setTitle(category.gameSubmission.gameTitle)
        .setURL(category.videoURL)
        .setFields(
          { name: 'Runner(s)', value: getUserName(category.gameSubmission.user) ?? '<missing username>', inline: true },
          { name: 'Category', value: category.categoryName, inline: true },
          { name: 'Duration', value: category.estimate, inline: true },
          // { name: 'Solo Commentary', value: category.gameSubmission.soloCommentary ? 'Yes' : 'No', inline: true },
          { name: 'Co-op/Race', value: category.isCoop ? 'Yes' : 'No', inline: true },
          { name: 'Incentives', value: incentiveCount.toString(), inline: true },
        );
    
      const message = await matchingThread.send({ embeds: [embed] });

      await message.pin();
    
      await message.react('✅');
      await message.react('❌');
      await message.react('🤷‍♀️');

      await prisma.gameSubmissionCategory.update({
        where: {
          id: req.query.categoryId as string,
        },
        data: {
          isCommitteeVoteOpened: true,
        },
      });

      return res.status(200).json(true);
    },
  });
}
