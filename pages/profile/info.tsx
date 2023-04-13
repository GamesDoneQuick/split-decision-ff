import React from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { useSession } from 'next-auth/react';
// eslint-disable-next-line camelcase
import { unstable_getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '../api/auth/[...nextauth]';
import { SiteConfig } from '../../utils/siteConfig';
import { prepareUserForTransfer, UserWithVettingInfo } from '../../utils/models';
import { VettingEditor } from '../../components/VettingEditor';
import { fetchUserWithVettingInfo } from '../../utils/dbHelpers';

interface VettingPageProps {
  user: UserWithVettingInfo;
}

const VettingPage: NextPage<VettingPageProps> = ({ user }) => {
  const session = useSession({
    required: true,
  });

  if (session.status !== 'authenticated') return null;
    
  return (
    <Container>
      <WelcomeMessageContainer>
        <Link href="/profile">
          <ReturnToProfile>Return to my profile</ReturnToProfile>
        </Link>
        <WelcomeMessage>
          Runner Info
        </WelcomeMessage>
      </WelcomeMessageContainer>
      <ColumnContainer>
        <EditorColumn>
          <VettingEditor user={user} />
        </EditorColumn>
      </ColumnContainer>
    </Container>
  );
};

export default VettingPage;

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await fetchUserWithVettingInfo(context.req as any, context.res as any);

  return {
    props: {
      user: prepareUserForTransfer(user),
    },
  };
}

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
    flex-direction: column;
  }
`;

const WelcomeMessageContainer = styled.div`
  margin: 0 1rem;
  border-bottom: 1px solid ${SiteConfig.colors.accents.separator};
  padding-bottom: 0.5rem;

  & > p {
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
  }
`;

const EditorColumn = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.5rem 1rem;
  flex-grow: 2;
  align-self: stretch;
`;

const WelcomeMessage = styled.h1`
  font-size: 3.5rem;
  font-weight: 700;
  margin: 0;
`;

const ReturnToProfile = styled.a`
  display: block;
  color: ${SiteConfig.colors.accents.link};
  font-size: 1.25rem;
  margin: 1rem 0;

  &:hover,
  &:active {
    color: ${SiteConfig.colors.accents.alert};
  }
`;
