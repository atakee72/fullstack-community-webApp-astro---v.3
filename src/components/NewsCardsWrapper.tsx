import React from 'react';
import { NewsCards } from './ui/NewsCards';

interface NewsCardsWrapperProps {
  session?: any;
}

export default function NewsCardsWrapper({ session }: NewsCardsWrapperProps) {
  return <NewsCards />;
}
