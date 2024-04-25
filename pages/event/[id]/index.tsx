import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { NextSeo } from 'next-seo';
import { useRouter } from 'next/router';
import { normalizeText } from 'normalize-text';
import Select from 'react-select';
import { GameSubmissionCategory, RunStatus } from '@prisma/client';
import { formatDuration, intervalToDuration } from 'date-fns';
import { ParsedUrlQueryInput } from 'querystring';
import { prisma } from '../../../utils/db';
import { SubmissionList } from '../../../components/SubmissionList';
import { CommitteeVisibleSubmission, EventWithCommitteeMemberIdsAndNames, fetchServerSession, prepareRecordForTransfer, SubmissionWithCategoriesAndUsername } from '../../../utils/models';
import { SiteConfig } from '../../../utils/siteConfig';
import { Button, FormItem, Label, TextInput } from '../../../components/layout';
import { EventHeader } from '../../../components/EventHeader';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../utils/dbHelpers';
import { canUserViewEvent, isMemberOfCommittee } from '../../../utils/eventHelpers';
import { pluralizeWithValue } from '../../../utils/humanize';
import { stringDurationToSeconds } from '../../../utils/durationHelpers';
import { CommitteeToolbar } from '../../../components/CommitteeToolbar';

type CategoryContainingRecord = { categories: GameSubmissionCategory[] }[];

function sortAsCommitteeMember(a: SubmissionWithCategoriesAndUsername | CommitteeVisibleSubmission, b: SubmissionWithCategoriesAndUsername | CommitteeVisibleSubmission): number {
  return Math.max(...b.categories.map(x => x.createdAt?.getTime() ?? Number.MIN_SAFE_INTEGER)) - Math.max(...a.categories.map(x => x.createdAt?.getTime() ?? Number.MIN_SAFE_INTEGER));
}

function sortAsGenericUser(a: SubmissionWithCategoriesAndUsername | CommitteeVisibleSubmission, b: SubmissionWithCategoriesAndUsername | CommitteeVisibleSubmission): number {
  return a.gameTitle.localeCompare(b.gameTitle);
}

// These filters should really be further down the component chain but alas
function getCategoryCount(list: CategoryContainingRecord) {
  return list.reduce((acc, item) => acc + item.categories.filter(category => category.runStatus !== 'Coop').length, 0);
}

function getTotalCategoryDuration(list: CategoryContainingRecord) {
  return list.reduce((acc, item) => item.categories
    .filter(category => category.runStatus !== 'Coop')
    .reduce((innerAcc, category) => (
      innerAcc + stringDurationToSeconds(category.estimate)
    ), acc), 0);
}

