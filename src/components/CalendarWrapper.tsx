import React from 'react';
import { QueryProvider } from '../providers/QueryProvider';
import CalendarContainer from './CalendarContainer';

interface CalendarWrapperProps {
  session?: any;
}

export default function CalendarWrapper({ session }: CalendarWrapperProps) {
  return (
    <QueryProvider>
      <CalendarContainer initialSession={session} />
    </QueryProvider>
  );
}
