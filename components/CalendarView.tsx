import { add, differenceInDays, differenceInSeconds, endOfDay, startOfDay } from 'date-fns';
import { format } from 'date-fns-tz';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { DateSegment, RawDateSegment } from '../utils/durationHelpers';
import { SiteConfig } from '../utils/siteConfig';

export type CalendarSpan<T> = { start: Date; end: Date; data?: T };

const SECONDS_PER_DAY = 60 * 60 * 24;

function getPercentThroughDay(time: Date) {
  return (differenceInSeconds(time, startOfDay(time)) / SECONDS_PER_DAY) * 100;
}

function getDurationPercentLength(start: Date, end: Date) {
  return (differenceInSeconds(end, start) / SECONDS_PER_DAY) * 100;
}

interface CalendarSlotProps<T = unknown> {
  slot: CalendarSpan<T>;
  formatLabel?: (slot: CalendarSpan<T>) => React.ReactNode;
  getSlotClassName?: (slot: CalendarSpan<T>) => string;
  onSlotClick?: (slot: CalendarSpan<T>) => void;
}

function CalendarSlot<T>({ slot, formatLabel, getSlotClassName, onSlotClick }: React.PropsWithChildren<CalendarSlotProps<T>>) {
  const percentOffset = useMemo(() => getPercentThroughDay(slot.start), [slot.start]);
  const percentHeight = useMemo(() => getDurationPercentLength(slot.start, slot.end), [slot.start, slot.end]);
  const label = useMemo(() => formatLabel ? formatLabel(slot) : null, [formatLabel, slot]);
  const className = useMemo(() => getSlotClassName ? getSlotClassName(slot) : '', [getSlotClassName, slot]);

  const handleClick = useCallback(() => {
    if (onSlotClick) onSlotClick(slot);
  }, [slot, onSlotClick]);

  return (
    <CalendarSlotContainer className={className} offset={percentOffset} height={percentHeight} onClick={handleClick}>
      <SlotTimeRange>{formatRange(slot.start, slot.end)}</SlotTimeRange>
      {label && <SlotLabel>{label}</SlotLabel>}
    </CalendarSlotContainer>
  );
}

function formatHour(hour: number, suffix = true) {
  if (hour === 12) return `12${suffix ? ' PM' : ''}`;
  if (hour === 24 || hour === 0) return `12${suffix ? ' AM' : ''}`;
  if (hour > 12) return `${hour - 12}${suffix ? ' PM' : ''}`;

  return `${hour}${suffix ? ' AM' : ''}`;
}

function formatRange(startDate: Date, endDate: Date) {
  const startAMPM = format(startDate, 'a');
  const endAMPM = format(endDate, 'a');
  const start = format(startDate, 'h:mm');
  const end = format(endDate, 'h:mm');

  if (startAMPM === endAMPM) {
    return `${start}—${end} ${startAMPM}`;
  }
  
  return `${start} ${startAMPM}—${end} ${endAMPM}`;

  // if ((end >= 12 && start < 12) || (end === 24 && start >= 12)) {
  //   return `${formatHour(start)}—${formatHour(end)}`;
  // }

  // return `${formatHour(start, false)}—${formatHour(end)}`;
}

export type LabeledDateSegment = DateSegment & { label?: string };

interface CalendarViewProps<T = unknown> {
  start: Date;
  end: Date;
  slots: CalendarSpan<T>[];
  formatLabel?: (slot: CalendarSpan<T>) => React.ReactNode;
  getSlotClassName?: (slot: CalendarSpan<T>) => string;
  onSlotClick?: (slot: CalendarSpan<T>) => void;
}

const hourSegments = [...Array(24)].map((_, index) => index);

