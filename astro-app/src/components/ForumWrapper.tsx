import React from 'react';
import { QueryProvider } from '../providers/QueryProvider';
import ForumContainer from './ForumContainer';

export default function ForumWrapper() {
  return (
    <QueryProvider>
      <ForumContainer />
    </QueryProvider>
  );
}