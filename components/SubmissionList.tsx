import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Event, GameSubmission, GameSubmissionCategory, RunStatus } from '@prisma/client';
import { Alert, Badge, Button, SelectInput } from './layout';
import { CommitteeVisibleSubmission, IncentiveWithCategories, SubmissionWithCategories, SubmissionWithCategoriesAndUsername } from '../utils/models';
import { SiteConfig } from '../utils/siteConfig';
import { getUserName } from '../utils/userHelpers';
import { pluralize, pluralizeWithValue } from '../utils/humanize';
import { POST_SAVE_OPTS, useSaveable } from '../utils/hooks';

const RUN_STATUS_OPTIONS = [
  RunStatus.Accepted,
  RunStatus.Backup,
  RunStatus.Bonus,
  RunStatus.Pending,
  RunStatus.Declined,
  RunStatus.Coop,
];

function formatRunStatus(status: RunStatus) {
  if (status === RunStatus.Coop) return 'Co-op/Race';

  return status;
}

type SubmissionRecord = SubmissionWithCategories | SubmissionWithCategoriesAndUsername | CommitteeVisibleSubmission;

interface GenreSelectorProps {
  event: Event;
  submission: GameSubmission;
  field: 'primaryGenre' | 'secondaryGenre';
  isCommitteeMember: boolean;
}

