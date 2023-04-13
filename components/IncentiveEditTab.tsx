import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Event, GameSubmission } from '@prisma/client';
import Select from 'react-select';
import { IncentiveWithCategories, IncentiveWithCategoryIds, SubmissionWithCategories } from '../utils/models';
import { useConfirmationPrompt } from '../utils/ConfirmationPrompt';
import { Alert, Button } from './layout';
import { SiteConfig } from '../utils/siteConfig';
import { IncentiveEditor } from './IncentiveEditor';
import { SubmissionIncentivesList } from './SubmissionIncentivesList';

const CONFIRMATION_PROMPT_MESSAGE = 'Are you sure you want to start a new incentive? You have not saved this incentive and will lose your progress.';

function flattenIncentive(incentive: IncentiveWithCategories): IncentiveWithCategoryIds {
  return {
    ...incentive,
    attachedCategories: incentive.attachedCategories.map(item => item.categoryId),
  };
}

function createEmptyIncentive(gameSubmission: GameSubmission): IncentiveWithCategoryIds {
  return {
    id: '',
    gameSubmissionId: gameSubmission.id,
    name: '',
    videoURL: '',
    description: '',
    closeTime: '',
    estimate: '',
    attachedCategories: [],
    createdAt: null,
    updatedAt: null,
  };
}

interface IncentiveEditTabProps {
  event: Event;
  submissions: SubmissionWithCategories[];
  incentives: IncentiveWithCategories[];
  allowIncentives: boolean;
  onChange: (submissions: IncentiveWithCategories[]) => void;
}

export const IncentiveEditTab: React.FC<IncentiveEditTabProps> = ({ event, submissions, incentives: allIncentives, allowIncentives, onChange }) => {
  const [activeIncentive, setActiveIncentive] = useState<IncentiveWithCategoryIds | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithCategories | null>(submissions[0] || null);
  const [activeParentSubmission, setActiveParentSubmission] = useState<SubmissionWithCategories>(submissions[0]);
  const selectedIncentives = useMemo<IncentiveWithCategories[]>(() => {
    if (!selectedSubmission) return [];

    return allIncentives.filter(item => item.gameSubmissionId === selectedSubmission.id);
  }, [allIncentives, selectedSubmission]);

  const handleNewIncentive = useCallback(() => {
    if (!selectedSubmission) return;

    setActiveParentSubmission(selectedSubmission);
    setActiveIncentive(createEmptyIncentive(selectedSubmission));
  }, [selectedSubmission]);

  const [newIncentiveConfirmationPrompt, promptNewIncentive] = useConfirmationPrompt(CONFIRMATION_PROMPT_MESSAGE, handleNewIncentive);

  const handlePromptNewIncentive = useCallback(() => {
    if (activeIncentive === null) {
      handleNewIncentive();
    } else {
      promptNewIncentive();
    }
  }, [handleNewIncentive, promptNewIncentive, activeIncentive]);

  const handleSelectSubmission = useCallback((item: SubmissionWithCategories | null) => setSelectedSubmission(item), []);

  const handleIncentiveSave = useCallback((incentive: IncentiveWithCategories) => {
    const [updatedList, wasUpdated] = allIncentives.reduce<[IncentiveWithCategories[], boolean]>(([acc, updated], item) => {
      if (item.id === incentive.id) return [[...acc, incentive], true];

      return [[...acc, item], updated];
    }, [[], false]);

    if (wasUpdated) {
      onChange(updatedList);
    } else {
      onChange([...updatedList, incentive]);
    }

    setActiveIncentive(null);
  }, [allIncentives, onChange]);

  const handleIncentiveDelete = useCallback((id: string) => {
    fetch(`/api/events/${event.id}/incentives/${id}`, {
      method: 'DELETE',
    });

    setActiveIncentive(null);
    onChange(allIncentives.filter(item => item.id !== id));
  }, [allIncentives, onChange, event.id]);
  
  const handleSelectIncentive = useCallback((incentive: IncentiveWithCategories) => {
    if (!allowIncentives || !selectedSubmission) return;
    
    setActiveParentSubmission(selectedSubmission);
    setActiveIncentive(flattenIncentive(incentive));
  }, [selectedSubmission, allowIncentives]);
  const remainingIncentives = event.maxIncentives - selectedIncentives.length;

  return (
    <>
      {newIncentiveConfirmationPrompt}
      <ExistingSubmissionsColumn expand={!allowIncentives}>
        <Title>My Incentives</Title>
        {!allowIncentives && (
          <div>
            {selectedIncentives.length === 0 && <Alert>You have not submitted any incentives.</Alert>}
            {selectedIncentives.length > 0 && <SubmissionIncentivesList submissions={submissions} allIncentives={allIncentives} />}
          </div>
        )}
        
        {allowIncentives && (
          <ExistingSubmissionsList>
            <SubmissionSelect
              options={submissions}
              onChange={handleSelectSubmission}
              formatOptionLabel={item => item.gameTitle}
              getOptionValue={item => item.gameTitle}
              classNamePrefix="submission-select"
              isClearable={false}
              value={selectedSubmission}
              placeholder="Select a submission."
            />

            {selectedIncentives.map(incentive => (
              <li key={incentive.id}>
                <ExistingSubmissionButton onClick={() => handleSelectIncentive(incentive)}>
                  <ExistingSubmissionInfo>
                    <ExistingSubmissionTitle>{incentive.name}</ExistingSubmissionTitle>
                  </ExistingSubmissionInfo>
                </ExistingSubmissionButton>
              </li>
            ))}
            {submissions.length === 0 && (
              <Alert>You have not submitted anything to {event.eventName}.</Alert>
            )}
            {allowIncentives && selectedSubmission !== null && (
              <AddGameButton onClick={handlePromptNewIncentive} disabled={remainingIncentives === 0}>
                Add incentive ({remainingIncentives} remaining)
              </AddGameButton>
            )}
          </ExistingSubmissionsList>
        )}
      </ExistingSubmissionsColumn>
      {allowIncentives && activeIncentive && (
        <EditorColumn>
          <IncentiveEditor
            submission={activeParentSubmission}
            incentive={activeIncentive}
            onSave={handleIncentiveSave}
            onDelete={handleIncentiveDelete}
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

  & .submission-select__option {
    color: ${SiteConfig.colors.text.dark};
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

const SubmissionSelect = styled(Select<SubmissionWithCategories>)`
  margin-bottom: 1rem;
`;
