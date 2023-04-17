import React, { useCallback } from 'react';
import styled from 'styled-components';
import Select from 'react-select';
import { SchedulableCategory } from '../utils/models';
import { SiteConfig } from '../utils/siteConfig';
import { getUserName } from '../utils/userHelpers';
import { Label } from './layout';

interface UnslottedRunSelectorProps {
  runs: SchedulableCategory[];
  value: SchedulableCategory | null;
  availabilities: Record<string, boolean>
  onChange: (value: SchedulableCategory | null) => void;
}

export const UnslottedRunSelector: React.FC<UnslottedRunSelectorProps> = ({ runs, availabilities, value, onChange }) => {
  const formatOption = useCallback((run: SchedulableCategory) => (
    <OptionContainer className={availabilities[run.id] ? '' : 'unavailable'}>
      <RunOptionInfo>
        <RunOptionTitle>{run.gameSubmission.gameTitle} - {run.categoryName}</RunOptionTitle>
        <RunOptionRunner>{getUserName(run.gameSubmission.user)}</RunOptionRunner>
      </RunOptionInfo>
      <RunOptionDuration>{run.estimate}</RunOptionDuration>
    </OptionContainer>
  ), [availabilities]);
  
  return (
    <SelectorContainer>
      <Label htmlFor="unslotted-selector">Run</Label>
      <Select
        id="unslotted-selector"
        classNamePrefix="selector"
        options={runs}
        value={value}
        formatOptionLabel={formatOption}
        getOptionValue={item => item.id}
        getOptionLabel={item => `${item.categoryName} ${item.gameSubmission.gameTitle} ${getUserName(item.gameSubmission.user)}`}
        onChange={onChange}
        menuPlacement="top"
      />
    </SelectorContainer>
  );
};

const SelectorContainer = styled.div`
  & .selector__option,
  & .selector__menu-list,
  & .selector__value-container {
    padding: 0;
  }
  
  & .selector__input-container  {
    padding: 0.5rem 0.75rem;
  }
`;

const OptionContainer = styled.div`
  display: flex;
  flex-direction: row;
  cursor: pointer;
  padding: 0.25rem;

  &.unavailable {
    background: repeating-linear-gradient(
      45deg,
      rgba(255, 0, 0, 0),
      rgba(255, 0, 0, 0) 10px,
      rgba(255, 0, 0, 0.3) 10px,
      rgba(255, 0, 0, 0.3) 20px
    );
  }

  & + & {
    border-top: 1px solid ${SiteConfig.colors.secondary};
  }
`;

const RunOptionInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  align-self: stretch;
  min-width: 0;
`;

const RunOptionTitle = styled.div`
  font-weight: 700;
`;

const RunOptionRunner = styled.div`
  margin-top: 0.25rem;
`;

const RunOptionDuration = styled.div`
  margin-top: 0.25rem;
  font-size: 700;
`;
