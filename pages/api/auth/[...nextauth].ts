import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { User } from '@prisma/client';
import NextAuth, { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { prisma } from '../../../utils/db';
import { DiscordClient } from '../../../utils/discord';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: (process.env.DISCORD_CLIENT_ID as string),
      clientSecret: (process.env.DISCORD_CLIENT_SECRET as string),
    }),
  ],
  callbacks: {
    async signIn({ profile, user }) {
      if (!process.env.DISCORD_SERVER_ID) return true;
      
      try {
        const guild = await DiscordClient.guilds.fetch(process.env.DISCORD_SERVER_ID);

        if (guild && await guild.members.fetch(profile.id as string)) {
          // Check to see if the user's name has updated, and if it has, update it.
          if (profile.username !== null && user.name !== profile.username) {
            await prisma.user.update({
              where: {
                id: user.id,
              },
              data: {
                name: profile.username,
              },
            });
          }

          return true;
        }
      } catch (e) {
        console.error('Error checking Discord server membership; is the server ID valid?');
        console.error(e);
      }

      return '/nonmember';
    },
    async session({ session, user }) {
      return {
        ...session,
        user: (user as unknown) as User,
      };
    },
  },
  session: {
    strategy: 'database',
  },
};

export default NextAuth(authOptions);
