
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ChatInterface from '@/components/ai-chat/ChatInterface';
import DailySchedule from '@/components/smart-planner/DailySchedule';
import ProductivityChart from '@/components/progress-tracker/ProductivityChart';
import ResourceSuggestions from '@/components/study-helper/ResourceSuggestions';
import WelcomeCard from '@/components/dashboard/WelcomeCard';
import UpcomingTasks from '@/components/dashboard/UpcomingTasks';

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <WelcomeCard />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ChatInterface />
          </div>
          
          <div className="space-y-6">
            <UpcomingTasks />
            <DailySchedule />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProductivityChart />
          <ResourceSuggestions />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