const GenreSelector: React.FC<GenreSelectorProps> = ({ event: eventRecord, submission, field, isCommitteeMember }) => {
  const [value, setValue] = useState(submission[field] || '');

  const handleGenreSelected = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setValue(event.target.value);
    fetch(`/api/events/${submission.eventId}/submissions/${submission.id}/genre`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        field,
        value: event.target.value,
      }),
    });
  }, [submission.eventId, submission.id, field]);

  if (!isCommitteeMember) return <span>{submission[field]}</span>;
  
  return (
    <select
      onChange={handleGenreSelected}
      value={value}
    >
      {field === 'secondaryGenre' && <option value="">(None)</option>}
      {eventRecord.genres.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
};

interface CategoryRowProps {
  submission: GameSubmission,
  category: GameSubmissionCategory;
  incentives: IncentiveWithCategories[];
  onStatusChange?: (submissionId: string, categoryId: string, status: RunStatus) => void;
  isCommitteeMember: boolean;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ submission, category, incentives, onStatusChange, isCommitteeMember }) => {
  const [showIncentives, setShowIncentives] = useState(false);
  const [hasOpenedCommitteeVote, setHasOpenedCommitteeVote] = useState(category.isCommitteeVoteOpened);

  const handleToggleShowIncentives = useCallback(() => setShowIncentives(!showIncentives), [showIncentives]);
  const [runStatus, setRunStatus] = useState(category.runStatus);

  const [save, isSaving, saveError] = useSaveable<{ status: string }, string>(`/api/events/${submission.eventId}/categories/${category.id}/status`, true, POST_SAVE_OPTS);

  const handleChangeStatus = useCallback(async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const status = event.target.value as RunStatus;

    setRunStatus(status);

    await save({ status });

    onStatusChange?.(submission.id, category.id, status);
  }, [save, onStatusChange, submission.id, category.id]);

  const handleStartCommitteeVote = useCallback((categoryId: string) => {
    setHasOpenedCommitteeVote(true);
    fetch(`/api/events/${submission.eventId}/categories/${categoryId}/vote`, { method: 'POST' });
  }, [submission.eventId]);

  return (
    <tr key={category.id}>
      <td width="15%">
        <VideoLink href={category.videoURL} target="_blank" rel="noopener noreferrer">
          {category.categoryName}
        </VideoLink>
        <div>
          {runStatus !== 'Pending' && (
            <StatusBadge status={runStatus}>{formatRunStatus(runStatus)}</StatusBadge>
          )}
        </div>
      </td>
      <NumericCell width="10%">{category.estimate}</NumericCell>
      <DescriptionCell>
        {category.description}

        {isCommitteeMember && incentives.length > 0 && (
          <IncentiveDrawer>
            <IncentiveDrawerHead>
              <strong>{pluralizeWithValue(incentives.length, 'incentive')}</strong>
              <ShowIncentivesButton onClick={handleToggleShowIncentives}>
                {showIncentives ? 'Hide' : 'Show'}
              </ShowIncentivesButton>
            </IncentiveDrawerHead>
            {showIncentives && (
              <IncentiveList>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Est.</th>
                      <th>Deadline</th>
                      <th>Description</th>
                      {/* <th>Status</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {incentives.map(incentive => (
                      <tr key={incentive.id}>
                        <td width="20%">
                          {incentive.videoURL ? (
                            <VideoLink href={incentive.videoURL} target="_blank" rel="noopener noreferrer">
                              {incentive.name}
                            </VideoLink>
                          ) : incentive.name}
                        </td>
                        <td width="12%">{incentive.estimate}</td>
                        <td width="20%">{incentive.closeTime}</td>
                        <td>
                          {incentive.description}

                          {incentive.attachedCategories.length > 1 && (
                            <p>
                              <em>
                                <span>Also on {incentive.attachedCategories.length - 1}&nbsp;</span>
                                <span>other {pluralize(incentive.attachedCategories.length - 1, 'category', 'categories')}.</span>
                              </em>
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </IncentiveList>
            )}
          </IncentiveDrawer>
        )}
      </DescriptionCell>
      {isCommitteeMember && (
        <>
          <td width="10%">
            <StatusSelector disabled={isSaving} value={runStatus} onChange={handleChangeStatus}>
              {RUN_STATUS_OPTIONS.map(option => (
                <option key={option} value={option}>{option === RunStatus.Coop ? 'Co-op/Race' : option}</option>
              ))}
            </StatusSelector>
            {saveError.error && (
              <Alert variant="error">
                Could not save status: {saveError.message}
              </Alert>
            )}
          </td>
          <td width="15%">
            <Button onClick={() => handleStartCommitteeVote(category.id)} disabled={hasOpenedCommitteeVote}>
              {hasOpenedCommitteeVote ? 'Vote opened' : 'Open Vote'}
            </Button>
          </td>
        </>
      )}
    </tr>
  );
};
interface SubmissionDetailsProps {
  event: Event;
  submission: SubmissionRecord;
  onStatusChange?: (submissionId: string, categoryId: string, status: RunStatus) => void;
  isCommitteeMember: boolean;
}

const SubmissionDetails: React.FC<SubmissionDetailsProps> = ({ event: eventRecord, submission, onStatusChange, isCommitteeMember = false }) => {
  const incentivesPerCategory = useMemo(() => {
    if (!isCommitteeMember || !('incentives' in submission)) return {};

    const categoryMapping: Record<string, IncentiveWithCategories[]> = submission.categories.reduce((acc, item) => ({ ...acc, [item.id]: [] }), {});

    return submission.incentives.reduce<Record<string, IncentiveWithCategories[]>>((acc, incentive) => (
      incentive.attachedCategories.reduce((innerAcc, category) => ({
        ...innerAcc,
        [category.categoryId]: [...(innerAcc[category.categoryId] || []), incentive],
      }), acc)
    ), categoryMapping);
  }, [submission, isCommitteeMember]);

  return (
    <SubmissionDetailsContainer>
      <GameTitle>
        {submission.gameTitle}
        {isCommitteeMember && submission.soloCommentary && (
          <SoloCommentaryBadge>Solo Commentary</SoloCommentaryBadge>
        )}
      </GameTitle>
      <GameDetailsGridRow>
        <GameDetails>
          <GameDetailsKey>Genre</GameDetailsKey>
          <GenreSelector
            field="primaryGenre"
            event={eventRecord}
            submission={submission}
            isCommitteeMember={isCommitteeMember}
          />
        </GameDetails>
        {/* <GameDetails>
          <GameDetailsKey>Subgenre</GameDetailsKey>
          <GenreSelector
            field="secondaryGenre"
            event={eventRecord}
            submission={submission}
            isCommitteeMember={isCommitteeMember}
          />
        </GameDetails> */}
        <GameDetails>
          <GameDetailsKey>Platform</GameDetailsKey>
          <div>{submission.platform}</div>
        </GameDetails>
        <GameDetailsDescription>
          <GameDetailsKey>Description</GameDetailsKey>
          <GameDetailsValueWrap>{submission.description}</GameDetailsValueWrap>
        </GameDetailsDescription>
      </GameDetailsGridRow>
      {submission.contentWarning && (
        <SubmissionWarningRow>
          <b>Content warning:</b>&nbsp;{submission.contentWarning}
        </SubmissionWarningRow>
      )}
      {submission.flashingLights && (
        <SubmissionWarningRow>
          <b>Game contains flashing lights.</b>
        </SubmissionWarningRow>
      )}
      {submission.categories.length === 0 && (
        <Alert>No categories submitted.</Alert>
      )}
      {submission.categories.length > 0 && (
        <CategoryTable>
          <thead>
            <tr>
              <th>Category</th>
              <th>Estimate</th>
              <th>Description</th>
              {isCommitteeMember && (
                <>
                  <th>Status</th>
                  <th>&nbsp;</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {submission.categories.map(category => (
              <CategoryRow
                key={category.id}
                submission={submission}
                category={category}
                incentives={incentivesPerCategory[category.id] || []}
                onStatusChange={onStatusChange}
                isCommitteeMember={isCommitteeMember}
              />
            ))}
          </tbody>
        </CategoryTable>
      )}
    </SubmissionDetailsContainer>
  );
};

interface SubmissionUserData {
  name: string;
  visible: boolean;
}

interface SubmissionListProps {
  event: Event;
  submissions: SubmissionRecord[];
  onStatusChange?: (submissionId: string, categoryId: string, status: RunStatus) => void;
  showUsernames?: boolean;
  isCommitteeMember?: boolean;
}

export const SubmissionList: React.FC<SubmissionListProps> = ({ event: eventRecord, submissions, onStatusChange, showUsernames = false, isCommitteeMember = false }) => {
  const [groupedUsernames, groupedSubmissions] = useMemo(() => (
    submissions.reduce(([usernameMapping, submissionMapping], submission) => [
      {
        ...usernameMapping,
        [submission.userId]: 'user' in submission ? {
          name: getUserName(submission.user) || '',
          visible: submission.user.showSubmissions,
        } : { name: '', visible: true },
      },
      {
        ...submissionMapping,
        [submission.userId]: [...(submissionMapping[submission.userId] || []), submission],
      },
    ], [{} as Record<string, SubmissionUserData>, {} as Record<string, SubmissionRecord[]>])
  ), [submissions]);

  return (
    <Container>
      {Object.entries(groupedSubmissions).map(([userId, list]) => (
        <UserSubmissions key={userId}>
          {showUsernames && (
            <Username>
              <span>{groupedUsernames[userId]?.name ?? userId}</span>
              {!(groupedUsernames[userId]?.visible ?? true) && (
                <VisibilityBadge>Hidden</VisibilityBadge>
              )}
            </Username>
          )}
          {list.map(submission => (
            <SubmissionDetails
              key={submission.id}
              event={eventRecord}
              submission={submission}
              onStatusChange={onStatusChange}
              isCommitteeMember={isCommitteeMember}
            />
          ))}
        </UserSubmissions>
      ))}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const CategoryTable = styled.table`
  border-collapse: collapse;
  margin-top: 0.5rem;
  
  & th,
  & td {
    padding: 0.25rem 0.5rem;
    vertical-align: top;
  }
  
  & th {
    text-align: left;
    background-color: rgba(0, 0, 0, 0.5);
    background-color: ${SiteConfig.colors.secondary};
  }

  & tr:nth-of-type(2n) td {
    background-color: rgba(0, 0, 0, 0.25);
  }
`;

const SubmissionDetailsContainer = styled.div`
  display: flex;
  flex-direction: column;

  & + & {
    border-top: 1px solid ${SiteConfig.colors.secondary};
    padding-top: 0.5rem;
    margin-top: 0.5rem;
  }
`;

const GameTitle = styled.h3`
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
`;

const GameDetailsRow = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 0.5rem;
`;

const GameDetailsGridRow = styled.div`
  display: grid;
  width: 100%;
  grid-template-columns: repeat(4, fit-content(100%));
  grid-gap: 1.5rem;

  @media screen and (max-width: 600px) {
    grid-template-columns: repeat(3, fit-content(100%));
  }
`;

const GameDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const GameDetailsDescription = styled(GameDetails)`
  @media screen and (max-width: 600px) {
    grid-column: 1 / -1;
    margin-bottom: 1rem;
  }  
`;

const GameDetailsKey = styled.div`
  margin-bottom: 0.125rem;
  text-transform: uppercase;
  font-size: 0.75rem;
  font-weight: 700;
`;

const GameDetailsValueWrap = styled.div`
  word-break: break-word;
`;

const Username = styled.h2`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 2rem;
  margin: 0 0 1rem 0;
`;

const UserSubmissions = styled.div`
  padding: 1rem;

  & + & {
    border-top: 2px solid ${SiteConfig.colors.secondary};
  }
`;

const NumericCell = styled.td`
  font-variant-numeric: tabular-nums;
`;

const SubmissionWarningRow = styled(GameDetailsRow)`
  margin-top: 0.5rem;
`;

const DescriptionCell = styled.td`
  word-break: break-word;  
`;

const VideoLink = styled.a`
  text-decoration: underline;
`;

const IncentiveDrawer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  border-radius: 0.25rem;
  background-color: ${SiteConfig.colors.accents.alert};
  color: ${SiteConfig.colors.text.dark};
  margin: 0.5rem 0;

  & th {
    color: ${SiteConfig.colors.text.light};
  }
`;

const IncentiveDrawerHead = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const ShowIncentivesButton = styled(Button)`
  margin-left: auto;
  font-size: 0.825rem;
  padding: 0.25rem 1rem;
`;

const IncentiveList = styled.div`
  margin-top: 0.5rem;

  & table {
    width: 100%;
  }
`;

const VisibilityBadge = styled(Badge)`
  background-color: ${SiteConfig.colors.secondary};
  color: ${SiteConfig.colors.text.light};
`;

const SoloCommentaryBadge = styled(Badge)`
  background-color: ${SiteConfig.colors.status.backup};
  color: ${SiteConfig.colors.text.light};
  font-family: 'Lexend', sans-serif;
`;

// const CoopBadge = styled(Badge)`
//   background-color: ${SiteConfig.colors.accents.activeTimeslot};
//   color: ${SiteConfig.colors.text.light};
//   font-family: 'Lexend', sans-serif;
//   margin: 0 0.5rem 0 0;
// `;

const StatusBadge = styled(Badge)<{ status: RunStatus }>`
  display: block;
  margin: 0.5rem 0 0;

  background-color: ${({ status }) => {
    switch (status) {
      case 'Accepted':
      case 'Coop':
      case 'Bonus':
        return SiteConfig.colors.status.accepted;

      case 'Backup':
        return SiteConfig.colors.status.backup;

      case 'Declined':
        return SiteConfig.colors.status.declined;

      default:
        return 'transparent';
    }
  }};
`;

const StatusSelector = styled(SelectInput)`
  border: none;
  background-color: transparent;
  color: ${SiteConfig.colors.text.primary};
  padding: 0;
`;
