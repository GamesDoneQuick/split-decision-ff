import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Event } from '@prisma/client';
import { compareDesc, intlFormat, intlFormatDistance, isBefore } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { Alert } from './layout';
import { areSubmissionsOpen, forceAsDate, isAfterSubmissionPeriod, isBeforeSubmissionPeriod } from '../utils/eventHelpers';
import { SiteConfig } from '../utils/siteConfig';

const ABSOLUTE_FORMAT_OPTIONS = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
} as const;

export function getEventSubmissionTimeString(event: Event, includeAbsoluteDate = false) {
  const now = new Date().getTime();
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startDate = forceAsDate(event.gameSubmissionPeriodStart);
  const endDate = forceAsDate(event.gameSubmissionPeriodEnd);

  if (isAfterSubmissionPeriod(event)) {
    return 'Submissions are closed';
  }

  if (isBeforeSubmissionPeriod(event)) {
    const absoluteDate = includeAbsoluteDate ? ` (${intlFormat(utcToZonedTime(startDate, localTimezone), ABSOLUTE_FORMAT_OPTIONS)})` : '';

    return `Submissions open ${intlFormatDistance(startDate, now)}${absoluteDate}`;
  }

  const absoluteDate = includeAbsoluteDate ? ` (${intlFormat(utcToZonedTime(endDate, localTimezone), ABSOLUTE_FORMAT_OPTIONS)})` : '';

  return `Submissions close ${intlFormatDistance(endDate, now)}${absoluteDate}`;
}

function sortEventList(list: Event[]): Event[] {
  return list.sort((a, b) => compareDesc(forceAsDate(a.eventStart), forceAsDate(b.eventStart)));
}

interface EventItemProps {
  event: Event;
  onClick: (id: string) => void;
}

const EventItem: React.FC<EventItemProps> = ({ event, onClick }) => {
  const submissionTime = useMemo(() => getEventSubmissionTimeString(event), [event]);

  const eventStart = useMemo(() => intlFormat(forceAsDate(event.eventStart)), [event.eventStart]);

  const wasEventInPast = useMemo(() => isBefore(forceAsDate(event.eventStart), Date.now()), [event.eventStart]);

  const handleClick = useCallback(() => {
    onClick(event.id);
  }, [event.id, onClick]);
  
  return (
    <li>
      <EventItemButton onClick={handleClick}>
        <EventItemContainer>
          <EventInfo>
            {event.eventName}{!event.visible && <i>&nbsp;(Hidden)</i>}
            <SubmissionTime>{wasEventInPast ? 'Began' : 'Begins'} on {eventStart}</SubmissionTime>
          </EventInfo>
          <EventStartDate>{submissionTime}</EventStartDate>
        </EventItemContainer>
      </EventItemButton>
    </li>
  );
};

interface EventListProps {
  events?: Event[];
  title?: string;
  includeHidden?: boolean;
  onClick: (id: string) => void;
}

export const EventList: React.FC<EventListProps> = ({ events: propEvents, title, onClick, includeHidden = false }) => {
  const [hasFetchedEvents, setHasFetchedEvents] = useState(!!propEvents);
  const [isLoading, setIsLoading] = useState(!propEvents);
  const [events, setEvents] = useState<Event[]>(propEvents ?? []);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (hasFetchedEvents) return;

    setHasFetchedEvents(true);

    const fetchData = async () => {
      const response = await fetch(`/api/events?includeHidden=${includeHidden}`);
      const data = await response.json();

      if (response.status === 200) {
        setEvents(data);
      } else {
        setError(data.error);
      }
    };

    fetchData()
      .then(() => setIsLoading(false))
      .catch(e => setError(e.toString()));
  }, [hasFetchedEvents, includeHidden]);

  useEffect(() => {
    if (propEvents) setEvents(propEvents);
  }, [propEvents]);

  const [openEvents, pendingEvents, upcomingEvents, pastEvents] = useMemo(() => {
    const [openUnsorted, pendingUnsorted, upcomingUnsorted, pastUnsorted] = events.reduce<[Event[], Event[], Event[], Event[]]>(([open, pending, upcoming, past], event) => {
      if (areSubmissionsOpen(event)) return [[...open, event], pending, upcoming, past];
      if (isBeforeSubmissionPeriod(event)) return [open, [...pending, event], upcoming, past];
      if (isBefore(forceAsDate(event.eventStart), Date.now())) return [open, pending, upcoming, [...past, event]];
      return [open, pending, [...upcoming, event], past];
    }, [[], [], [], []]);
    
    return [
      sortEventList(openUnsorted),
      sortEventList(pendingUnsorted),
      sortEventList(upcomingUnsorted),
      sortEventList(pastUnsorted),
    ];
  }, [events]);

  return (
    <Container>
      <Title>{title || 'Events'}</Title>
      {isLoading && <div>Loading events...</div>}

      {!isLoading && !!error && (
        <Alert variant="error">{error}</Alert>
      )}

      {!isLoading && upcomingEvents.length > 0 && (
        <EventListSection>
          <EventListTitle>Upcoming events</EventListTitle>
          <EventListElement>
            {upcomingEvents.map(event => <EventItem key={event.id} event={event} onClick={onClick} />)}
          </EventListElement>
        </EventListSection>
      )}

      {!isLoading && openEvents.length > 0 && (
        <EventListSection>
          <EventListTitle>Submissions open</EventListTitle>
          <EventListElement>
            {openEvents.map(event => <EventItem key={event.id} event={event} onClick={onClick} />)}
          </EventListElement>
        </EventListSection>
      )}

      {!isLoading && pendingEvents.length > 0 && (
        <EventListSection>
          <EventListTitle>Submissions opening soon</EventListTitle>
          <EventListElement>
            {pendingEvents.map(event => <EventItem key={event.id} event={event} onClick={onClick} />)}
          </EventListElement>
        </EventListSection>
      )}

      {!isLoading && pastEvents.length > 0 && (
        <EventListSection>
          <EventListTitle>Past events</EventListTitle>
          <EventListElement>
            {pastEvents.map(event => <EventItem key={event.id} event={event} onClick={onClick} />)}
          </EventListElement>
        </EventListSection>
      )}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const Title = styled.h2`
  margin: 0.5rem 0 0;
  font-size: 1.5rem;
`;

const EventListElement = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;

  & > li + li {
    margin-top: 1rem;
  }
`;

const EventItemButton = styled.button`
  width: 100%;
  flex-direction: column;
  text-align: left;
  background-color: ${SiteConfig.colors.accents.eventItem};
  border: none;
  font-family: inherit;
  color: inherit;
  font-size: inherit;
  color: ${SiteConfig.colors.text.dark};
  padding: 1rem;
  cursor: pointer;
`;

const EventItemContainer = styled.div`
  display: flex;
  width: 100%;
  text-align: left;
  flex-direction: column;
  justify-content: space-between;
`;

const EventInfo = styled.div`
  display: flex;
  justify-content: space-between;
`;

const SubmissionTime = styled.div`
  margin-left: auto;
`;

const EventStartDate = styled.div`
  font-weight: 700;
  margin-top: 0.5rem;
  text-align: right;
`;

const EventListSection = styled.div`
  & + & {
    margin-top: 1rem;
  }
`;

const EventListTitle = styled.h3`
  margin: 1rem 0;
`;