const STATUS_FILTERS = ['accepted', 'backup', 'declined', 'pending'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

interface EventDetailsProps {
  event: EventWithCommitteeMemberIdsAndNames;
  submissions: SubmissionWithCategoriesAndUsername[] | CommitteeVisibleSubmission[];
  isCommitteeMember: boolean,
}

const EventDetails: NextPage<EventDetailsProps> = ({ event, submissions: rawSubmissions, isCommitteeMember }) => {
  const router = useRouter();
  const [submissions, setSubmissions] = useState(rawSubmissions);
  const [filterValue, setFilterValue] = useState((router.query.filter || '').toString());
  const [visibleStatuses, setVisibleStatuses] = useState(() => STATUS_FILTERS.reduce((acc, filter) => {
    if (router.query[filter] !== 'false') return [...acc, filter];

    return acc;
  }, [] as StatusFilter[]));

  const [subcommitteeFilters, setSubcommitteeFilters] = useState(() => {
    const subcommittees = (router.query.subcommittees || '').toString();

    return subcommittees ? subcommittees.split(',') : [];
  });

  const showFilters = event.runStatusVisible || isCommitteeMember;

  const filteredSubmissions = useMemo(() => {
    const normalizedQuery = normalizeText(filterValue || '');

    return submissions
      .filter(item => {
        if (normalizedQuery.length === 0) return true;

        const submissionSearchString = normalizeText(`${item.gameTitle} ${item.user.name} ${item.categories.map(cat => cat.categoryName).join(' ')}`);

        return submissionSearchString.indexOf(normalizedQuery) !== -1;
      })
      .reduce((acc, item) => {
        if (!showFilters) return [...acc, item];

        if (isCommitteeMember && subcommitteeFilters.length > 0) {
          if (subcommitteeFilters.indexOf(item.primaryGenre) === -1 && subcommitteeFilters.indexOf(item.secondaryGenre || '') === -1) {
            return acc;
          }
        }

        const showAccepted = visibleStatuses.indexOf('accepted') !== -1;
        const showBackup = visibleStatuses.indexOf('backup') !== -1;
        const showPending = visibleStatuses.indexOf('pending') !== -1;
        const showDeclined = visibleStatuses.indexOf('declined') !== -1;

        const validCategories: GameSubmissionCategory[] = item.categories.filter(category => {
          switch (category.runStatus) {
            case 'Accepted':
            case 'Coop':
            case 'Bonus':
              return showAccepted;
            
            case 'Backup':
              return showBackup;
            
            case 'Declined':
              return showDeclined;

            case 'Pending':
              return isCommitteeMember && showPending;

            default:
              return true;
          }
        });

        if (validCategories.length > 0) {
          return [...acc, {
            ...item,
            categories: validCategories,
          }];
        }

        return acc;
      }, [] as SubmissionWithCategoriesAndUsername[] | CommitteeVisibleSubmission[]);
  }, [filterValue, submissions, showFilters, visibleStatuses, isCommitteeMember, subcommitteeFilters]);

  const allCategoryCount = useMemo(() => getCategoryCount(submissions), [submissions]);
  const filteredCategoryCount = useMemo(() => getCategoryCount(filteredSubmissions), [filteredSubmissions]);
  const filteredCategoryDuration = useMemo(() => {
    const seconds = getTotalCategoryDuration(filteredSubmissions) * 1000;

    if (seconds === 0) return '0 seconds';
  
    return formatDuration(intervalToDuration({ start: 0, end: seconds }), { delimiter: ', ' });
  }, [filteredSubmissions]);

  const filteredIncentiveCount = useMemo(() => {
    if (!isCommitteeMember) return 0;
  
    return (filteredSubmissions as CommitteeVisibleSubmission[]).reduce((acc, item) => acc + item.incentives.length, 0);
  }, [filteredSubmissions, isCommitteeMember]);

  const subcommitteeOptions = useMemo(() => event.genres.map(label => ({
    value: label,
    label,
  })), [event.genres]);

  const updateStatusQueryParams = useCallback((values: StatusFilter[]) => {
    const query = STATUS_FILTERS.reduce((acc, filter) => ({
      ...acc,
      [filter]: values.indexOf(filter) !== -1,
    }), { ...router.query } as ParsedUrlQueryInput);

    router.replace({ query });
    setVisibleStatuses(values);
  }, [router]);

  const handleUpdateFilterValue = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setFilterValue(evt.target.value);
    router.replace({
      query: { ...router.query, filter: evt.target.value },
    });
  }, [router]);

  const handleToggleStatus = useCallback((status: StatusFilter, forceOnly: boolean) => {
    if (forceOnly) {
      updateStatusQueryParams([status]);
    } else if (visibleStatuses.indexOf(status) === -1) {
      updateStatusQueryParams([...visibleStatuses, status]);
    } else {
      updateStatusQueryParams(visibleStatuses.filter(x => x !== status));
    }
  }, [updateStatusQueryParams, visibleStatuses]);

  const handleToggleShowAccepted = useCallback((mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
    handleToggleStatus('accepted', mouseEvent.shiftKey);
  }, [handleToggleStatus]);

  const handleToggleShowBackup = useCallback((mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
    handleToggleStatus('backup', mouseEvent.shiftKey);
  }, [handleToggleStatus]);

  const handleToggleShowDeclined = useCallback((mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
    handleToggleStatus('declined', mouseEvent.shiftKey);
  }, [handleToggleStatus]);

  const handleToggleShowPending = useCallback((mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
    handleToggleStatus('pending', mouseEvent.shiftKey);
  }, [handleToggleStatus]);

  const handleChangeSubcommitteeFilters = useCallback((values: readonly { value: string; label: string; }[]) => {
    const subcommitteeNames = values.map(({ value }) => value);

    setSubcommitteeFilters([...subcommitteeNames]);
    router.replace({
      query: { ...router.query, subcommittees: subcommitteeNames },
    });
  }, [router]);

  const handleStatusChange = useCallback((submissionId: string, categoryId: string, status: RunStatus) => {
    const updatedSubmissions = (submissions as SubmissionWithCategoriesAndUsername[]).reduce((acc, submission) => {
      if (submission.id === submissionId) {
        return [...acc, {
          ...submission,
          categories: submission.categories.reduce((subAcc, category) => {
            if (category.id === categoryId) {
              return [...subAcc, { ...category, runStatus: status }];
            }

            return [...subAcc, category];
          }, [] as GameSubmissionCategory[]),
        }];
      }

      return [...acc, submission];
    }, [] as SubmissionWithCategoriesAndUsername[]);

    setSubmissions(updatedSubmissions);
  }, [submissions]);

  const mappedSubcommitteeValue = useMemo(() => subcommitteeFilters.map(x => ({ value: x, label: x })), [subcommitteeFilters]);

  return (
    <Container>
      <NextSeo
        title={`${event.eventName} Submissions`}
        description={`Event submissions for ${event.eventName}, a speedrunning marathon by ${SiteConfig.organizationName}.`}
      />
      <WelcomeMessageContainer>
        <EventHeaderContainer>
          {isCommitteeMember && (
            <SubmissionCommitteeToolbar event={event} isCommitteeMember={isCommitteeMember} activePage="submissions">
              <EventMetadata>
                <EventMetadataHeader>Event Visibility</EventMetadataHeader>
                <EventMetadataHeader>Acceptance Statuses</EventMetadataHeader>
                <div>{event.visible ? 'Visible' : 'Hidden'}</div>
                <div>{event.runStatusVisible ? 'Visible' : 'Hidden'}</div>
              </EventMetadata>
              <CommitteeMemberTools>
                <EventLink href={`/api/events/${event.id}/download`} target="_blank" rel="noopener noreferrer">
                  <EventAction>
                    Export Run CSV
                  </EventAction>
                </EventLink>
                <EventLink href={`/api/events/${event.id}/incentives/download`} target="_blank" rel="noopener noreferrer">
                  <EventAction>
                    Export Incentive CSV
                  </EventAction>
                </EventLink>
              </CommitteeMemberTools>
            </SubmissionCommitteeToolbar>
          )}
          <EventHeader event={event} />
        </EventHeaderContainer>
        <FilterContainer>
          <Label htmlFor="filterInput">Filter</Label>
          <FilterInputs>
            <TextFilterContainer>
              <TextInput
                id="filterInput"
                value={filterValue}
                onChange={handleUpdateFilterValue}
                placeholder="Enter a game, runner, or category"
              />
            </TextFilterContainer>
            {isCommitteeMember && (
              <SubcommitteeSelectorContainer>
                <Select
                  options={subcommitteeOptions}
                  value={mappedSubcommitteeValue}
                  onChange={handleChangeSubcommitteeFilters}
                  classNamePrefix="selector"
                  isMulti
                  placeholder="No subcommittee filter"
                />
              </SubcommitteeSelectorContainer>
            )}
            {showFilters && (
              <StatusFilterContainer>
                <StatusFilter
                  activeColor={SiteConfig.colors.status.accepted}
                  onClick={handleToggleShowAccepted}
                  active={visibleStatuses.indexOf('accepted') !== -1}
                >
                  Accepted
                </StatusFilter>
                <StatusFilter
                  activeColor={SiteConfig.colors.status.backup}
                  onClick={handleToggleShowBackup}
                  active={visibleStatuses.indexOf('backup') !== -1}
                >
                  Backup
                </StatusFilter>
                <StatusFilter
                  activeColor={SiteConfig.colors.status.declined}
                  onClick={handleToggleShowDeclined}
                  active={visibleStatuses.indexOf('declined') !== -1}
                >
                  Declined
                </StatusFilter>
                {isCommitteeMember && (
                  <StatusFilter
                    activeColor={SiteConfig.colors.accents.linkDark}
                    onClick={handleToggleShowPending}
                    active={visibleStatuses.indexOf('pending') !== -1}
                  >
                    Pending
                  </StatusFilter>
                )}
              </StatusFilterContainer>
            )}
          </FilterInputs>
        </FilterContainer>
      </WelcomeMessageContainer>
      <SubmissionListContainer>
        <SubmissionList
          event={event}
          submissions={filteredSubmissions}
          showUsernames
          onStatusChange={handleStatusChange}
          isCommitteeMember={isCommitteeMember}
        />
      </SubmissionListContainer>
      <SubmissionTotal>
        Showing {filteredCategoryCount} of {pluralizeWithValue(allCategoryCount, 'category', 'categories')} ({filteredCategoryDuration})
        {isCommitteeMember && ` (${pluralizeWithValue(filteredIncentiveCount, 'incentive')})`}
      </SubmissionTotal>
    </Container>
  );
};

