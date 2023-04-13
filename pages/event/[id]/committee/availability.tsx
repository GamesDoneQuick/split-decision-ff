import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { useRouter } from 'next/router';
import { EventAvailability, User, Event } from '@prisma/client';
import Select from 'react-select';
import { add } from 'date-fns';
import { format } from 'date-fns-tz';
import { EventWithCommitteeMemberIdsAndNames, fetchServerSession, prepareRecordForTransfer } from '../../../../utils/models';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../../utils/dbHelpers';
import { isMemberOfCommittee } from '../../../../utils/eventHelpers';
import { CommitteeToolbar } from '../../../../components/CommitteeToolbar';
import { FormItem, Label } from '../../../../components/layout';
import { prisma } from '../../../../utils/db';
import { SiteConfig } from '../../../../utils/siteConfig';
import { availabilitySlotsToSegments, DateSegment } from '../../../../utils/durationHelpers';

type CalendarSpan = { hours: number; start: number; end: number; available: true } | { hours: number; available: false };

function formatHour(hour: number, suffix = true) {
  if (hour === 12) return `12${suffix ? ' PM' : ''}`;
  if (hour === 24 || hour === 0) return `12${suffix ? ' AM' : ''}`;
  if (hour > 12) return `${hour - 12}${suffix ? ' PM' : ''}`;

  return `${hour}${suffix ? ' AM' : ''}`;
}

function formatRange(start: number, end: number) {
  if ((end >= 12 && start < 12) || (end === 24 && start >= 12)) {
    return `${formatHour(start)}—${formatHour(end)}`;
  }

  return `${formatHour(start, false)}—${formatHour(end)}`;
}

function getEventDates(event: Event) {
  const startDate = new Date(event.eventStart);

  return [...Array(event.eventDays)]
    .reduce<Date[]>((acc, _, index) => [
      ...acc,
      add(startDate, { days: index }),
    ], [] as Date[])
    .map(date => format(date, 'MMM do', { timeZone: 'America/New_York' }));
}

interface RunnerAvailabilityProps {
  event: EventWithCommitteeMemberIdsAndNames;
  usersInEvent: (User & { eventAvailabilities: EventAvailability[] })[];
}

