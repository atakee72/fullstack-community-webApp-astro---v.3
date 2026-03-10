import React from 'react';
import { QueryProvider } from '../providers/QueryProvider';
import { NewsCards } from './ui/NewsCards';

interface NewsCardsWrapperProps {
  session?: any;
}

export default function NewsCardsWrapper({ session }: NewsCardsWrapperProps) {
  return (
    <QueryProvider>
      <NewsCards user={session?.user} />
    </QueryProvider>
  );
}
