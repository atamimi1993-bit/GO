import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DriverLeaderboard from '@/components/go/DriverLeaderboard';
import CustomerLeaderboard from '@/components/go/CustomerLeaderboard';

export default function Leaderboard() {
  const { scrollRef } = useOutletContext();
  const [tab, setTab] = useState('drivers');

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <div className="flex justify-center mb-6">
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="customers">
        <CustomerLeaderboard scrollRef={scrollRef} />
      </TabsContent>
      <TabsContent value="drivers">
        <DriverLeaderboard scrollRef={scrollRef} />
      </TabsContent>
    </Tabs>
  );
}