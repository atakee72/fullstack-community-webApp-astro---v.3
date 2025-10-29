
import React from 'react';
import { QueryProvider } from '../providers/QueryProvider';
import UserProfile from './UserProfile';

export default function UserProfileWrapper() {
  return (
    <QueryProvider>
      <UserProfile />
    </QueryProvider>
  );
}
