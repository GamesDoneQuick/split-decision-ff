import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Async from 'react-select/async';
import styled from 'styled-components';
import { User } from '@prisma/client';
import { EventWithCommitteeMemberIdsAndNames, EventWithStringDates, PublicUserData } from '../utils/models';
import { forceAsString } from '../utils/eventHelpers';
import { POST_SAVE_OPTS, useSaveable } from '../utils/hooks';
import { useValidatedState, ValidationSchemas } from '../utils/validation';
import { Button, FormItem, Label, TextInput, Alert, ToggleSwitch } from './layout';
import { SiteConfig } from '../utils/siteConfig';
import { useConfirmationPrompt } from '../utils/ConfirmationPrompt';

const DELETE_PROPMT_MESSAGE = 'Are you sure you want to delete this event? This cannot be undone!';

async function fetchCommitteeOptions(query: string) {
  const response = await fetch(`/api/user/search?query=${encodeURIComponent(query)}`);

  return (await response.json()).map((record: User) => ({
    id: record.id,
    name: record.name,
  }));
}

type NormalizedEditorEvent = EventWithStringDates<EventWithCommitteeMemberIdsAndNames>;

function stringifyEvent(event: EventWithCommitteeMemberIdsAndNames): NormalizedEditorEvent {
  return {
    ...event,
    gameSubmissionPeriodStart: forceAsString(event.gameSubmissionPeriodStart),
    gameSubmissionPeriodEnd: forceAsString(event.gameSubmissionPeriodEnd),
    incentiveSubmissionPeriodEnd: forceAsString(event.incentiveSubmissionPeriodEnd),
    eventStart: forceAsString(event.eventStart),
  };
}
interface EventEditorProps {
  event: EventWithCommitteeMemberIdsAndNames,
  onSave: (value: EventWithStringDates<EventWithCommitteeMemberIdsAndNames>) => void;
  onDelete: (id: string) => void;
}

