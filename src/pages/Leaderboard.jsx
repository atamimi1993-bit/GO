import React from 'react';
import { useOutletContext } from 'react-router-dom';
import DriverLeaderboard from '@/components/go/DriverLeaderboard';

export default function Leaderboard() {
  const { scrollRef } = useOutletContext();
  return <DriverLeaderboard scrollRef={scrollRef} />;
}