const RunnerAvailability: NextPage<RunnerAvailabilityProps> = ({ event, usersInEvent }) => {
  const router = useRouter();
  const [selectedUsername, setSelectedUsername] = useState((router.query.user || '').toString());

  const selectedUser = useMemo(() => usersInEvent.find(user => user.name === selectedUsername), [selectedUsername, usersInEvent]);

  const hourSegments = [...Array(event.endTime - event.startTime)].map((_, index) => index + event.startTime);

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

    if (!availabilitySet) return {};
    
    const segments = availabilitySlotsToSegments(availabilitySet);
    
    const segmentsByDate = segments.reduce((acc, segment) => ({
      ...acc,
      [segment.date]: [...(acc[segment.date] || []), segment],
    }), {} as Record<string, DateSegment[]>);

    return Object.entries(segmentsByDate).reduce((acc, [date, slots]) => {
      // Filter out slots that roll over to the next day (weird hiccup of the availability picker)
      const slotsWithFiller = slots.filter(slot => slot.start >= event.startTime).reduce((innerAcc, slot, index, slotSet) => {
        const newSlots: CalendarSpan[] = [];

        // Fill until start of day
        if (index === 0 && slot.start > event.startTime) newSlots.push({ hours: slot.start - event.startTime, available: false });

        // Fill between end of last slot to start of this slot
        if (index > 0) {
          const diffFromLastSlot = slot.start - slotSet[index - 1].end;

          if (diffFromLastSlot > 0) newSlots.push({ hours: diffFromLastSlot, available: false });
        }

        // Add this slot as available
        newSlots.push({
          start: slot.start,
          end: slot.end,
          hours: slot.end - slot.start,
          available: true,
        });

        // Fill until end of day
        if (index === slotSet.length - 1 && slot.end < event.endTime) {
          newSlots.push({ hours: event.endTime - slot.end, available: false });
        }

        return [...innerAcc, ...newSlots];
      }, [] as CalendarSpan[]);

      return {
        ...acc,
        [date]: slotsWithFiller,
      };
    }, {} as Record<string, CalendarSpan[]>);
  }, [selectedUser, event.endTime, event.startTime]);

  const eventDays = useMemo(() => getEventDates(event), [event]);

  return (
    <Container>
      <WelcomeMessageContainer>
        <EventHeaderContainer>
          {/* <EventPageTitle>Runner Availability for {event.eventName}</EventPageTitle> */}
          <AvailabilityToolbar event={event} isCommitteeMember activePage="availability">
            <UserSelectorContainer>
              <Label htmlFor="userSelect">Runner</Label>
              <Select
                id="userSelect"
                options={usersInEvent}
                value={selectedUser}
                classNamePrefix="user-selector"
                getOptionValue={item => item.id}
                getOptionLabel={item => item.name ?? '<Name missing>'}
                onChange={handleSelectUser}
              />
            </UserSelectorContainer>
          </AvailabilityToolbar>
        </EventHeaderContainer>
      </WelcomeMessageContainer>
      <CalendarSection>
        {availabilitySegments !== null && (
          <Calendar hours={hourSegments.length}>
            <CalendarHeader />
            {hourSegments.map(hour => <HourMarker>{formatHour(hour)}</HourMarker>)}
            {eventDays.map(day => (
              <React.Fragment key={day}>
                <CalendarHeader>{day}</CalendarHeader>
                {(availabilitySegments[day] || []).length === 0 ? (
                  <CalendarSpacer hours={hourSegments.length} />
                ) : (
                  availabilitySegments[day].map((slot, index) => (
                    slot.available ? (
                      <CalendarSlot key={index} hours={slot.hours}>
                        {formatRange(slot.start, slot.end)}
                      </CalendarSlot>
                    ) : (
                      <CalendarSpacer key={index} hours={slot.hours} />
                    )
                  ))
                )}
              </React.Fragment>
            ))}
          </Calendar>
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

const WelcomeMessageContainer = styled.div`
  & > p {
    font-size: 1.5rem;
    margin: 0 0 0.5rem;
  }
`;

const EventHeaderContainer = styled.div`
  padding: 1rem 1rem 0;
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

  & .user-selector__option {
    color: ${SiteConfig.colors.text.dark};
  }
`;

const AvailabilityToolbar = styled(CommitteeToolbar)`
  height: 5rem;
  margin-top: -1rem;
`;

const CalendarSection = styled.div`
  min-height: 0;
  flex-grow: 1;
  align-self: stretch;
  overflow-y: auto;
`;

const Calendar = styled.div<{ hours: number }>`
  display: grid;
  width: 100%;
  grid-template-rows: repeat(${({ hours }) => hours + 1}, 1fr);
  grid-template-columns: 4rem;
  grid-auto-flow: column;
`;

const CalendarHeader = styled.div`
  position: sticky;
  top: 0;
  font-weight: 700;
  background-color: ${SiteConfig.colors.accents.separator};
  padding: 0.5rem 1rem;
  z-index: 2;
`;

const HourMarker = styled.div`
  font-size: 0.825rem;
  text-align: right;
  width: 4rem;
  color: #999;
  border-right: 1px solid #666;
  padding-right: 0.25rem;

  &:before {
    content: ' ';
    position: relative;
    display: block;
    height: 1px;
    width: 100vw;
    left: 0;
    top: 0;
    background-color: #666;
    z-index: -1;
  }
`;

const CalendarBlock = styled.div<{ hours: number }>`
  grid-row: span ${({ hours }) => hours};
`;

const CalendarSpacer = styled(CalendarBlock)`
  border-right: 1px solid #666;
`;

const CalendarSlot = styled(CalendarBlock)`
  position: relative;
  z-index: 1;
  background-color: ${SiteConfig.colors.accents.eventItem};
  color: ${SiteConfig.colors.text.dark};
  border-right: 1px solid #666;
  padding: 0.25rem;
  border-left: 4px solid rgba(0, 0, 0, 0.3);
`;
