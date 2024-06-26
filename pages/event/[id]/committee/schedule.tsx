import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { NextPage, NextPageContext } from 'next';
import { Event, RunStatus, ScheduledRun } from '@prisma/client';
import { add, differenceInSeconds, isAfter, isBefore, set, startOfDay } from 'date-fns';
import { EventWithCommitteeMemberIdsAndNames, fetchServerSession, prepareAllRecordsForTransfer, SchedulableCategory } from '../../../../utils/models';
import { fetchEventWithCommitteeMemberIdsAndNames } from '../../../../utils/dbHelpers';
import { isMemberOfCommittee } from '../../../../utils/eventHelpers';
import { CommitteeToolbar } from '../../../../components/CommitteeToolbar';
import { Alert, Button, FormItem, Label, TextInput } from '../../../../components/layout';
import { prisma } from '../../../../utils/db';
import { availabilitySlotsToRawSegments, secondsToStringDuration, stringDurationToSeconds } from '../../../../utils/durationHelpers';
import { CalendarSpan, CalendarView } from '../../../../components/CalendarView';
import { SiteConfig } from '../../../../utils/siteConfig';
import { mapById } from '../../../../utils/collectionHelpers';
import { getUserName } from '../../../../utils/userHelpers';
import { isTimestampValid } from '../../../../utils/validation';
import { POST_SAVE_OPTS, useSaveable } from '../../../../utils/hooks';
import { UnslottedRunSelector } from '../../../../components/UnslottedRunSelector';
import { pluralizeWithValue } from '../../../../utils/humanize';

type ScheduledRunWithCategory = ScheduledRun & { category: SchedulableCategory | null };

function createNewSlottedRun(category: SchedulableCategory, setupTime = '0:10:00'): ScheduledRunWithCategory {
  return {
    id: '',
    eventId: '',
    categoryId: category.id,
    category,
    nextRunId: null,
    setupTime,
    isInterstitial: false,
    interstitialName: null,
    createdAt: null,
    updatedAt: null,
  };
}

function createNewInterstitial(name: string, setupTime = '0:10:00'): ScheduledRunWithCategory {
  return {
    id: '',
    eventId: '',
    categoryId: null,
    category: null,
    nextRunId: null,
    setupTime,
    isInterstitial: true,
    interstitialName: name,
    createdAt: null,
    updatedAt: null,
  };
}

function isRunAvailabiltyValid(run: SchedulableCategory, runStart: Date, rawSetupTime?: string) {
  const slots = run.gameSubmission.user.eventAvailabilities[0];

  if (!slots) return false;

  const segments = availabilitySlotsToRawSegments(slots);

  const setupTime = rawSetupTime ? stringDurationToSeconds(rawSetupTime) : 0;
  const runEnd = add(runStart, { seconds: stringDurationToSeconds(run.estimate) + setupTime });

  return segments.some(segment => isAfter(runStart, segment.start) && isBefore(runEnd, segment.end));
}

function getSlotLabel(slot: CalendarSpan<ScheduledRunWithCategory>) {
  if (!slot.data) return '?';

  if (slot.data.isInterstitial) return `${slot.data.interstitialName || 'Unnamed interstitial'} (${slot.data.setupTime})`;
  
  if (!slot.data.category) return 'Unknown run';

  return (
    <SlotLabel>
      <SlotGameTitle>
        {slot.data.category.gameSubmission.gameTitle}
        <SlotDuration>
          {slot.data.category.estimate}
          <SlotSetupTime>Setup: {slot.data.setupTime}</SlotSetupTime>
        </SlotDuration>
      </SlotGameTitle>
      <SlotDetails>
        {slot.data.category.categoryName}
      </SlotDetails>
      <SlotDetails>
        {getUserName(slot.data.category.gameSubmission.user)}
      </SlotDetails>
    </SlotLabel>
  );
}

function getScheduledRunLength(scheduledRun: ScheduledRunWithCategory) {
  const setupTime = stringDurationToSeconds(scheduledRun.setupTime);

  if (!scheduledRun.category) return setupTime;

  return setupTime + stringDurationToSeconds(scheduledRun.category.estimate);
}

function getScheduleFromCategoryList(event: Event, scheduledRuns: ScheduledRun[], categories: SchedulableCategory[]) {
  const schedule = [];

  const categoriesById = mapById(categories);
  const runsById = mapById(scheduledRuns);

  let nextId = event.firstRunId;
  
  while (nextId !== null) {
    const nextRun = runsById[nextId];

    if (!nextRun) break;

    // hydrate category
    schedule.push({
      ...nextRun,
      category: nextRun.categoryId ? categoriesById[nextRun.categoryId] : null,
    });

    nextId = nextRun.nextRunId;
  }

  return schedule;
}

