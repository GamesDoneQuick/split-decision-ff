import React, { useCallback } from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import { Anchor, Button, TextButton } from '../../components/layout';
import { ProfileEditor } from '../../components/ProfileEditor';
import { EventList } from '../../components/EventList';
import { prisma } from '../../utils/db';
import { authOptions } from '../api/auth/[...nextauth]';
import { SiteConfig } from '../../utils/siteConfig';
import { VettingInfoAlert } from '../../components/VettingInfoAlert';
import { prepareUserForTransfer, UserWithVettingInfo } from '../../utils/models';

interface SubmissionsHomeProps {
  user: UserWithVettingInfo;

}
const SubmissionsHome: NextPage<SubmissionsHomeProps> = ({ user }) => {
  const router = useRouter();

  const session = useSession({
    required: true,
  });

  const handleSignout = useCallback(() => {
    signOut({ callbackUrl: '/' });
  }, []);
  
  const navigateToEvent = useCallback((id: string) => {
    router.push(`/submissions/${id}`);
  }, [router]);

  if (session.status !== 'authenticated') return null;
    
  return (
    <Container>
      <WelcomeMessageContainer>
        <Title>
          Hi, {user.displayName || user.name}!
          <UserActions>
            <Link href="/profile/info">
              <Button>Update Runner Info</Button>
            </Link>
          </UserActions>
        </Title>
        <p>
          (Not you? <TextButton onClick={handleSignout}>Click here to log out.</TextButton>)
        </p>
        {session.data.user.isAdmin && (
          <div>
            You&apos;re an admin, by the way.&nbsp;
            <Link href="/admin/events">
              <Anchor>✨Enter the Admin Zone✨</Anchor>
            </Link>
          </div>
        )}
      </WelcomeMessageContainer>
      <ColumnContainer>
        <ProfileColumn>
          <ProfileEditor user={user} />
        </ProfileColumn>
        <SubmissionsColumn>
          {!user.vettingInfo && <VettingInfoAlert user={user} />}
          {user.vettingInfo && <EventList title="Submit to events" onClick={navigateToEvent} />}
        </SubmissionsColumn>
      </ColumnContainer>
    </Container>
  );
};

export async function getServerSideProps(context: NextPageContext) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await unstable_getServerSession(context.req as any, context.res as any, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/',
      },
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
    },
    include: {
      vettingInfo: true,
    },
  });

  if (!user) {
    return {
      redirect: {
        destination: '/',
      },
    };
  }

  return {
    props: {
      user: prepareUserForTransfer(user),
    },
  };
}

export default SubmissionsHome;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: #fff;
  font-weight: 400;
`;

const ColumnContainer = styled.div`
  display: flex;
  flex-direction: row;

  @media screen and (max-width: 500px) {
    flex-direction: column-reverse;
  }
`;

const WelcomeMessageContainer = styled.div`
  margin: 0 1rem;
  border-bottom: 1px solid ${SiteConfig.colors.secondary};
  padding-bottom: 0.5rem;

  & > p {
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
  }
`;

const ProfileColumn = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 15rem;
  flex-grow: 1;
  align-self: stretch;
  padding: 0 1rem;
`;

const SubmissionsColumn = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 1rem;
  flex-grow: 2;
  align-self: stretch;

  & p {
    font-size: 1.5rem;
    margin: 0.5rem 0;
  }

  @media screen and (max-width: 500px) {
    border-bottom: 1px solid ${SiteConfig.colors.secondary};
    padding-bottom: 1rem;
  }
`;

const WelcomeMessage = styled.h1`
  display: flex;
  flex-direction: row;
  align-items: space-between;
  justify-content: center;
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 0;

  @media screen and (max-width: 500px) {
    margin-top: 1rem;
  }
  
  @media screen and (max-width: 800px) {
    flex-direction: column;
  }
`;

const UserActions = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: auto;
  
  & button {
    height: 2.5rem;
    padding: 0.5rem 1rem;
  }

  @media screen and (max-width: 800px) {
    margin: 0.5rem 0 1rem;
  }
`;

const Title = styled(WelcomeMessage)`
  margin-top: 1rem;
`;
