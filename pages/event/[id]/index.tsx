import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { NextSeo } from 'next-seo';
import { useRouter } from 'next/router';
import { normalizeText } from 'normalize-text';
import { prisma } from '../../../utils/db';
import { SubmissionList } from '../../../components/SubmissionList';
import { CommitteeVisibleSubmission, EventWithCommitteeMemberIdsAndNames, fetchServerSession, prepareRecordForTransfer, SubmissionWithCategoriesAndUsername } from '../../../utils/models';
import { SiteConfig } from '../../../utils/siteConfig';
import { Button, FormItem, Label, TextInput } from '../../../components/layout';
import { EventHeader } from '../../../components/EventHeader';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../utils/dbHelpers';
import { isMemberOfCommittee } from '../../../utils/eventHelpers';
import { pluralizeWithValue } from '../../../utils/humanize';

interface EventDetailsProps {
  event: EventWithCommitteeMemberIdsAndNames;
  submissions: SubmissionWithCategoriesAndUsername[] | CommitteeVisibleSubmission[];
  isCommitteeMember: boolean,
}

const EventDetails: NextPage<EventDetailsProps> = ({ event, submissions, isCommitteeMember }) => {
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
          <CommitteMemberWelcome>
            You are a committee member. Have fun!
            <CommitteeMemberTools>
              <EventLink href={`/api/events/${event.id}/download`} target="_blank" rel="noopener noreferrer">
                <EventAction>
                  Export CSV
                </EventAction>
              </EventLink>
            </CommitteeMemberTools>
          </CommitteMemberWelcome>
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
        <SubmissionList submissions={filteredSubmissions} showUsernames isCommitteeMember={isCommitteeMember} />
      </SubmissionListContainer>
      <SubmissionTotal>Showing {filteredSubmissions.length} of {pluralizeWithValue(submissions.length, 'submission')}</SubmissionTotal>
    </Container>
  );
};

export default EventDetails;

export async function getServerSideProps(context: NextPageContext) {
  const session = await fetchServerSession(context.req, context.res);

  const event = await fetchEventWithCommitteeMemberIdsAndNames(context.query.id?.toString() || '');

  if (!event) {
    return {
      notFound: true,
    };
  }

  const isCommitteeMember = session && isMemberOfCommittee(event, session.user);

  const submissions = await prisma.gameSubmission.findMany({
    where: {
      eventId: event?.id,
    },
    include: {
      user: true,
      categories: true,
      incentives: isCommitteeMember ? {
        include: {
          attachedCategories: true,
        },
      } : false,
    },
  });
  
  // Remove other user data and exclude any users that don't want their submissions visible.
  const visibleSubmissions = submissions.reduce((acc, submission) => {
    if (!submission.user.showSubmissions) return acc;

    let normalizedSubmission: SubmissionWithCategoriesAndUsername | CommitteeVisibleSubmission = submission;

    if (!event.runStatusVisible && !isCommitteeMember) {
      // Blank out all statuses if run statuses are not visible and this is not a committee member.j
      normalizedSubmission = {
        ...submission,
        categories: submission.categories.map(category => ({
          ...category,
          status: 'Pending',
        })),
      };
    }

    normalizedSubmission.categories.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    
    return [...acc, normalizedSubmission];
  }, [] as SubmissionWithCategoriesAndUsername[] | CommitteeVisibleSubmission[]);

  visibleSubmissions.sort((a, b) => a.gameTitle.localeCompare(b.gameTitle));

  return {
    props: {
      isCommitteeMember,
      event: JSON.parse(JSON.stringify(event)),
      submissions: visibleSubmissions.map(submission => ({
        ...prepareRecordForTransfer(submission),
        categories: submission.categories.map(prepareRecordForTransfer),
        incentives: 'incentives' in submission ? submission.incentives.map(prepareRecordForTransfer) : [],
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

const CommitteMemberWelcome = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1rem;
`;

const CommitteeMemberTools = styled.div`
  margin-left: auto;
`;

const EventAction = styled(Button)`
  width: unset;
  margin-left: auto;
  font-size: 1rem;
  margin: 0;

  & + & {
    margin-left: 0.5rem;
  }
`;

const EventLink = styled.a`
  & + ${EventAction} {
    margin-left: 0.5rem;
  }
`;