export default EventDetails;

export async function getServerSideProps(context: NextPageContext) {
  const session = await fetchServerSession(context.req, context.res);

  const event = await fetchEventWithCommitteeMemberIdsAndNames(context.query.id?.toString() || '');

  if (!event || !canUserViewEvent(event, session?.user ?? null)) {
    return {
      notFound: true,
    };
  }

  const isCommitteeMember = session !== null && isMemberOfCommittee(event, session.user);

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
    if (!submission.user.showSubmissions && !isCommitteeMember) return acc;

    let normalizedSubmission: SubmissionWithCategoriesAndUsername | CommitteeVisibleSubmission = submission;

    if (!event.runStatusVisible && !isCommitteeMember) {
      // Blank out all statuses if run statuses are not visible and this is not a committee member.
      normalizedSubmission = {
        ...submission,
        categories: submission.categories.map(category => ({
          ...category,
          runStatus: 'Pending',
        })),
      };
    }

    normalizedSubmission.categories.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    
    return [...acc, normalizedSubmission];
  }, [] as SubmissionWithCategoriesAndUsername[] | CommitteeVisibleSubmission[]);

  const sortMethod = isCommitteeMember ? sortAsCommitteeMember : sortAsGenericUser;

  visibleSubmissions.sort(sortMethod);

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
  color: ${SiteConfig.colors.text.primary};
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
  padding: 0 1rem;