export const EventEditor: React.FC<EventEditorProps> = ({ event: eventRecord, onSave, onDelete }) => {
  const session = useSession();
  const stringifiedEvent = useMemo(() => stringifyEvent(eventRecord), [eventRecord]);

  const [validatedEvent, setEventField] = useValidatedState<NormalizedEditorEvent>(stringifiedEvent, ValidationSchemas.Event);
  const [rawGenreList, setRawGenreList] = useState(eventRecord.genres.join(', '));
  const handleDelete = useCallback(() => {
    fetch(`/api/events/${eventRecord.id}`, {
      method: 'DELETE',
    });

    onDelete(eventRecord.id);
  }, [onDelete, eventRecord.id]);

  const [deletePrompt, promptDeletion] = useConfirmationPrompt(DELETE_PROPMT_MESSAGE, handleDelete);

  const handleUpdateEventName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('eventName', event.target.value);
  }, [setEventField]);

  const handleUpdateSubmissionPeriodStart = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('gameSubmissionPeriodStart', event.target.value);
  }, [setEventField]);

  const handleUpdateSubmissionPeriodEnd = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('gameSubmissionPeriodEnd', event.target.value);
  }, [setEventField]);

  const handleUpdateIncentivePeriodEnd = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('incentiveSubmissionPeriodEnd', event.target.value);
  }, [setEventField]);

  const handleUpdateEventStart = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('eventStart', event.target.value);
  }, [setEventField]);

  const handleUpdateCommitteeDiscordChannelId = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('committeeDiscordChannelId', event.target.value);
  }, [setEventField]);

  const handleUpdateMaxSubmissions = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('maxSubmissions', Number(event.target.value));
  }, [setEventField]);

  const handleUpdateMaxCategories = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('maxCategories', Number(event.target.value));
  }, [setEventField]);
  
  const handleUpdateEventDays = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('eventDays', Number(event.target.value));
  }, [setEventField]);
  
  const handleUpdateStartTime = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('startTime', Number(event.target.value));
  }, [setEventField]);
  
  const handleUpdateEndItem = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setEventField('endTime', Number(event.target.value));
  }, [setEventField]);
  
  const handleUpdateVisible = useCallback((value: boolean) => {
    setEventField('visible', value);
  }, [setEventField]);

  const handleUpdateRunStatusVisible = useCallback((value: boolean) => {
    setEventField('runStatusVisible', value);
  }, [setEventField]);

  const handleUpdateCommittee = useCallback((value: readonly PublicUserData[]) => {
    setEventField('committeeMembers', [...value]);
  }, [setEventField]);

  const handleUpdateGenreList = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;

    setEventField('genres', newValue.split(',').map(value => value.trim()));
    setRawGenreList(newValue);
  }, [setEventField]);

  const [save, isSaving, saveError] = useSaveable<NormalizedEditorEvent, EventWithStringDates<EventWithCommitteeMemberIdsAndNames>>('/api/events', !validatedEvent.error, POST_SAVE_OPTS);
  
  const handleSave = useCallback(async () => {
    const response = await save(validatedEvent.value);

    if (response) onSave(response);
  }, [save, validatedEvent.value, onSave]);

  useEffect(() => {
    // Rehydrate genre list on event selection
    setRawGenreList(eventRecord.genres.join(', '));
  }, [eventRecord]);

  if (session.status !== 'authenticated') return null;

  return (
    <Container>
      {deletePrompt}
      <Instructions>
        Event Information
        {eventRecord.id && (
          <TitleActions>
            <EventLink href={`/api/events/${eventRecord.id}/download`} target="_blank" rel="noopener noreferrer">
              <EventAction>
                Export CSV
              </EventAction>
            </EventLink>
            <EventAction variant="danger" onClick={promptDeletion}>Delete</EventAction>
          </TitleActions>
        )}
      </Instructions>

      {saveError.error && (
        <Alert variant="error">{saveError.message}</Alert>
      )}
      <FormItem>
        <Label htmlFor="eventName">Event Name</Label>
        <TextInput
          id="eventName"
          type="text"
          value={validatedEvent.value.eventName}
          error={validatedEvent.error?.eventName}
          onChange={handleUpdateEventName}
        />
      </FormItem>
      <FormItem>
        <ToggleSwitch
          toggled={validatedEvent.value.visible}
          onChange={handleUpdateVisible}
        >
          Visible
        </ToggleSwitch>
      </FormItem>
      <FormItem>
        <Label htmlFor="eventStart">Event Start Date</Label>
        <TextInput
          id="eventStart"
          type="text"
          value={validatedEvent.value.eventStart}
          error={validatedEvent.error?.eventStart}
          onChange={handleUpdateEventStart}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="eventDays">Event Duration (Days)</Label>
        <TextInput
          id="eventDays"
          type="number"
          value={validatedEvent.value.eventDays}
          error={validatedEvent.error?.eventDays}
          onChange={handleUpdateEventDays}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="startTime">Start Time (0-24 EST)</Label>
        <TextInput
          id="startTime"
          type="number"
          value={validatedEvent.value.startTime}
          error={validatedEvent.error?.startTime}
          onChange={handleUpdateStartTime}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="endTime">End Time (0-24 EST)</Label>
        <TextInput
          id="endTime"
          type="number"
          value={validatedEvent.value.endTime}
          error={validatedEvent.error?.endTime}
          onChange={handleUpdateEndItem}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="gameSubmissionPeriodStart">Game Submission Period Start (UTC)</Label>
        <TextInput
          id="gameSubmissionPeriodStart"
          type="text"
          value={validatedEvent.value.gameSubmissionPeriodStart}
          error={validatedEvent.error?.gameSubmissionPeriodStart}
          onChange={handleUpdateSubmissionPeriodStart}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="gameSubmissionPeriodEnd">Game Submission Period End (UTC)</Label>
        <TextInput
          id="gameSubmissionPeriodEnd"
          type="text"
          value={validatedEvent.value.gameSubmissionPeriodEnd}
          error={validatedEvent.error?.gameSubmissionPeriodEnd}
          onChange={handleUpdateSubmissionPeriodEnd}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="incentiveSubmissionPeriodEnd">Incentive Submission Period End (UTC)</Label>
        <TextInput
          id="incentiveSubmissionPeriodEnd"
          type="text"
          value={validatedEvent.value.incentiveSubmissionPeriodEnd}
          error={validatedEvent.error?.incentiveSubmissionPeriodEnd}
          onChange={handleUpdateIncentivePeriodEnd}
        />
      </FormItem>
      <FormItem>
        <ToggleSwitch
          toggled={validatedEvent.value.runStatusVisible}
          onChange={handleUpdateRunStatusVisible}
        >
          Publicly Show Acceptance Status
        </ToggleSwitch>
      </FormItem>
      <FormItem>
        <Label htmlFor="genreList">Genres (comma-separated)</Label>
        <TextInput
          id="genreList"
          type="text"
          value={rawGenreList}
          error={validatedEvent.error?.genres}
          onChange={handleUpdateGenreList}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="maxSubmissions">Max Submissions</Label>
        <TextInput
          id="maxSubmissions"
          type="number"
          value={validatedEvent.value.maxSubmissions}
          error={validatedEvent.error?.maxSubmissions}
          onChange={handleUpdateMaxSubmissions}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="maxCategories">Max Categories</Label>
        <TextInput
          id="maxCategories"
          type="number"
          value={validatedEvent.value.maxCategories}
          error={validatedEvent.error?.maxCategories}
          onChange={handleUpdateMaxCategories}
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="committeeMembers">Committee Members</Label>
        <Async<PublicUserData, true>
          id="committeeMembers"
          cacheOptions
          loadOptions={fetchCommitteeOptions}
          getOptionLabel={user => user.name || ''}
          getOptionValue={user => user.id}
          value={validatedEvent.value.committeeMembers}
          classNamePrefix="selector"
          onChange={handleUpdateCommittee}
          isMulti
        />
      </FormItem>
      <FormItem>
        <Label htmlFor="committeeDiscordChannelId">Committee Discord Channel ID</Label>
        <TextInput
          id="committeeDiscordChannelId"
          value={validatedEvent.value.committeeDiscordChannelId || ''}
          error={validatedEvent.error?.committeeDiscordChannelId}
          onChange={handleUpdateCommitteeDiscordChannelId}
        />
      </FormItem>
      <FormItemWithDivider>
        <Button onClick={handleSave} disabled={isSaving || !!validatedEvent.error}>Save</Button>
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

const FormItemWithDivider = styled(FormItem)`
  border-top: 1px solid ${SiteConfig.colors.secondary};
  padding-top: 1rem;
`;

const TitleActions = styled.div`
  margin-left: auto;
`;

const EventAction = styled(Button)`
  width: unset;
  margin-left: auto;
  font-size: 1.25rem;
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
