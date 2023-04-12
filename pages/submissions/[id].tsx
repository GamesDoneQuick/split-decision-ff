import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { useSession } from 'next-auth/react';
import { Event, EventAvailability } from '@prisma/client';
import { format, parseISO } from 'date-fns';
// eslint-disable-next-line camelcase
import Link from 'next/link';
import ScheduleSelector from 'react-schedule-selector';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { prisma } from '../../utils/db';
import { areIncentivesOpen, areSubmissionsOpen } from '../../utils/eventHelpers';
import { fetchServerSession, IncentiveWithCategories, prepareRecordForTransfer, prepareSubmissionForTransfer, prepareUserForTransfer, SubmissionWithCategories, UserWithVettingInfo } from '../../utils/models';
import { SiteConfig } from '../../utils/siteConfig';
import { VettingInfoAlert } from '../../components/VettingInfoAlert';
import { TabSidebar } from '../../components/TabSidebar';
import { SubmissionEditTab } from '../../components/SubmissionEditTab';
import { IncentiveEditTab } from '../../components/IncentiveEditTab';
import { EventHeader } from '../../components/EventHeader';
import { fetchUserWithVettingInfo } from '../../utils/dbHelpers';

const SUBMISSION_TABS_SUBMISSIONS_CLOSED = [
  { value: 'submissions', label: 'Submissions' },
  { value: 'incentives', label: 'Incentives' },
];

const SUBMISSION_TABS_SUBMISSIONS_OPEN = [
  { value: 'availability', label: 'Availability' },
  ...SUBMISSION_TABS_SUBMISSIONS_CLOSED,
];

function renderSelectorTime(_time: Date): React.ReactNode {
  return <div />;
}

function renderSelectorDate(date: Date | null): React.ReactNode {
  if (!date) return <div />;

  return (
    <SelectorDate>{format(date, 'MMM. d')}</SelectorDate>
  );
}

function renderSelectorDateCell(datetime: Date, selected: boolean, refSetter: (dateCell: HTMLElement | null) => void): React.ReactNode {
  return (
    <SelectorElement ref={refSetter} selected={selected}>{format(datetime, 'haaa')}</SelectorElement>
  );
}

interface EventDetailsProps {
  user: UserWithVettingInfo,
  event: Event;
  submissions: SubmissionWithCategories[];
  incentives: IncentiveWithCategories[];
  availability: Omit<EventAvailability, 'slots'> & {
    slots: string[];
  };
}

function toServerTime(date: Date) {
  return zonedTimeToUtc(date, 'America/New_York');
}

function fromServerTime(date: Date) {
  return utcToZonedTime(date, 'America/New_York');
}

