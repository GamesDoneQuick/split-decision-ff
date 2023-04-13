import { EventAvailability } from '@prisma/client';
import { format, utcToZonedTime } from 'date-fns-tz';

export function stringDurationToSeconds(duration: string): number {
  const parts = duration.split(':').map(Number);

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

  if (parts.length === 2) return parts[0] * 60 + parts[1];

  return parts[0] || 0;
}

export interface DateSegment {
  date: string;
  start: number;
  end: number;
}

export function availabilitySlotsToSegments(availability: EventAvailability) {
  const slots = [...availability.slots]
    .map(x => typeof x === 'string' ? new Date(x) : x)
    .sort((a, b) => a.toISOString().localeCompare(b.toISOString()));

  // Remove duplicates
  const dedupedSlots = slots.filter((slot, index) => slots.findIndex(x => x.toISOString() === slot.toISOString()) === index);

  return dedupedSlots.reduce<DateSegment[]>((acc, slot) => {
    const previousSlot: DateSegment = acc[acc.length - 1];
    const zonedTime = utcToZonedTime(slot, 'America/New_York');
    const slotDate = format(zonedTime, 'MMM do', { timeZone: 'America/New_York' });
    const slotTime = Number(format(zonedTime, 'H', { timeZone: 'America/New_York' }));

    if (previousSlot && previousSlot.date === slotDate && previousSlot.end === slotTime) {
      return [
        ...acc.slice(0, -1),
        {
          ...previousSlot,
          end: slotTime + 1,
        },
      ];
    }

    return [...acc,
      {
        date: slotDate,
        start: slotTime,
        end: slotTime + 1,
      },
    ];
  }, [] as DateSegment[]);
}
