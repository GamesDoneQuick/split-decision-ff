import { Event, GameSubmissionCategory, RunStatus } from '@prisma/client';
import { useSession } from 'next-auth/react';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { POST_SAVE_OPTS, useSaveable } from '../utils/hooks';
import { SubmissionWithCategories } from '../utils/models';
import { SiteConfig } from '../utils/siteConfig';
import { useValidatedState, ValidationSchemas } from '../utils/validation';
import { CategoryEditor } from './CategoryEditor';
import { Button, FormItem, Label, TextInput, Alert, TextAreaInput, SelectInput, ToggleSwitch } from './layout';

interface SubmissionEditorProps {
  event: Event,
  submission: SubmissionWithCategories;
  onSave: (value: SubmissionWithCategories) => void;
  onDelete: (id: string) => void;
}

export const SubmissionEditor: React.FC<SubmissionEditorProps> = ({ event: eventRecord, submission, onSave, onDelete }) => {
  const session = useSession();
  const [validatedSubmission, setSubmissionField] = useValidatedState(submission, ValidationSchemas.GameSubmission);

  const handleDelete = useCallback(() => {
    fetch(`/api/events/${eventRecord.id}/submissions/${submission.id}`, {
      method: 'DELETE',
    });

    onDelete(submission.id);
  }, [onDelete, submission.id, eventRecord.id]);

  const handleUpdateGameTitle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSubmissionField('gameTitle', event.target.value);
  }, [setSubmissionField]);

  const handleUpdatePlatform = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSubmissionField('platform', event.target.value);
  }, [setSubmissionField]);

  const handleUpdatePrimaryGenre = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSubmissionField('primaryGenre', event.target.value);
  }, [setSubmissionField]);

  const handleUpdateSecondaryGenre = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSubmissionField('secondaryGenre', event.target.value);
  }, [setSubmissionField]);

  const handleUpdateDescription = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSubmissionField('description', event.target.value);
  }, [setSubmissionField]);

  const handleUpdateContentWarning = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSubmissionField('contentWarning', event.target.value);
  }, [setSubmissionField]);

  const handleUpdateTechnicalNotes = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSubmissionField('technicalNotes', event.target.value);
  }, [setSubmissionField]);

  const handleUpdateFlashingLights = useCallback((value: boolean) => {
    setSubmissionField('flashingLights', value);
  }, [setSubmissionField]);

  const handleUpdateSoloCommentary = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSubmissionField('soloCommentary', Boolean(event.target.value));
  }, [setSubmissionField]);

  const handleCategoryUpdate = useCallback((value: GameSubmissionCategory, index: number) => {
    setSubmissionField('categories', validatedSubmission.value.categories.reduce<GameSubmissionCategory[]>((acc, category, idx) => [
      ...acc,
      idx === index ? value : category,
    ], []));
  }, [setSubmissionField, validatedSubmission.value.categories]);

  const handleAddCategory = useCallback(() => {
    setSubmissionField('categories', [
      ...validatedSubmission.value.categories,
      {
        id: '',
        categoryName: '',
        videoURL: '',
        estimate: '',
        description: '',
        runStatus: RunStatus.Pending,
        gameSubmissionId: submission?.id ?? '',
        scheduleSlotId: null,
        createdAt: null,
        updatedAt: null,
      },
    ]);
  }, [validatedSubmission.value, setSubmissionField, submission]);

  const handleDeleteCategory = useCallback((index: number) => {
    setSubmissionField('categories', validatedSubmission.value.categories.filter((category, idx) => idx !== index));
  }, [validatedSubmission.value, setSubmissionField]);

  const [save, isSaving, saveError] = useSaveable<SubmissionWithCategories, SubmissionWithCategories>(`/api/events/${eventRecord.id}/submissions`, !validatedSubmission.error, POST_SAVE_OPTS);
  
  const handleSave = useCallback(async () => {
    const response = await save(validatedSubmission.value);

    if (response) onSave(response);
  }, [save, validatedSubmission.value, onSave]);

  const remainingCategories = eventRecord.maxSubmissions - validatedSubmission.value.categories.length;

  if (session.status !== 'authenticated') return null;

  return (
    <Container>
      <Instructions>
        Game Information
        {submission.id && (
          <TitleActions>
            <DeleteSubmissionButton onClick={handleDelete}>Delete</DeleteSubmissionButton>
          </TitleActions>
        )}
      </Instructions>

      {saveError.error && (
        <Alert variant="error">{saveError.message}</Alert>
      )}
      {validatedSubmission.value.categories.length === 0 && (
        <Alert variant="error">You must submit at least one category.</Alert>
      )}
      <FormItem>
        <Label htmlFor="gameTitle">Game Title</Label>
        <TextInput
          id="gameTitle"
          type="text"
          value={validatedSubmission.value.gameTitle}
          error={validatedSubmission.error?.gameTitle}
          maxLength={100}
          onChange={handleUpdateGameTitle}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="platform">Platform</Label>
        <TextInput
          id="platform"
          type="text"
          value={validatedSubmission.value.platform}
          error={validatedSubmission.error?.platform}
          maxLength={100}
          onChange={handleUpdatePlatform}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="primaryGenre">Genre</Label>
        <SelectInput
          id="primaryGenre"
          type="text"
          value={validatedSubmission.value.primaryGenre}
          error={validatedSubmission.error?.primaryGenre}
          onChange={handleUpdatePrimaryGenre}
        >
          {eventRecord.genres.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </FormItem>
      <FormItem>
        <Label htmlFor="secondaryGenre">Subgenre (optional)</Label>
        <SelectInput
          id="secondaryGenre"
          type="text"
          value={validatedSubmission.value.secondaryGenre ?? ''}
          error={validatedSubmission.error?.secondaryGenre}
          onChange={handleUpdateSecondaryGenre}
          helpText="If more than two genres apply to this submission, pick the two that best represent it."
        >
          <option value="">(None)</option>
          {eventRecord.genres.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </SelectInput>
      </FormItem>
      <FormItem>
        <ToggleSwitch
          toggled={validatedSubmission.value.flashingLights}
          onChange={handleUpdateFlashingLights}
        >
          This game contains flashing lights.
        </ToggleSwitch>
      </FormItem>
      <FormItem>
        <Label htmlFor="description">Description</Label>
        <TextAreaInput
          id="description"
          type="text"
          value={validatedSubmission.value.description}
          error={validatedSubmission.error?.description}
          maxLength={1000}
          onChange={handleUpdateDescription}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="contentWarning">Content Warning (optional)</Label>
        <TextInput
          id="contentWarning"
          type="text"
          value={validatedSubmission.value.contentWarning ?? ''}
          error={validatedSubmission.error?.contentWarning}
          maxLength={100}
          onChange={handleUpdateContentWarning}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="technicalNotes">Technical Notes</Label>
        <TextAreaInput
          id="technicalNotes"
          type="text"
          value={validatedSubmission.value.technicalNotes ?? ''}
          error={validatedSubmission.error?.technicalNotes}
          maxLength={1000}
          onChange={handleUpdateTechnicalNotes}
          helpText={`Technical notes are not shown on the public submission list, and are only used by the ${SiteConfig.organizationName} production team.`}
        />
      </FormItem>
      <Separator />
      <Instructions>Commentary</Instructions>
      <CommentaryInstructions>
        <p>
          Commentary is an important part of every Flame Fatales run!
          The Games Committee takes the quality of your commentary into account when
          reviewing your submission. Please select one of the following commentary options for your run:
        </p>

        <p>
          <CommentaryTypeLabel>Community Commentator</CommentaryTypeLabel>
          A commentator of your choosing (who fits the FF Discord criteria) or a
          Frame Fatales Commentary Buddy volunteer – someone from the server who
          will learn your run and join your virtual couch during your run! Having a
          friend can help take the pressure off while you&apos;re on your blazing pace 🔥
          If you choose this option and your chosen commentator ends up unavailable for your
          run, don&apos;t stress, you will get paired up with a Commentary Buddy!
        </p>

        <p>
          <CommentaryTypeLabel>Solo Commentary</CommentaryTypeLabel>
          You want to provide your own commentary for your run. If you want to go solo, we will be
          looking for top-notch commentary on your submission to see if you can bring the heat 🔥
        </p>
      </CommentaryInstructions>
      <FormItem>
        <SelectInput value={validatedSubmission.value.soloCommentary.toString()} onChange={handleUpdateSoloCommentary}>
          <option value="false">Community Commentator</option>
          <option value="true">Solo Commentary</option>
        </SelectInput>
      </FormItem>
      <CategoryList>
        <Instructions>Categories ({validatedSubmission.value.categories.length})</Instructions>
        {validatedSubmission.value.categories.map((category, index) => (
          <CategoryEditor
            key={index}
            category={category}
            onUpdate={value => handleCategoryUpdate(value, index)}
            onDelete={() => handleDeleteCategory(index)}
          />
        ))}
      </CategoryList>
      <FormItem>
        <Button onClick={handleAddCategory} disabled={remainingCategories === 0}>
          Add Category ({remainingCategories} remaining)
        </Button>
      </FormItem>
      <FormItemWithDivider>
        <Button onClick={handleSave} disabled={isSaving || !!validatedSubmission.error}>Save</Button>
      </FormItemWithDivider>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const Instructions = styled.h2`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0.5rem 0;
  font-size: 1.5rem;
`;

const CategoryList = styled.ul`
  list-style: none;
  margin: 1rem 0 0;
  padding: 1rem 0;
  border-top: 1px solid ${SiteConfig.colors.secondary};
`;

const FormItemWithDivider = styled(FormItem)`
  border-top: 1px solid ${SiteConfig.colors.secondary};
  padding-top: 1rem;
  margin-top: 1rem;
`;

const TitleActions = styled.div`
  margin-left: auto;
`;

const DeleteSubmissionButton = styled(Button)`
  width: unset;
  margin-left: auto;
  font-size: 1.25rem;
  margin: 0;
`;

const Separator = styled.div`
  display: block; 
  width: 100%;
  height: 1px;
  background-color: ${SiteConfig.colors.secondary};
  margin: 0.5rem 0;
`;

const CommentaryInstructions = styled.p`
  line-height: 1.2;
  font-size: 1rem;
  margin-top: 0;
`;

const CommentaryTypeLabel = styled.h4`
  font-weight: 700;
  margin: 0 0 0.125rem;
  font-size: 1.125rem;
`;