function convertScheduledRunsToCalendarItems(start: Date, currentSchedule: ScheduledRunWithCategory[]): CalendarSpan<ScheduledRunWithCategory>[] {
  const result = [];
    
  let currentTime = start;

  let currentRun: ScheduledRunWithCategory | null = currentSchedule[0];
  let currentIndex = 0;

  while (currentRun) {
    const endOfRun = add(currentTime, { seconds: getScheduledRunLength(currentRun) });
    
    result.push({
      start: currentTime,
      end: endOfRun,
      data: currentRun,
    });
    
    currentTime = endOfRun;
    currentRun = currentSchedule[currentIndex + 1];
    currentIndex += 1;
  }

  return result;
}

interface SchedulerProps {
  event: EventWithCommitteeMemberIdsAndNames;
  categories: SchedulableCategory[];
  scheduledRuns: ScheduledRun[];
}

const Scheduler: NextPage<SchedulerProps> = ({ event, categories, scheduledRuns }) => {
  const [currentSchedule, setCurrentSchedule] = useState<ScheduledRunWithCategory[]>(() => getScheduleFromCategoryList(event, scheduledRuns, categories));
  const [selectedInsertionPoint, setSelectedInsertionPoint] = useState<ScheduledRun | null>(currentSchedule[currentSchedule.length - 1]);
  const [selectedPendingRun, setSelectedPendingRun] = useState<SchedulableCategory | null>(null);
  const [runSetupTime, setRunSetupTime] = useState('0:10:00');
  const [interstitialLength, setInterstitialLength] = useState('0:10:00');
  const [interstitialName, setInterstitialName] = useState('');
  const [isRunSetupTimeValid, setIsRunSetupTimeValid] = useState(true);
  const [isInterstitialLengthValid, setIsInterstitialLengthValid] = useState(true);

  const startDate = useMemo(() => add(startOfDay(new Date(event.eventStart)), { hours: event.startTime }), [event.eventStart, event.startTime]);
  const endDate = useMemo(() => add(new Date(event.eventStart), { days: event.eventDays }), [event.eventStart, event.eventDays]);
  
  const unslottedRuns = useMemo(() => {
    const slottedCategories = currentSchedule.map(item => item.categoryId);

    return categories.filter(category => slottedCategories.indexOf(category.id) === -1);
  }, [currentSchedule, categories]);

  const calendarItems = useMemo(() => convertScheduledRunsToCalendarItems(startDate, currentSchedule), [startDate, currentSchedule]);

  const insertionPointStart = useMemo(() => {
    if (!selectedInsertionPoint) return startDate;

    const matchingItem = calendarItems.find(item => item.data === selectedInsertionPoint);

    if (!matchingItem) return startDate;

    return matchingItem.end;
  }, [calendarItems, selectedInsertionPoint, startDate]);

  const unslottedRunAvailabilityStatuses = useMemo(() => (
    unslottedRuns.reduce((acc, run) => ({
      ...acc,
      [run.id]: isRunSetupTimeValid ? isRunAvailabiltyValid(run, insertionPointStart, runSetupTime) : false,
      
    }), {} as Record<string, boolean>)
  ), [unslottedRuns, isRunSetupTimeValid, insertionPointStart, runSetupTime]);

  const currentScheduleAvailabilityStatuses = useMemo(() => (
    calendarItems.reduce((acc, slot) => {
      if (!slot.data || !slot.data.category) return acc;

      return {
        ...acc,
        [slot.data.category.id]: isRunAvailabiltyValid(slot.data.category, slot.start, slot.data.setupTime),
      };
    }, {} as Record<string, boolean>)
  ), [calendarItems]);

  const handleUpdateRunSetupTime = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setRunSetupTime(evt.target.value);
    setIsRunSetupTimeValid(isTimestampValid(evt.target.value));
  }, []);

  const handleUpdateInterstitialLength = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setInterstitialLength(evt.target.value);
    setIsInterstitialLengthValid(isTimestampValid(evt.target.value));
  }, []);

  const handleUpdateInterstitialName = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setInterstitialName(evt.target.value);
  }, []);

  const handleSelectSlot = useCallback((slot: CalendarSpan<ScheduledRunWithCategory>) => {
    if (slot.data) setSelectedInsertionPoint(slot.data);
  }, []);

  const insertScheduleItem = useCallback((newRecord: ScheduledRunWithCategory, addBefore = false) => {
    if (selectedInsertionPoint === null) {
      setCurrentSchedule([newRecord, ...currentSchedule]);
    } else {
      const selectedIndex = currentSchedule.findIndex(slot => slot === selectedInsertionPoint) + (addBefore ? 0 : 1);

      setCurrentSchedule([
        ...currentSchedule.slice(0, selectedIndex),
        newRecord,
        ...currentSchedule.slice(selectedIndex),
      ]);
    }

    setSelectedInsertionPoint(newRecord);
    setSelectedPendingRun(null);
  }, [currentSchedule, selectedInsertionPoint]);

  const handleInsertPendingRun = useCallback((addBefore = false) => {
    if (!selectedPendingRun) return;
    if (!isRunSetupTimeValid) return;

    insertScheduleItem(createNewSlottedRun(selectedPendingRun, runSetupTime), addBefore);
  }, [selectedPendingRun, insertScheduleItem, isRunSetupTimeValid, runSetupTime]);

  const handleInsertInterstitial = useCallback((addBefore = false) => {
    if (!isInterstitialLengthValid) return;
    if (!interstitialName) return;

    insertScheduleItem(createNewInterstitial(interstitialName, interstitialLength), addBefore);
  }, [insertScheduleItem, interstitialLength, interstitialName, isInterstitialLengthValid]);

  const handleAddSleepBreak = useCallback(() => {
    // Determine time until start of next day
    const startOfNextDay = set(add(insertionPointStart, { days: 1 }), { hours: event.startTime, minutes: 0, seconds: 0, milliseconds: 0 });
    const difference = differenceInSeconds(startOfNextDay, insertionPointStart);

    insertScheduleItem(createNewInterstitial('Sleep', secondsToStringDuration(difference)), false);
  }, [event.startTime, insertScheduleItem, insertionPointStart]);

  const [save, isSaving, saveError] = useSaveable<{ schedule: ScheduledRun[] }, string>(`/api/events/${event.id}/schedule`, true, POST_SAVE_OPTS);

  const handleSave = useCallback(() => {
    if (isSaving) return;

    save({ schedule: currentSchedule });
  }, [currentSchedule, isSaving, save]);
  
  const getSlotClassName = useCallback((slot: CalendarSpan<ScheduledRunWithCategory>) => {
    const classes = [];
    if (!slot.data) return '';

    if (slot.data === selectedInsertionPoint) classes.push('active');
    if (slot.data.isInterstitial) classes.push('interstitial');
    if (slot.data.categoryId && !currentScheduleAvailabilityStatuses[slot.data.categoryId]) classes.push('unavailable');

    return classes.join(' ');
  }, [selectedInsertionPoint, currentScheduleAvailabilityStatuses]);

  const handleRemoveSelectedRun = useCallback(() => {
    if (!selectedInsertionPoint) return;

    const selectedIndex = currentSchedule.findIndex(slot => slot === selectedInsertionPoint);
    const updatedSchedule = currentSchedule.filter(item => item !== selectedInsertionPoint);

    setCurrentSchedule(updatedSchedule);
    
    if (selectedIndex < updatedSchedule.length) {
      setSelectedInsertionPoint(updatedSchedule[selectedIndex] || null);
    } else if (updatedSchedule.length > 0) {
      setSelectedInsertionPoint(updatedSchedule[updatedSchedule.length - 1]);
    } else {
      setSelectedInsertionPoint(null);
    }
  }, [currentSchedule, selectedInsertionPoint]);

  const sortedUnslottedRuns = useMemo(() => [...unslottedRuns].sort((a, b) => {
    if (unslottedRunAvailabilityStatuses[a.id] && !unslottedRunAvailabilityStatuses[b.id]) return -1;
    if (unslottedRunAvailabilityStatuses[b.id] && !unslottedRunAvailabilityStatuses[a.id]) return 1;

    return a.gameSubmission.gameTitle.localeCompare(b.gameSubmission.gameTitle);
  }), [unslottedRunAvailabilityStatuses, unslottedRuns]);

  const unavailableSlotCount = useMemo(() => calendarItems.reduce((acc, slot) => (
    acc + ((slot.data && slot.data.categoryId && !currentScheduleAvailabilityStatuses[slot.data.categoryId]) ? 1 : 0)
  ), 0), [currentScheduleAvailabilityStatuses, calendarItems]);

  const { interstitialDuration, runDuration, setupDuration } = useMemo(() => {
    const { interstitialSeconds, runSeconds, setupSeconds } = calendarItems.reduce<{ interstitialSeconds: number; runSeconds: number; setupSeconds: number }>((acc, slot) => {
      if (!slot.data) return acc;

      const setupTime = stringDurationToSeconds(slot.data.setupTime);

      if (slot.data.isInterstitial || !slot.data.category) {
        return {
          ...acc,
          interstitialSeconds: acc.interstitialSeconds + setupTime,
        };
      }

      return {
        ...acc,
        runSeconds: acc.runSeconds + stringDurationToSeconds(slot.data.category.estimate),
        setupSeconds: acc.setupSeconds + setupTime,
      };
    }, { interstitialSeconds: 0, runSeconds: 0, setupSeconds: 0 });

    return {
      interstitialDuration: secondsToStringDuration(interstitialSeconds),
      runDuration: secondsToStringDuration(runSeconds),
      setupDuration: secondsToStringDuration(setupSeconds),
    };
  }, [calendarItems]);

  return (
    <Container>
      <CommitteeToolbar event={event} isCommitteeMember activePage="schedule">
        <CommitteeToolbarTitle>
          Schedule for {event.eventName}
        </CommitteeToolbarTitle>
      </CommitteeToolbar>
      <CalendarSection>
        <CalendarView
          start={startDate}
          end={endDate}
          slots={calendarItems}
          formatLabel={getSlotLabel}
          getSlotClassName={getSlotClassName}
          onSlotClick={handleSelectSlot}
        />
      </CalendarSection>
      <EditorSection>
        <ScheduleInfo>
          <ScheduleMetrics>
            <ScheduleMetricsHeader>Runs</ScheduleMetricsHeader>
            <ScheduleMetricsHeader>Setup</ScheduleMetricsHeader>
            <ScheduleMetricsHeader>Interstitials</ScheduleMetricsHeader>
            <div>{runDuration}</div>
            <div>{setupDuration}</div>
            <div>{interstitialDuration}</div>
          </ScheduleMetrics>
          {unavailableSlotCount === 0 ? (
            <Alert>No issues detected.</Alert>
          ) : (
            <Alert variant="error">
              {pluralizeWithValue(unavailableSlotCount, 'run does', 'runs do')} not match runner availability.
            </Alert>
          )}
        </ScheduleInfo>
        <InsertRunControls>
          <FormItem>
            <UnslottedRunSelector
              runs={sortedUnslottedRuns}
              availabilities={unslottedRunAvailabilityStatuses}
              value={selectedPendingRun}
              onChange={setSelectedPendingRun}
            />
          </FormItem>
          <FormItem>
            <Label htmlFor="runSetupTime">Setup Time</Label>
            <TextInput
              id="runSetupTime"
              value={runSetupTime}
              onChange={handleUpdateRunSetupTime}
            />
          </FormItem>
          <InsertRunActions>
            <Button
              onClick={() => handleInsertPendingRun(true)}
              disabled={selectedInsertionPoint === null || selectedPendingRun === null || !isRunSetupTimeValid}
            >
              Add Run Before
            </Button>
            <Button
              onClick={() => handleInsertPendingRun(false)}
              disabled={selectedPendingRun === null || !isRunSetupTimeValid}
            >
              Add Run After
            </Button>
          </InsertRunActions>
        </InsertRunControls>
        <InterstitialControls>
          <FormItem>
            <Label htmlFor="interstitialName">Interstitial Name</Label>
            <TextInput
              id="interstitialName"
              value={interstitialName}
              onChange={handleUpdateInterstitialName}
            />
          </FormItem>
          <FormItem>
            <Label htmlFor="interstitialLength">Interstitial Duration</Label>
            <TextInput
              id="interstitialLength"
              value={interstitialLength}
              onChange={handleUpdateInterstitialLength}
            />
          </FormItem>
          <InsertRunActions>
            <Button
              onClick={() => handleInsertInterstitial(true)}
              disabled={selectedInsertionPoint === null || !isInterstitialLengthValid || !interstitialName}
            >
              Add Interstitial Before
            </Button>
            <Button
              onClick={() => handleInsertInterstitial(false)}
              disabled={!isInterstitialLengthValid || !interstitialName}
            >
              Add Interstitial After
            </Button>
          </InsertRunActions>
        </InterstitialControls>
        <SaveControls>
          {saveError.error && (
            <Alert variant="error">
              {saveError.message}
            </Alert>
          )}
          <MiscActions>
            <Button onClick={handleRemoveSelectedRun} disabled={selectedInsertionPoint === null}>
              Remove Selected Run
            </Button>
            <Button onClick={handleAddSleepBreak}>
              Add Sleep Break
            </Button>
          </MiscActions>
          <Button onClick={handleSave} disabled={isSaving}>Save</Button>
        </SaveControls>
      </EditorSection>
    </Container>
  );
};