`;

const SubmissionListContainer = styled.div`
  overflow-y: auto;
  flex-grow: 1;
  min-height: 0;
  align-self: stretch;
`;

const FilterContainer = styled(FormItem)`
  background-color: ${SiteConfig.colors.secondary};
  color: ${SiteConfig.colors.text.primary};
  padding: 1rem 1rem 1rem;
  margin: 1rem 0 0;
`;

const SubmissionTotal = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  margin-top: auto;
  background-color: ${SiteConfig.colors.secondary};
  color: ${SiteConfig.colors.text.primary};
`;

const CommitteeMemberTools = styled.div`
  margin-left: auto;

  & a + a {
    margin-left: 0.5rem;
  }
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

const EventMetadata = styled.div`
  display: grid;
  margin-left: 2rem;
  grid-template-columns: repeat(2, max-content);

  & > div {
    padding: 0.25rem 0.5rem;
  }
`;

const EventMetadataHeader = styled.div`
  text-transform: uppercase;
  font-weight: 700;
  font-size: 0.825rem;
  margin-bottom: 0.125rem;
`;

const FilterInputs = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const StatusFilter = styled(Button)<{ active: boolean; activeColor: string }>`
  font-size: 1rem;
  background-color: ${({ active, activeColor }) => active ? activeColor : '#777'};
  
  &:first-child {
    border-radius: 0.25rem 0 0 0.25rem;
  }

  & + &:not(:last-child) {
    border-radius: 0;
    border-left: 1px solid #444;
    border-right: 1px solid #444;
  }

  &:last-child {
    border-radius: 0 0.25rem 0.25rem 0;
  }

  &&:hover,
  &&:active {
    background-color: ${({ activeColor }) => activeColor};
  }
`;

const StatusFilterContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: max-content;
  margin-left: 1rem;
`;

const TextFilterContainer = styled.div`
  min-width: 0;
  flex-grow: 1;
  align-self: stretch;
`;

const SubcommitteeSelectorContainer = styled.div`
  margin-top: -1px;
  margin-left: 0.5rem;
`;

const SubmissionCommitteeToolbar = styled(CommitteeToolbar)`
  margin: 0 -1rem;
`;
