import { useSession } from 'next-auth/react';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import Select from 'react-select';
import { GameSubmissionCategory } from '@prisma/client';
import { useSaveable } from '../utils/hooks';
import { IncentiveWithCategories, IncentiveWithCategoryIds, SubmissionWithCategories } from '../utils/models';
import { SiteConfig } from '../utils/siteConfig';
import { useValidatedState, ValidationSchemas } from '../utils/validation';
import { Alert, Button, FormItem, HelpText, InputError, Label, TextAreaInput, TextInput } from './layout';

const SAVE_OPTS = {
  requestOptions: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  },
};

function mapCategories(submission: SubmissionWithCategories, categoryIds: string[]): GameSubmissionCategory[] {
  return categoryIds
    .map(id => submission.categories.find(category => category.id === id))
    .filter(item => item !== undefined) as GameSubmissionCategory[];
}

interface IncentiveEditorProps {
  submission: SubmissionWithCategories;
  incentive: IncentiveWithCategoryIds;
  onDelete: (id: string) => void;
  onSave: (value: IncentiveWithCategories) => void;
}

export const IncentiveEditor: React.FC<IncentiveEditorProps> = ({ submission, incentive, onDelete, onSave }) => {
  const session = useSession();

  const [validatedIncentive, setIncentiveField] = useValidatedState(incentive, ValidationSchemas.RunIncentiveWithCategoryIds);
  const selectedCategories = useMemo<GameSubmissionCategory[]>(() => mapCategories(submission, validatedIncentive.value.attachedCategories), [submission, validatedIncentive.value.attachedCategories]);
  
  const handleUpdateName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setIncentiveField('name', event.target.value);
  }, [setIncentiveField]);

  const handleUpdateVideoURL = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setIncentiveField('videoURL', event.target.value);
  }, [setIncentiveField]);
  
  const handleUpdateEstimate = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setIncentiveField('estimate', event.target.value);
  }, [setIncentiveField]);

  const handleUpdateCloseTime = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setIncentiveField('closeTime', event.target.value);
  }, [setIncentiveField]);

  const handleUpdateDescription = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIncentiveField('description', event.target.value);
  }, [setIncentiveField]);

  const handleUpdateCategories = useCallback((options: readonly GameSubmissionCategory[]) => {
    const categoryIds = options.map(item => item.id);

    setIncentiveField('attachedCategories', categoryIds);
  }, [setIncentiveField]);
  
  const [save, isSaving, saveError] = useSaveable<IncentiveWithCategoryIds, IncentiveWithCategories>('/api/submissions/incentives', !validatedIncentive.error, SAVE_OPTS);
  
  const handleSave = useCallback(async () => {
    const response = await save(validatedIncentive.value);

    if (response) onSave(response);
  }, [save, validatedIncentive.value, onSave]);

  if (session.status !== 'authenticated') return null;

  return (
    <CategoryContainer>
      {saveError.error && (
        <Alert variant="error">{saveError.message}</Alert>
      )}
      <FormItem>
        <Label htmlFor="name">Name</Label>
        <TextInput
          id="name"
          type="text"
          value={validatedIncentive.value.name}
          error={validatedIncentive.error?.name}
          maxLength={100}
          onChange={handleUpdateName}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="videoURL">Video URL</Label>
        <TextInput
          id="videoURL"
          type="text"
          value={validatedIncentive.value.videoURL}
          error={validatedIncentive.error?.videoURL}
          maxLength={2048}
          onChange={handleUpdateVideoURL}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="estimate">Estimate</Label>
        <TextInput
          id="estimate"
          type="text"
          value={validatedIncentive.value.estimate}
          error={validatedIncentive.error?.estimate}
          maxLength={8}
          onChange={handleUpdateEstimate}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="closeTime">Incentive Deadline</Label>
        <TextInput
          id="closeTime"
          type="text"
          value={validatedIncentive.value.closeTime}
          error={validatedIncentive.error?.closeTime}
          maxLength={500}
          onChange={handleUpdateCloseTime}
        />
        <HelpText dark>The point during the run where the games committee needs to close the incentive.</HelpText>
      </FormItem>
      <FormItem>
        <Label htmlFor="description">Description</Label>
        <TextAreaInput
          id="description"
          type="text"
          value={validatedIncentive.value.description}
          error={validatedIncentive.error?.description}
          maxLength={1000}
          onChange={handleUpdateDescription}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="categories">Relevant Categories</Label>
        <Select
          options={submission.categories}
          onChange={handleUpdateCategories}
          value={selectedCategories}
          formatOptionLabel={option => option.categoryName}
          getOptionValue={option => option.categoryName}
          isMulti
        />
        {validatedIncentive.error?.attachedCategories && <InputError>{validatedIncentive.error.attachedCategories}</InputError>}
      </FormItem>
      <FormItemWithDivider>
        <Button onClick={handleSave} disabled={isSaving || !!validatedIncentive.error}>Save</Button>
        <DeleteCategoryButton variant="danger" onClick={() => onDelete(validatedIncentive.value.id)}>Delete</DeleteCategoryButton>
      </FormItemWithDivider>
    </CategoryContainer>
  );
};

const CategoryContainer = styled.div`
  display: flex;
  flex-direction: column;

  & + & {
    margin: 1rem 0 0;
    padding 1rem 0;
    border-top: 1px solid ${SiteConfig.colors.accents.separator};
  }
`;

const DeleteCategoryButton = styled(Button)`
  width: unset;
  margin-left: auto;
  margin-top: 0.5rem;
  font-size: 1.25rem;
`;

const FormItemWithDivider = styled(FormItem)`
  border-top: 1px solid ${SiteConfig.colors.accents.separator};
  padding-top: 1rem;
  margin-top: 1rem;
`;