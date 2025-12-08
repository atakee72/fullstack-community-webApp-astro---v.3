
import React from 'react';
import { QueryProvider } from '../providers/QueryProvider';
import UserProfile from './UserProfile';

interface UserProfileWrapperProps {
  user?: any;
}

export default function UserProfileWrapper({ user }: UserProfileWrapperProps) {
  return (
    <QueryProvider>
      <UserProfile user={user} />
    </QueryProvider>
  );
}
