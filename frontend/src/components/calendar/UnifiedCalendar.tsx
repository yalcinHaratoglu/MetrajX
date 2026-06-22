import type { ComponentProps } from "react";
import { MetrajCalendar } from "../metraj/MetrajCalendar";
import type { MetrajOperation } from "../../services/metrajService";
import type { CalendarEvent } from "../../services/calendarService";

type Props = ComponentProps<typeof MetrajCalendar> & {
  events?: CalendarEvent[];
};

export function UnifiedCalendar({ events = [], ...props }: Props) {
  return <MetrajCalendar {...props} events={events} />;
}

export type { MetrajOperation, CalendarEvent };
