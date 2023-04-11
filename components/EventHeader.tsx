import { Event } from '@prisma/client';
import { intlFormat, parseISO } from 'date-fns';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useOnMount } from '../utils/hooks';
import { getEventSubmissionTimeString } from './EventList';

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
    <WelcomeMessage>
      {eventRecord.eventName}
      <EventStats>
        <EventStartTime>Starts on {intlFormat(parseISO((eventRecord.eventStart as unknown) as string))}</EventStartTime>
        <SubmissionCloseTime>{submissionCloseTime}</SubmissionCloseTime>
      </EventStats>
    </WelcomeMessage>
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
  font-style: italic;
  font-weight: 400;
  margin: 0 0 0.5rem;
`;

const SubmissionCloseTime = styled.h2`
  font-size: 1.75rem;
  margin: 0.5rem 0;
`;

const WelcomeMessage = styled.h1`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 3.5rem;
  font-weight: 700;
  margin: 0;

  @media screen and (max-width: 800px) {
    flex-direction: column;
    text-align: left;
    align-items: flex-start;
  }
`;
