import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { NextPage } from 'next';
import { Event, EventAvailability } from '@prisma/client';
import { format, parseISO } from 'date-fns';
// eslint-disable-next-line camelcase
import ScheduleSelector from 'react-schedule-selector';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { areIncentivesOpen, areSubmissionsOpen } from '../utils/eventHelpers';
import { IncentiveWithCategories, SubmissionWithCategories, UserWithVettingInfo } from '../utils/models';
import { SiteConfig } from '../utils/siteConfig';
import { TabSidebar } from './TabSidebar';
import { SubmissionEditTab } from './SubmissionEditTab';
import { IncentiveEditTab } from './IncentiveEditTab';

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
    <SelectorDate>{format(date, 'E MMM. d')}</SelectorDate>
  );
}

function renderSelectorDateCell(datetime: Date, selected: boolean, refSetter: (dateCell: HTMLElement | null) => void): React.ReactNode {
  return (
    <SelectorElement ref={refSetter} selected={selected}>{format(datetime, 'haaa')}</SelectorElement>
  );
}

interface UserEventSubmissionViewProps {
  user: UserWithVettingInfo,
  event: Event;
  submissions: SubmissionWithCategories[];
  incentives: IncentiveWithCategories[];
  availability: Omit<EventAvailability, 'slots'> & {
    slots: string[];
  };
  ignoreLockDate?: boolean;
}

function toServerTime(date: Date) {
  return zonedTimeToUtc(date, 'America/New_York');
}

function fromServerTime(date: Date) {
  return utcToZonedTime(date, 'America/New_York');
}

export const UserEventSubmissionView: NextPage<UserEventSubmissionViewProps> = ({ user, event, submissions: submissionFromServer, incentives: incentivesFromServer, availability: availabilityFromServer, ignoreLockDate = false }) => {
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
        userId: user.id,
        slots: slots.map(slot => toServerTime(slot).toISOString()),
      }),
    });
  }, [availability, event.id, user.id]);

  const allowSubmissions = useMemo(() => ignoreLockDate || (user.vettingInfo !== undefined && user.vettingInfo !== null && areSubmissionsOpen(event)), [ignoreLockDate, user.vettingInfo, event]);
  const allowIncentives = useMemo(() => ignoreLockDate || (user.vettingInfo !== undefined && user.vettingInfo !== null && areIncentivesOpen(event)), [ignoreLockDate, user.vettingInfo, event]);

  const tabList = useMemo(() => (
    allowSubmissions ? SUBMISSION_TABS_SUBMISSIONS_OPEN : SUBMISSION_TABS_SUBMISSIONS_CLOSED
  ), [allowSubmissions]);

  return (
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
              user={user}
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
              user={user}
              submissions={submissions}
              incentives={incentives}
              allowIncentives={allowIncentives}
              onChange={setIncentives}
            />
          </ColumnContainer>
        )}
      </ContentColumn>
    </MainContent>
  );
};

const ColumnContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  height: 100%;

  @media screen and (max-width: 800px) {
    flex-direction: column;
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
  background-color: ${SiteConfig.colors.secondary};
  color: ${SiteConfig.colors.text.primary};
`;

// const SelectorTime = styled.div`
//   display: flex;
//   align-items: center;
//   justify-content: flex-end;
//   color: ${Colors.text.dark};
// `;

const SelectorDate = styled.div`
  text-align: center;
  color: ${SiteConfig.colors.text.primary};
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

const MainContent = styled.div`
  display: flex;
  flex-direction: row;
  min-height: 0;
  align-self: stretch;
  height: 100%;
  overflow: hidden;
  flex-grow: 1;
  border-top: 1px solid ${SiteConfig.colors.secondary};
  
  @media screen and (max-width: 800px) {
    flex-direction: column;
  }
`;

const ContentColumn = styled.div`
  overflow: auto;
  height: 100%;
  min-width: 0;
  flex-grow: 1;
  align-self: stretch;
  background-color: ${SiteConfig.colors.primary};
  color: ${SiteConfig.colors.text.primary};
`;
