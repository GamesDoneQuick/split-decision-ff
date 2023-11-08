import { GameSubmissionCategory } from '@prisma/client';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { SiteConfig } from '../utils/siteConfig';
import { useValidatedState, ValidationSchemas } from '../utils/validation';
import { Alert, Button, FormItem, Label, TextAreaInput, TextInput, ToggleSwitch } from './layout';
import { stringDurationToSeconds } from '../utils/durationHelpers';

const LONG_RUN_WARNING_THRESHOLD_S = 3600 * 3.5;

interface CategoryEditorProps {
  category: GameSubmissionCategory;
  onDelete: () => void;
  onUpdate: (value: GameSubmissionCategory) => void;
}

export const CategoryEditor: React.FC<CategoryEditorProps> = ({ category, onDelete, onUpdate }) => {
  const [validatedCategory, setCategoryField] = useValidatedState(category, ValidationSchemas.GameSubmissionCategory);

  const handleUpdate = useCallback((field: keyof GameSubmissionCategory, newValue: GameSubmissionCategory[typeof field]) => {
    onUpdate(setCategoryField(field, newValue));
  }, [onUpdate, setCategoryField]);

  const handleUpdateCategoryName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleUpdate('categoryName', event.target.value);
  }, [handleUpdate]);

  const handleUpdateVideoURL = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleUpdate('videoURL', event.target.value);
  }, [handleUpdate]);
  
  const handleUpdateEstimate = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleUpdate('estimate', event.target.value);
  }, [handleUpdate]);

  const handleUpdateDescription = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleUpdate('description', event.target.value);
  }, [handleUpdate]);

  const handleUpdateCoop = useCallback((value: boolean) => {
    handleUpdate('isCoop', value);
  }, [handleUpdate]);

  const isRunLong = stringDurationToSeconds(validatedCategory.value.estimate) >= LONG_RUN_WARNING_THRESHOLD_S;
  
  return (
    <CategoryContainer>
      <FormItem>
        <Label htmlFor="categoryName">Category Name</Label>
        <TextInput
          id="categoryName"
          type="text"
          value={validatedCategory.value.categoryName}
          error={validatedCategory.error?.categoryName}
          maxLength={100}
          onChange={handleUpdateCategoryName}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="videoURL">Video URL</Label>
        <TextInput
          id="videoURL"
          type="text"
          value={validatedCategory.value.videoURL}
          error={validatedCategory.error?.videoURL}
          maxLength={2048}
          onChange={handleUpdateVideoURL}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="estimate">Estimate</Label>
        <TextInput
          id="estimate"
          type="text"
          value={validatedCategory.value.estimate}
          error={validatedCategory.error?.estimate}
          maxLength={8}
          onChange={handleUpdateEstimate}
        />
      </FormItem>
      {isRunLong && (
        <ConditionalAlert variant="warning">
          Heads up! We are not a 24/7 event and longer runs may be difficult to accommodate.
        </ConditionalAlert>
      )}
      <FormItem>
        <Label htmlFor="description">Description</Label>
        <TextAreaInput
          id="description"
          type="text"
          value={validatedCategory.value.description}
          error={validatedCategory.error?.description}
          maxLength={1000}
          onChange={handleUpdateDescription}
        />
      </FormItem>
      <FormItem>
        <ToggleSwitch
          toggled={validatedCategory.value.isCoop}
          onChange={handleUpdateCoop}
        >
          This run is co-op or a race.
        </ToggleSwitch>
      </FormItem>
      {validatedCategory.value.isCoop && (
        <ConditionalAlert variant="warning">
          Both runners must submit this category or else the submission will not be considered.
        </ConditionalAlert>
      )}
      <DeleteCategoryButton variant="danger" onClick={onDelete}>Delete</DeleteCategoryButton>
    </CategoryContainer>
  );
};

const CategoryContainer = styled.div`
  display: flex;
  flex-direction: column;

  & + & {
    margin: 1rem 0 0;
    padding 1rem 0;
    border-top: 1px solid ${SiteConfig.colors.secondary};
  }
`;

const DeleteCategoryButton = styled(Button)`
  width: unset;
  margin-left: auto;
  margin-top: 0.5rem;
  font-size: 1.25rem;
`;

const ConditionalAlert = styled(Alert)`
  margin-top: 1rem;
`;
