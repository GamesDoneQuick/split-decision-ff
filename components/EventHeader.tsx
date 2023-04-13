import { Event } from '@prisma/client';
import { intlFormat, parseISO } from 'date-fns';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useOnMount } from '../utils/hooks';
import { getEventSubmissionTimeString } from './EventList';
import { EventPageTitle } from './layout';

interface EventHeaderProps {
  event: Event;
}

export const EventHeader: React.FC<EventHeaderProps> = ({ event: eventRecord }) => {
  const [submissionCloseTime, setSubmissionCloseTime] = useState('');

  useOnMount(() => {
    // Prevent a SSR hydration error when less than 1 minute remains.
    setSubmissionCloseTime(getEventSubmissionTimeString(eventRecord));
  });
  
  return (
    <EventPageTitle>
      <EventName>{eventRecord.eventName}</EventName>
      <EventStats>
        <EventStartTime>Starts on {intlFormat(parseISO((eventRecord.eventStart as unknown) as string))}</EventStartTime>
        <SubmissionCloseTime>{submissionCloseTime}</SubmissionCloseTime>
      </EventStats>
    </EventPageTitle>
  );
};

const EventStats = styled.div`
  margin-left: auto;  
  text-align: right;

  @media screen and (max-width: 800px) {
    margin: 0;
    text-align: left;
  }
`;

const EventStartTime = styled.h2`
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0 0 0.5rem;
`;

const SubmissionCloseTime = styled.h2`
  font-size: 1.75rem;
  margin: 0.5rem 0 0;
`;

const EventName = styled.div`
  position: relative;
  top: 0.5rem;
`;
