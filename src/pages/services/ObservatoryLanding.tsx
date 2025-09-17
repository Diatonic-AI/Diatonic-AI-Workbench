import React from 'react';
import DynamicLandingPage from '@/components/DynamicLandingPage';

const ObservatoryLanding: React.FC = () => {
  const fallbackData = {
    title: 'Observatory',
    subtitle: 'Intelligence Through Insights',
    description: 'Transform data into actionable intelligence with advanced analytics and visualization tools. Monitor performance, track trends, and make data-driven decisions across your AI ecosystem.',
    ctaText: 'Explore Analytics',
    ctaUrl: '/observatory'
  };

  return (
    <DynamicLandingPage 
      pageId="observatory" 
      fallbackData={fallbackData}
    />
  );
};

export default ObservatoryLanding;
