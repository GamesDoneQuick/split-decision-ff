import React from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { useSession } from 'next-auth/react';
import { Event, EventAvailability } from '@prisma/client';
// eslint-disable-next-line camelcase
import Link from 'next/link';
import { prisma } from '../../utils/db';
import { ReturnToProfile } from '../../components/layout';
import { fetchServerSession, IncentiveWithCategories, SubmissionWithCategories, UserWithVettingInfo } from '../../utils/models';
import { VettingInfoAlert } from '../../components/VettingInfoAlert';
import { EventHeader } from '../../components/EventHeader';
import { fetchEventSubmissionDataForUser, fetchUserWithVettingInfo } from '../../utils/dbHelpers';
import { UserEventSubmissionView } from '../../components/UserEventSubmissionView';

interface EventDetailsProps {
  user: UserWithVettingInfo,
  event: Event;
  submissions: SubmissionWithCategories[];
  incentives: IncentiveWithCategories[];
  availability: Omit<EventAvailability, 'slots'> & {
    slots: string[];
  };
}

const EventDetails: NextPage<EventDetailsProps> = ({ user, event, submissions: submissionFromServer, incentives: incentivesFromServer, availability: availabilityFromServer }) => {
  useSession({
    required: true,
  });

  return (
    <Container>
      <WelcomeMessageContainer>
        <Link href="/profile">
          <ReturnToProfile>Return to my profile</ReturnToProfile>
        </Link>
        <EventHeader event={event} />
      </WelcomeMessageContainer>
      <SystemAlerts>
        <VettingInfoAlert user={user} />
      </SystemAlerts>
      <UserEventSubmissionView
        user={user}
        event={event}
        submissions={submissionFromServer}
        incentives={incentivesFromServer}
        availability={availabilityFromServer}
      />
    </Container>
  );
};

export default EventDetails;

export async function getServerSideProps(context: NextPageContext) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await fetchServerSession(context.req, context.res);

  if (!session) {
    return {
      redirect: {
        destination: '/',
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await fetchUserWithVettingInfo(context.req, context.res);

  const event = await prisma.event.findFirst({
    where: {
      id: context.query.id as string,
    },
  });

  if (!event || !user) {
    return {
      redirect: {
        destination: '/',
      },
    };
  }

  const submissionData = await fetchEventSubmissionDataForUser(event, user);

  if (submissionData) {
    submissionData.submissions = submissionData.submissions.map(submission => ({
      ...submission,
      categories: submission.categories.map(category => ({
        ...category,
        runStatus: 'Pending',
      })),
    }));
  }

  return {
    props: submissionData,
  };
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: #fff;
  font-weight: 400;
  height: 100%;
`;

const WelcomeMessageContainer = styled.div`
  margin: 0 1rem;
  padding-bottom: 0.5rem;

  & > p {
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
  }
`;

const SystemAlerts = styled.div`
  padding: 0 1rem;
`;