const EventDetails: NextPage<EventDetailsProps> = ({ user, event, submissions: submissionFromServer, incentives: incentivesFromServer, availability: availabilityFromServer }) => {
  useSession({
    required: true,
  });

  const [activeTab, setActiveTab] = useState('availability');
  const [submissions, setSubmissions] = useState(submissionFromServer);
  const [incentives, setIncentives] = useState(incentivesFromServer);
  const [availability, setAvailability] = useState(() => ({
    ...availabilityFromServer,
    slots: availabilityFromServer.slots.map(slot => fromServerTime(parseISO(slot))),
  }));

  const handleUpdateAvailability = useCallback((slots: Date[]) => {
    setAvailability({
      ...availability,
      slots,
    });

    fetch(`/api/events/${event.id}/availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slots: slots.map(slot => toServerTime(slot).toISOString()),
      }),
    });
  }, [availability, event.id]);

  const allowSubmissions = useMemo(() => user.vettingInfo !== undefined && user.vettingInfo !== null && areSubmissionsOpen(event), [user.vettingInfo, event]);
  const allowIncentives = useMemo(() => user.vettingInfo !== undefined && user.vettingInfo !== null && areIncentivesOpen(event), [user.vettingInfo, event]);

  const tabList = useMemo(() => (
    allowSubmissions ? SUBMISSION_TABS_SUBMISSIONS_OPEN : SUBMISSION_TABS_SUBMISSIONS_CLOSED
  ), [allowSubmissions]);

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
      <MainContent>
        <TabSidebar value={activeTab} options={tabList} onChange={setActiveTab} />
        <ContentColumn>
          {allowSubmissions && activeTab === 'availability' && (
            <ScheduleSelectorContainer>
              <Title>Availability</Title>
              <p>All times are in <b>Eastern Standard Time</b>.</p>
              <ScheduleSelector
                startDate={event.eventStart}
                minTime={event.startTime}
                maxTime={event.endTime + 1}
                numDays={event.eventDays}
                selection={availability.slots}
                onChange={handleUpdateAvailability}
                renderTimeLabel={renderSelectorTime}
                renderDateLabel={renderSelectorDate}
                renderDateCell={renderSelectorDateCell}
              />
            </ScheduleSelectorContainer>
          )}
          {activeTab === 'submissions' && (
            <ColumnContainer>
              <SubmissionEditTab
                event={event}
                submissions={submissions}
                allowSubmissions={allowSubmissions}
                onChange={setSubmissions}
              />
            </ColumnContainer>
          )}
          {activeTab === 'incentives' && (
            <ColumnContainer>
              <IncentiveEditTab
                event={event}
                submissions={submissions}
                incentives={incentives}
                allowIncentives={allowIncentives}
                onChange={setIncentives}
              />
            </ColumnContainer>
          )}
        </ContentColumn>
      </MainContent>
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

  if (!event) {
    return {
      redirect: {
        destination: '/',
      },
    };
  }
  const submissions = await prisma.gameSubmission.findMany({
    where: {
      userId: session.user.id,
      eventId: event.id,
    },
    include: {
      categories: true,
    },
  });
  
  // find or create event availability
  const availability = await prisma.eventAvailability.upsert({
    where: {
      userId_eventId: {
        userId: session.user.id,
        eventId: event.id,
      },
    },
    update: {},
    create: {
      userId: session.user.id,
      eventId: event.id,
      slots: [],
    },
  });

  const incentives = await prisma.runIncentive.findMany({
    where: {
      gameSubmissionId: {
        in: submissions.map(({ id }) => id),
      },
    },
    include: {
      attachedCategories: true,
    },
  });

  return {
    props: {
      user: prepareUserForTransfer(user),
      event: prepareRecordForTransfer(event),
      submissions: submissions.map(prepareSubmissionForTransfer),
      incentives: incentives.map(prepareRecordForTransfer),
      availability: {
        ...prepareRecordForTransfer(availability),
        slots: availability.slots.map(slot => slot.toISOString()),
      },
    },
  };
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: #fff;
  font-weight: 400;
  height: 100%;
`;

const ColumnContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  height: 100%;

  @media screen and (max-width: 800px) {
    flex-direction: column;
  }
`;

const WelcomeMessageContainer = styled.div`
  margin: 0 1rem;
  padding-bottom: 0.5rem;

  & > p {
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
  }
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

const Title = styled.h2`
  font-weight: 700;
  margin: 0 0 1rem 0;
`;

const ScheduleSelectorContainer = styled.div`
  display: flex
  flex-direction: column;
  padding: 1rem;
  background-color: ${SiteConfig.colors.accents.separator};
  color: ${SiteConfig.colors.text.light};
`;

// const SelectorTime = styled.div`
//   display: flex;
//   align-items: center;
//   justify-content: flex-end;
//   color: ${Colors.text.dark};
// `;

const SelectorDate = styled.div`
  text-align: center;
  color: ${SiteConfig.colors.text.dark};
`;

const SelectorElement = styled.div<{ selected: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.1rem;
  background-color: ${({ selected }) => selected ? SiteConfig.colors.accents.activeTimeslot : SiteConfig.colors.accents.alert};
  color: rgba(0, 0, 0, 0.75);

  &:hover {
    background-color: ${SiteConfig.colors.accents.link};
  }
`;

const SystemAlerts = styled.div`
  padding: 0 1rem;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: row;
  min-height: 0;
  align-self: stretch;
  height: 100%;
  overflow: hidden;
  flex-grow: 1;
  
  @media screen and (max-width: 800px) {
    border-top: 1px solid ${SiteConfig.colors.accents.separator};
    flex-direction: column;
  }
`;

const ContentColumn = styled.div`
  overflow: auto;
  height: 100%;
  min-width: 0;
  flex-grow: 1;
  align-self: stretch;
  background-color: ${SiteConfig.colors.accents.separator};
  color: ${SiteConfig.colors.text.light};
`;
