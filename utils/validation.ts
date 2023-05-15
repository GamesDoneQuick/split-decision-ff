import { useCallback, useEffect, useState } from 'react';
import { GameSubmission, GameSubmissionCategory, RunIncentive, User, VettingInfo } from '@prisma/client';
import Joi from 'joi';
import { EventWithCommitteeMemberIdsAndNames, EventWithStringDates, IncentiveWithCategoryIds } from './models';

const TIMESTAMP_REGEX = /^(?:(?:([0-9]*?\d|2[0-9]):)?([0-5]\d):)([0-5]\d)$/;

export function isTimestampValid(value: string) {
  return value.match(TIMESTAMP_REGEX) !== null;
}

const GameSubmissionCategoryValidationSchema = Joi.object<GameSubmissionCategory>({
  categoryName: Joi.string().required().max(100).messages({
    'string.empty': 'Category name is required.',
    'string.max': 'Category name cannot be longer than 100 characters.',
  }),
  videoURL: Joi.string().required().uri().max(2048).messages({
    'string.empty': 'Video link is required.',
    'string.uri': 'Video link must be a valid URL.',
    'string.max': 'Video link cannot be longer than 100 characters.',
  }),
  estimate: Joi.string().required().pattern(TIMESTAMP_REGEX).messages({
    'string.empty': 'Estimate is required.',
    'string.pattern.base': 'Estimate must be in the format MM:SS, H:MM:SS, or HH:MM:SS',
  }),
  description: Joi.string().required().max(1000).messages({
    'string.empty': 'Description is required.',
    'string.max': 'Description cannot be longer than 1,000 characters.',
  }),
}).unknown(true);

const IncentiveValidationSchemaRules = {
  name: Joi.string().required().max(100).messages({
    'string.empty': 'Incentive name is required.',
    'string.max': 'Incentive name cannot be longer than 100 characters.',
  }),
  videoURL: Joi.string().allow('').uri().max(2048).messages({
    'string.empty': 'Video link is required.',
    'string.uri': 'Video link must be a valid URL.',
    'string.max': 'Video link cannot be longer than 100 characters.',
  }),
  estimate: Joi.string().required().pattern(TIMESTAMP_REGEX).messages({
    'string.empty': 'Estimate is required.',
    'string.pattern.base': 'Estimate must be in the format MM:SS, H:MM:SS, or HH:MM:SS',
  }),
  description: Joi.string().required().max(1000).messages({
    'string.empty': 'Description is required.',
    'string.max': 'Description cannot be longer than 1,000 characters.',
  }),
  closeTime: Joi.string().required().max(250).messages({
    'string.empty': 'Close time is required.',
    'string.max': 'Close time cannot be longer than 250 characters.',
  }),
};

