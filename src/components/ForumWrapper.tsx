import React from 'react';
import { QueryProvider } from '../providers/QueryProvider';
import ForumContainer from './ForumContainer';

interface ForumWrapperProps {
  session?: any;
}

export default function ForumWrapper({ session }: ForumWrapperProps) {
  return (
    <QueryProvider>
      <ForumContainer initialSession={session} />
    </QueryProvider>
  );
}