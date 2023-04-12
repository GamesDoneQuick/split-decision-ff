import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { Event } from '@prisma/client';
import { NextSeo } from 'next-seo';
import { useRouter } from 'next/router';
import { normalizeText } from 'normalize-text';
import { prisma } from '../../utils/db';
import { SubmissionList } from '../../components/SubmissionList';
import { prepareRecordForTransfer, SubmissionWithCategoriesAndUsername } from '../../utils/models';
import { SiteConfig } from '../../utils/siteConfig';
import { FormItem, Label, TextInput } from '../../components/layout';
import { EventHeader } from '../../components/EventHeader';

interface EventDetailsProps {
  event: Event;
  submissions: SubmissionWithCategoriesAndUsername[];
}

const EventDetails: NextPage<EventDetailsProps> = ({ event, submissions }) => {
  const router = useRouter();
  const [filterValue, setFilterValue] = useState((router.query.filter || '').toString());
  const filteredSubmissions = useMemo(() => {
    const normalizedQuery = normalizeText(filterValue || '');

    if (normalizedQuery.length === 0) return submissions;

    return submissions.filter(item => {
      const submissionSearchString = normalizeText(`${item.gameTitle} ${item.user} ${item.categories.map(cat => cat.categoryName).join(' ')}`);

      return submissionSearchString.indexOf(normalizedQuery) !== -1;
    });
  }, [filterValue, submissions]);

  const handleUpdateFilterValue = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setFilterValue(evt.target.value);
    router.replace({
      query: { ...router.query, filter: evt.target.value },
    });
  }, [router]);

  return (
    <Container>
      <NextSeo
        title={`${event.eventName} Submissions`}
        description={`Event submissions for ${event.eventName}, a speedrunning marathon by ${SiteConfig.organizationName}.`}
      />
      <WelcomeMessageContainer>
        <EventHeaderContainer>
          <EventHeader event={event} />
        </EventHeaderContainer>
        <FilterContainer>
          <Label htmlFor="filterInput">Filter</Label>
          <TextInput
            id="filterInput"
            value={filterValue}
            onChange={handleUpdateFilterValue}
            placeholder="Enter a game, runner, or category"
          />
        </FilterContainer>
      </WelcomeMessageContainer>
      <SubmissionListContainer>
        <SubmissionList submissions={filteredSubmissions} showUsernames />
      </SubmissionListContainer>
      <SubmissionTotal>Showing {filteredSubmissions.length} of {submissions.length} submission{submissions.length !== 1 && 's'}</SubmissionTotal>
    </Container>
  );
};

export default EventDetails;

export async function getServerSideProps(context: NextPageContext) {
  const event = await prisma.event.findFirst({
    where: {
      id: context.query.id as string,
    },
  });

  if (!event) {
    return {
      notFound: true,
    };
  }

  const submissions = await prisma.gameSubmission.findMany({
    where: {
      eventId: event?.id,
    },
    include: {
      user: true,
      categories: true,
    },
  });
  
  // Remove other user data and exclude any users that don't want their submissions visible.

  const visibleSubmissions = submissions.reduce((acc, submission) => {
    if (!submission.user.showSubmissions) return acc;

    return [...acc, { ...submission, user: submission.user.displayName ?? submission.user.name }];
  }, [] as SubmissionWithCategoriesAndUsername[]);

  return {
    props: {
      event: JSON.parse(JSON.stringify(event)),
      submissions: visibleSubmissions.map(submission => ({
        ...prepareRecordForTransfer(submission),
        categories: submission.categories.map(prepareRecordForTransfer),
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

const SubmissionListContainer = styled.div`
  overflow-y: auto;
  flex-grow: 1;
  min-height: 0;
  align-self: stretch;
`;

const FilterContainer = styled(FormItem)`
  background-color: ${SiteConfig.colors.accents.separator};
  color: ${SiteConfig.colors.text.light};
  padding: 1rem 1rem 1rem;
`;

const SubmissionTotal = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  margin-top: auto;
  background-color: ${SiteConfig.colors.accents.separator};
  color: ${SiteConfig.colors.text.light};
`;