export default Scheduler;

export async function getServerSideProps(context: NextPageContext) {
  const session = await fetchServerSession(context.req, context.res);

  const event = await fetchEventWithCommitteeMemberIdsAndNames(context.query.id?.toString() || '');

  if (!event || !session || !isMemberOfCommittee(event, session.user)) {
    return {
      notFound: true,
    };
  }

  const categories = await prisma.gameSubmissionCategory.findMany({
    where: {
      gameSubmission: {
        eventId: event.id,
      },
      runStatus: {
        in: [RunStatus.Accepted, RunStatus.Bonus],
      },
    },
    include: {
      gameSubmission: {
        include: {
          user: {
            include: {
              eventAvailabilities: {
                where: {
                  eventId: event.id,
                },
              },
            },
          },
        },
      },
    },
  });

  const scheduledRuns = await prisma.scheduledRun.findMany({
    where: {
      eventId: event.id,
    },
  });

  return {
    props: {
      event: JSON.parse(JSON.stringify(event)),
      categories: prepareAllRecordsForTransfer(categories),
      scheduledRuns: prepareAllRecordsForTransfer(scheduledRuns),
    },
  };
}

const Container = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
  color: #fff;
  font-weight: 400;
  overflow: hidden;
`;

const CalendarSection = styled.div`
  min-height: 0;
  flex-grow: 1;
  align-self: stretch;
  overflow-y: auto;

  & .interstitial {
    border : none;
    color: ${SiteConfig.colors.text.light};
    background: repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0),
      rgba(0, 0, 0, 0) 10px,
      rgba(0, 0, 0, 0.3) 10px,
      rgba(0, 0, 0, 0.3) 20px
    );
    background-color: ${SiteConfig.colors.primary};
  }

  & .unavailable {
    background: repeating-linear-gradient(
      45deg,
      rgba(255, 0, 0, 0),
      rgba(255, 0, 0, 0) 10px,
      rgba(255, 0, 0, 0.5) 10px,
      rgba(255, 0, 0, 0.5) 20px
    );
    background-color: ${SiteConfig.colors.accents.eventItem};
  }

  & .active {
    outline: 4px solid ${SiteConfig.colors.accents.activeTimeslot};
    z-index: 3;
  }
