import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Event } from '@prisma/client';
import { SubmissionWithCategories } from '../utils/models';
import { useConfirmationPrompt } from '../utils/ConfirmationPrompt';
import { Alert, Button } from './layout';
import { SubmissionList } from './SubmissionList';
import { SiteConfig } from '../utils/siteConfig';
import { SubmissionEditor } from './SubmissionEditor';

const CONFIRMATION_PROMPT_MESSAGE = 'Are you sure you want to start a new submission? You have not saved this submission and will lose your progress.';

function createEmptySubmission(event: Event): SubmissionWithCategories {
  return {
    id: '',
    userId: '',
    eventId: event.id,
    gameTitle: '',
    platform: '',
    primaryGenre: event.genres[0],
    secondaryGenre: '',
    technicalNotes: '',
    flashingLights: false,
    contentWarning: '',
    soloCommentary: false,
    description: '',
    categories: [],
    createdAt: null,
    updatedAt: null,
  };
}

interface SubmissionEditTabProps {
  event: Event;
  submissions: SubmissionWithCategories[];
  allowSubmissions: boolean;
  onChange: (submissions: SubmissionWithCategories[]) => void;
}

export const SubmissionEditTab: React.FC<SubmissionEditTabProps> = ({ event, submissions, allowSubmissions, onChange }) => {
  const [activeSubmission, setActiveSubmission] = useState<SubmissionWithCategories | null>(null);

  const handleNewSubmission = useCallback(() => {
    setActiveSubmission(createEmptySubmission(event));
  }, [event]);

  const [newSubmissionConfirmationPrompt, promptNewSubmission] = useConfirmationPrompt(CONFIRMATION_PROMPT_MESSAGE, handleNewSubmission);

  const handlePromptNewSubmission = useCallback(() => {
    if (activeSubmission === null) {
      handleNewSubmission();
    } else {
      promptNewSubmission();
    }
  }, [handleNewSubmission, promptNewSubmission, activeSubmission]);

  const handleSubmissionSave = useCallback((submission: SubmissionWithCategories) => {
    const [updatedList, wasUpdated] = submissions.reduce<[SubmissionWithCategories[], boolean]>(([acc, updated], item) => {
      if (item.id === submission.id) return [[...acc, submission], true];

      return [[...acc, item], updated];
    }, [[], false]);

    if (wasUpdated) {
      onChange(updatedList);
    } else {
      onChange([...updatedList, submission]);
    }

    setActiveSubmission(null);
  }, [submissions, onChange]);

  const handleSubmissionDelete = useCallback((id: string) => {
    setActiveSubmission(null);
    onChange(submissions.filter(item => item.id !== id));
  }, [submissions, onChange]);

  const remainingSubmissions = event.maxSubmissions - submissions.length;

  return (
    <>
      {newSubmissionConfirmationPrompt}
      <ExistingSubmissionsColumn expand={!allowSubmissions}>
        <Title>My Submissions</Title>
        {!allowSubmissions && (
          <div>
            {submissions.length === 0 && <Alert>You have no submissions for {event.eventName}.</Alert>}
            {submissions.length > 0 && <SubmissionList submissions={submissions} />}
          </div>
        )}
        
        {allowSubmissions && (
          <ExistingSubmissionsList>
            {submissions.map(submission => (
              <li key={submission.id}>
                <ExistingSubmissionButton onClick={() => allowSubmissions && setActiveSubmission(submission)}>
                  <ExistingSubmissionInfo>
                    <ExistingSubmissionTitle>{submission.gameTitle}</ExistingSubmissionTitle>
                    <ExistingSubmissionCategoryCount>{submission.categories.length} {submission.categories.length === 1 ? 'category' : 'categories'}</ExistingSubmissionCategoryCount>
                  </ExistingSubmissionInfo>
                </ExistingSubmissionButton>
              </li>
            ))}
            {submissions.length === 0 && (
              <Alert>You have not submitted anything to {event.eventName}.</Alert>
            )}
            {allowSubmissions && (
              <AddGameButton onClick={handlePromptNewSubmission} disabled={remainingSubmissions === 0}>
                Add game ({remainingSubmissions} remaining)
              </AddGameButton>
            )}
          </ExistingSubmissionsList>
        )}
      </ExistingSubmissionsColumn>
      {allowSubmissions && activeSubmission && (
        <EditorColumn>
          <SubmissionEditor
            event={event}
            submission={activeSubmission}
            onSave={handleSubmissionSave}
            onDelete={handleSubmissionDelete}
          />
        </EditorColumn>
      )}
    </>
  );
};

const ExistingSubmissionsColumn = styled.div<{ expand: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: ${({ expand }) => !expand && '25rem'};
  max-width: ${({ expand }) => !expand && '25rem'};
  flex-grow: 1;
  align-self: stretch;
  padding: 1rem;
  border-right: ${({ expand }) => !expand && `1px solid ${SiteConfig.colors.primary}`};
  height: 100%;
  overflow-y: auto;

  @media screen and (max-width: 800px) {
    max-width: 100%;
    border-right: none;
    min-height: 0;
    height: unset;
  }
`;

const ExistingSubmissionInfo = styled.div`
  display: flex;
  justify-content: space-between;
`;

const ExistingSubmissionTitle = styled.div`
  display: flex;
  align-items: center;
  word-break: break-word;
  text-align: left;
  padding-right: 0.5rem;
`;

const ExistingSubmissionCategoryCount = styled.div`
  display: flex;
  align-items: center;
  margin-left: auto;
`;

const AddGameButton = styled(Button)`
  margin-top: 1rem;
  width: 100%;
`;

const ExistingSubmissionButton = styled.button`
  display: flex;
  width: 100%;
  flex-direction: column;
  border: none;
  font-family: inherit;
  font-size: inherit;
  background-color: ${SiteConfig.colors.accents.eventItem};
  color: ${SiteConfig.colors.text.dark};
  padding: 1rem;
  cursor: pointer;
`;

const ExistingSubmissionsList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;

  & > li + li {
    margin-top: 1rem;
  }
`;

const EditorColumn = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: 0.5rem 1rem;
  flex-grow: 2;
  align-self: stretch;
  overflow-y: auto;

  @media screen and (max-width: 800px) {
    border-top: 1px solid ${SiteConfig.colors.primary};
  }
`;

const Title = styled.h2`
  font-weight: 700;
  margin: 0 0 1rem 0;
`;