export const ValidationSchemas = {
  User: Joi.object<User>({
    displayName: Joi.string().allow('').max(50).allow(null).messages({
      'string.max': 'Display name cannot be longer than 50 characters.',
    }),
    email: Joi.string().email({ tlds: { allow: false } }).max(100).messages({
      'string.email': 'Please enter a valid email.',
      'string.max': 'Email cannot be longer than 100 characters.',
    }),
    showPronouns: Joi.boolean(),
    pronouns: Joi.string().allow('').allow(null).max(50).messages({
      'string.max': 'Pronouns cannot be longer than 50 characters.',
    }),
  }).unknown(true),
  VettingInfo: Joi.object<VettingInfo>({
    twitterAccounts: Joi.string().max(1000).messages({
      'string.empty': 'You must provide your Twitter accounts or write "none".',
    }),
    twitchAccounts: Joi.string().max(1000).messages({
      'string.empty': 'You must provide your Twitch accounts or write "none".',
    }),
  }).unknown(true),
  Event: Joi.object<EventWithStringDates<EventWithCommitteeMemberIdsAndNames>>({
    eventName: Joi.string().required().messages({ 'string.empty': 'Event name is required.' }),
    gameSubmissionPeriodStart: Joi.string().required().isoDate().messages({
      'string.empty': 'Submission period start date is required.',
      'string.isoDate': 'Submission period start date must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SS)',
    }),
    gameSubmissionPeriodEnd: Joi.string().required().isoDate().messages({
      'string.empty': 'Submission period end date is required.',
      'string.isoDate': 'Submission period end date must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SS)',

    }),
    eventStart: Joi.string().required().isoDate().messages({
      'string.empty': 'Event start date is required.',
      'string.isoDate': 'Event start date must be a valid ISO 8601 date (YYYY-MM-DDTHH:MM:SS)',
    }),
    eventDays: Joi.number().required().min(1).messages({
      'number.required': 'Event length is required.',
      'number.min': 'Event length must be at least 1.',
    }),
    startTime: Joi.number().required().min(0).max(24).messages({
      'number.required': 'Event start time is required.',
      'number.min': 'Event start time must be at least 0.',
      'number.max': 'Event start time must be under 25.',
    }),
    endTime: Joi.number().required().min(0).max(24).messages({
      'number.required': 'Event end time is required.',
      'number.min': 'Event end time must be at least 0.',
      'number.max': 'Event end time must be under 25.',
    }),
    maxSubmissions: Joi.number().required().min(1).messages({
      'number.required': 'Max submissions is required.',
      'number.min': 'Max submissions must be at least 1.',
    }),
    maxCategories: Joi.number().required().min(1).messages({
      'number.required': 'Max categories is required.',
      'number.min': 'Max categories must be at least 1.',
    }),
    genres: Joi.array().items(Joi.string()).min(1).messages({
      'array.min': 'At least one genre must be specified',
    }),
    committeeDiscordChannelId: Joi.string().allow('').allow(null),
    visible: Joi.boolean(),
  }).unknown(true),
  GameSubmissionCategory: GameSubmissionCategoryValidationSchema,
  RunIncentive: Joi.object<RunIncentive>({ ...IncentiveValidationSchemaRules }).unknown(true),
  RunIncentiveWithCategoryIds: Joi.object<IncentiveWithCategoryIds>({
    ...IncentiveValidationSchemaRules,
    attachedCategories: Joi.array().items(Joi.string()).min(1).messages({
      'array.min': 'At least one category must be selected',
    }),
  }).unknown(true),
  GameSubmission: Joi.object<GameSubmission & { categories: GameSubmissionCategory[] }>({
    gameTitle: Joi.string().required().max(100).messages({
      'string.empty': 'Game title is required.',
      'string.max': 'Game title cannot be longer than 100 characters.',
    }),
    platform: Joi.string().required().max(100).messages({
      'string.empty': 'Platform is required.',
      'string.max': 'Platform cannot be longer than 100 characters.',
    }),
    primaryGenre: Joi.string().required().messages({
      'string.empty': 'Genre is required.',
      'string.max': 'Genre cannot be longer than 100 characters.',
    }),
    secondaryGenre: Joi.string().allow('').messages({
      'string.max': 'Genre cannot be longer than 100 characters.',
    }),
    description: Joi.string().required().max(1000).messages({
      'string.empty': 'Description is required.',
      'string.max': 'Description cannot be longer than 1,000 characters.',
    }),
    technicalNotes: Joi.string().allow('').max(1000).messages({
      'string.max': 'Description cannot be longer than 1,000 characters.',
    }),
    contentWarning: Joi.string().allow('').max(100).messages({
      'string.max': 'Content warning cannot be longer than 100 characters.',
    }),
    flashingLights: Joi.boolean(),
    categories: Joi.array().items(GameSubmissionCategoryValidationSchema).min(1),
  }).unknown(true),
};

type UseValidatedStateReturnValue<T> = [
  { value: T; error: Record<string, string> | undefined},
  (field: keyof T, newValue: T[typeof field]) => T,
  (newValue: T) => void,
];
  
export function useValidatedState<T extends Record<string, unknown>>(value: T, validator: Joi.ObjectSchema<T>): UseValidatedStateReturnValue<T> {
  const getValidatedResult = useCallback((newValue: T) => {
    const { error } = validator.validate(newValue, { abortEarly: false });

    const mappedErrorResults = error ? error.details.reduce((acc, { path, message }) => ({
      ...acc,
      [path.join('.')]: message,
    }), {}) : undefined;

    return {
      value: newValue,
      error: mappedErrorResults,
    };
  }, [validator]);
  
  const [state, setState] = useState(getValidatedResult(value));

  const updateState = useCallback((newValue: T) => {
    setState(getValidatedResult(newValue));
  }, [getValidatedResult]);

  const updateField = useCallback(<U extends keyof T>(field: U, newValue: T[U]) => {
    const updatedValue = {
      ...state.value,
      [field]: newValue,
    };

    updateState(updatedValue);

    return updatedValue;
  }, [updateState, state.value]);

  useEffect(() => {
    // Watch changes to the input value in case the prop value changes.
    setState(getValidatedResult(value));
  }, [value, getValidatedResult]);

  return [state, updateField, updateState];
}