`;

const EditorSection = styled.div`
  display: flex;
  flex-direction: row;
  min-height: 13rem;
  overflow-y: visible;
  border-top: 1px solid ${SiteConfig.colors.secondary};
`;

const CommitteeToolbarTitle = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  padding: 0.5rem;
`;

const ScheduleInfo = styled.div`
  display: flex;
  flex-direction: column;
  overflow: auto;
  width: 20rem;
  padding: 0.5rem;
`;

const SlotLabel = styled.div`
  font-size: 0.825rem;
`;

const SlotDetails = styled.div`
  font-size: 0.75rem;
  margin-top: 0.125rem;
`;

const SlotGameTitle = styled.div`
  display: flex;
  flex-direction: row;
`;

const SlotDuration = styled.div`
  text-align: right;
  font-variant-numeric: tabular-nums;
  margin-left: auto;
`;

const SlotSetupTime = styled.div`
  margin-top: 0.125rem;
`;

const InsertRunControls = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-left: 1px solid ${SiteConfig.colors.secondary};
  padding: 0.5rem;
  min-width: 0;
  flex-grow: 1;
  align-self: stretch;
`;

const InsertRunActions = styled.div`
  & button + button {
    margin-left: 0.5rem;
  }
`;

const InterstitialControls = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-left: 1px solid ${SiteConfig.colors.secondary};
  padding: 0.5rem;
  min-width: 0;
  flex-grow: 2;
  align-self: stretch;
`;

const SaveControls = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-left: 1px solid ${SiteConfig.colors.secondary};
  padding: 0.5rem;
  min-width: 0;
  flex-grow: 1;
  align-self: stretch;
`;

const ScheduleMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);

  & > div {
    padding: 0.125rem;
  }
`;

const ScheduleMetricsHeader = styled.div`
  font-weight: 700;
  font-size: 0.825rem;
  text-transform: uppercase;
`;

const MiscActions = styled.div`
  display: flex;
  flex-direction: column;

  & button + button {
    margin-top: 0.5rem;
  }
`;