export function CalendarView<T>({ start, end, slots, formatLabel, getSlotClassName, onSlotClick }: React.PropsWithChildren<CalendarViewProps<T>>) {
  const startDate = useMemo(() => startOfDay(start), [start]);
  const endDate = useMemo(() => endOfDay(end), [end]);

  const calendarDays = useMemo(() => (
    [...Array(differenceInDays(endDate, startDate))]
      .reduce<Date[]>((acc, _, index) => [
        ...acc,
        add(startDate, { days: index }),
      ], [] as Date[])
      .map(date => format(date, 'MMM do', { timeZone: 'America/New_York' }))
  ), [startDate, endDate]);

  const slotsByDay = useMemo(() => (
    slots.reduce((acc, slot) => {
      const startDay = format(slot.start, 'MMM do', { timeZone: 'America/New_York' });
      const endDay = format(slot.end, 'MMM do', { timeZone: 'America/New_York' });

      if (startDay === endDay) {
        return {
          ...acc,
          [startDay]: [...(acc[startDay] || []), slot],
        };
      }

      return {
        ...acc,
        [startDay]: [...(acc[startDay] || []), { ...slot, end: endOfDay(slot.start) }],
        [endDay]: [...(acc[endDay] || []), { ...slot, start: startOfDay(slot.end) }],
      };
    }, {} as Record<string, RawDateSegment[]>)
  ), [slots]);

  return (
    <Calendar hours={hourSegments.length}>
      <CalendarHeader />
      {hourSegments.map(hour => <HourMarker key={hour}>{formatHour(hour)}</HourMarker>)}
      {calendarDays.map(day => (
        <React.Fragment key={day}>
          <CalendarHeader>{day}</CalendarHeader>
          <CalendarColumn>
            {hourSegments.map(hour => <CalendarSpacer key={hour} />)}
            <SlotContainer>
              {(slotsByDay[day] || []).map((slot, index) => (
                <CalendarSlot
                  key={index}
                  slot={slot}
                  formatLabel={formatLabel}
                  getSlotClassName={getSlotClassName}
                  onSlotClick={onSlotClick}
                />
              ))}
            </SlotContainer>
          </CalendarColumn>
        </React.Fragment>
      ))}
 
    </Calendar>
  );
}

const Calendar = styled.div<{ hours: number }>`
  position: relative;
  display: grid;
  width: 100%;
  grid-template-rows: repeat(${({ hours }) => hours + 1}, 4rem);
  grid-template-columns: 4rem;
  grid-auto-flow: column;
`;

const CalendarHeader = styled.div`
  position: sticky;
  top: 0;
  height: 2.25rem;
  font-weight: 700;
  background-color: ${SiteConfig.colors.secondary};
  padding: 0.5rem 1rem;
  z-index: 2;
`;

const HourMarker = styled.div`
  font-size: 0.825rem;
  text-align: right;
  width: 4rem;
  color: #999;
  border-right: 1px solid #666;
  padding-right: 0.25rem;

  &:before {
    content: ' ';
    position: relative;
    display: block;
    height: 1px;
    width: 100vw;
    left: 0;
    top: 0;
    background-color: #666;
    z-index: -1;
  }
`;

const CalendarSpacer = styled.div`
  border-right: 1px solid #666;
`;

const SlotLabel = styled.div``;

const SlotTimeRange = styled.div`
  font-size: 0.75rem;

  & + ${SlotLabel} {
    margin-top: 0.25rem;
  }
`;

const CalendarSlotContainer = styled.div<{ offset: number; height: number; }>`
  position: absolute;
  top: calc(${({ offset }) => offset}% + 1px);
  width: calc(100% - 1px);
  min-height: ${({ height }) => height}%;
  height: calc(${({ height }) => height}% - 1px);
  z-index: 1;
  background-color: ${SiteConfig.colors.accents.eventItem};
  color: ${SiteConfig.colors.text.dark};
  border-right: 1px solid #666;
  padding: 0.25rem;
  border-radius: 0.25rem;
  border-left: 4px solid rgba(0, 0, 0, 0.3);
  overflow: hidden;

  &:hover {
    height: max-content;
    z-index: 2;
  }
`;

const SlotContainer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const CalendarColumn = styled.div`
  position: relative;
  display: grid;
  grid-row: span 24;
  grid-template-rows: repeat(24, 1fr);
`;
