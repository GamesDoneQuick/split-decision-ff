import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { useRouter } from 'next/router';
import { EventAvailability, User } from '@prisma/client';
import Select from 'react-select';
import { add } from 'date-fns';
import { EventWithCommitteeMemberIdsAndNames, fetchServerSession, prepareRecordForTransfer } from '../../../../utils/models';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../../utils/dbHelpers';
import { isMemberOfCommittee } from '../../../../utils/eventHelpers';
import { CommitteeToolbar } from '../../../../components/CommitteeToolbar';
import { FormItem, Label } from '../../../../components/layout';
import { prisma } from '../../../../utils/db';
import { availabilitySlotsToRawSegments } from '../../../../utils/durationHelpers';
import { CalendarView } from '../../../../components/CalendarView';

interface RunnerAvailabilityProps {
  event: EventWithCommitteeMemberIdsAndNames;
  usersInEvent: (User & { eventAvailabilities: EventAvailability[] })[];
}

const RunnerAvailability: NextPage<RunnerAvailabilityProps> = ({ event, usersInEvent }) => {
  const router = useRouter();
  const [selectedUsername, setSelectedUsername] = useState((router.query.user || '').toString());

  const selectedUser = useMemo(() => usersInEvent.find(user => user.name === selectedUsername), [selectedUsername, usersInEvent]);

  const handleSelectUser = useCallback((value: User | null) => {
    if (!value) return;
  
    setSelectedUsername(value.name || '');
    router.replace({
      query: { ...router.query, user: value.name },
    });
  }, [router]);
  
  const availabilitySegments = useMemo(() => {
    if (!selectedUser) return null;

    const availabilitySet = selectedUser.eventAvailabilities[0];

    if (!availabilitySet) return [];
    
    return availabilitySlotsToRawSegments(availabilitySet);
  }, [selectedUser]);

  const startDate = useMemo(() => new Date(event.eventStart), [event.eventStart]);
  const endDate = useMemo(() => add(new Date(event.eventStart), { days: event.eventDays }), [event.eventStart, event.eventDays]);

  return (
    <Container>
      <CommitteeToolbar event={event} isCommitteeMember activePage="availability">
        <UserSelectorContainer>
          <Label htmlFor="userSelect">Runner</Label>
          <Select
            id="userSelect"
            options={usersInEvent}
            value={selectedUser}
            classNamePrefix="selector"
            getOptionValue={item => item.id}
            getOptionLabel={item => item.name ?? '<Name missing>'}
            onChange={handleSelectUser}
          />
        </UserSelectorContainer>
      </CommitteeToolbar>
      <CalendarSection>
        {availabilitySegments !== null && (
          <CalendarView
            start={startDate}
            end={endDate}
            slots={availabilitySegments}
          />
        )}
      </CalendarSection>
    </Container>
  );
};

export default RunnerAvailability;

export async function getServerSideProps(context: NextPageContext) {
  const session = await fetchServerSession(context.req, context.res);

  const event = await fetchEventWithCommitteeMemberIdsAndNames(context.query.id?.toString() || '');

  if (!event || !session || !isMemberOfCommittee(event, session.user)) {
    return {
      notFound: true,
    };
  }

  const uniqueUserSubmissons = await prisma.gameSubmission.findMany({
    where: {
      eventId: event.id,
    },
    distinct: ['userId'],
    include: {
      user: {
        include: {
          eventAvailabilities: {
            where: {
              eventId: event.id,
            },
          },
        },
      },
    },
  });

  return {
    props: {
      event: JSON.parse(JSON.stringify(event)),
      usersInEvent: uniqueUserSubmissons.map(item => ({
        ...prepareRecordForTransfer(item.user),
        eventAvailabilities: item.user.eventAvailabilities.map(record => ({
          ...prepareRecordForTransfer(record),
          slots: record.slots.map(value => value.toISOString()),
        })),
      })),
    },
  };
}

const Container = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
  color: #fff;
  font-weight: 400;
  overflow: hidden;
`;

const UserSelectorContainer = styled(FormItem)`
  position: relative;
  margin-left: 1rem;
  min-width: 0;
  flex-grow: 1;
  align-self: stretch;
  justify-content: center;
  z-index: 3;

  & > div {
    width: 100%;  
  }
`;

const CalendarSection = styled.div`
  min-height: 0;
  flex-grow: 1;
  align-self: stretch;
  overflow-y: auto;
`;
