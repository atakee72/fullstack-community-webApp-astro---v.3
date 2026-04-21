import React from 'react';
import { QueryProvider } from '../providers/QueryProvider';
import CalendarContainer from './CalendarContainer';

interface CalendarWrapperProps {
  session?: any;
  initialEvents?: any[];
}

export default function CalendarWrapper({ session, initialEvents }: CalendarWrapperProps) {
  return (
    <QueryProvider>
      <CalendarContainer initialSession={session} initialEvents={initialEvents} />
    </QueryProvider>
  );
}
