import { EventAvailability } from '@prisma/client';
import { add, isEqual } from 'date-fns';
import { format, utcToZonedTime } from 'date-fns-tz';

export function stringDurationToSeconds(duration: string): number {
  const parts = duration.split(':').map(Number);

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

  if (parts.length === 2) return parts[0] * 60 + parts[1];

  return parts[0] || 0;
}

export function secondsToStringDuration(value: number): string {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value - hours * 3600) / 60);
  const seconds = value - minutes * 60 - hours * 3600;

  return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export interface RawDateSegment {
  start: Date;
  end: Date;
}

export interface DateSegment {
  date: string;
  start: number;
  end: number;
}

export function availabilitySlotsToRawSegments(availability: EventAvailability) {
  const slots = [...availability.slots]
    .map(x => typeof x === 'string' ? new Date(x) : x)
    .sort((a, b) => a.toISOString().localeCompare(b.toISOString()));

  // Remove duplicates
  const dedupedSlots = slots.filter((slot, index) => slots.findIndex(x => x.toISOString() === slot.toISOString()) === index);

  return dedupedSlots.reduce<RawDateSegment[]>((acc, slot) => {
    const previousSlot: RawDateSegment = acc[acc.length - 1];
    const zonedTime = utcToZonedTime(slot, 'America/New_York');

    if (previousSlot && isEqual(previousSlot.end, zonedTime)) {
      return [
        ...acc.slice(0, -1),
        {
          ...previousSlot,
          end: add(previousSlot.end, { hours: 1 }),
        },
      ];
    }

    return [...acc,
      {
        start: zonedTime,
        end: add(zonedTime, { hours: 1 }),
      },
    ];
  }, [] as RawDateSegment[]);
}

export function availabilitySlotsToSegments(availability: EventAvailability) {
  const rawSlots = availabilitySlotsToRawSegments(availability);

  return rawSlots.map(slot => {
    const slotDate = format(slot.start, 'MMM do', { timeZone: 'America/New_York' });
    const slotStartTime = Number(format(slot.start, 'H', { timeZone: 'America/New_York' }));
    const slotEndTime = Number(format(slot.end, 'H', { timeZone: 'America/New_York' }));

    return {
      date: slotDate,
      start: slotStartTime,
      end: slotEndTime,
    };
  });
}
