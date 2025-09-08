import React from 'react';
import DynamicLandingPage from '@/components/DynamicLandingPage';

const LabLanding: React.FC = () => {
  const fallbackData = {
    title: 'AI Lab',
    subtitle: 'Experiment with Confidence',
    description: 'Push the boundaries of AI innovation in our secure cloud environment. Test cutting-edge models, run complex experiments, and iterate quickly with enterprise-grade infrastructure.',
    ctaText: 'Start Experimenting',
    ctaUrl: '/lab'
  };

  return (
    <DynamicLandingPage 
      pageId="lab" 
      fallbackData={fallbackData}
    />
  );
};

export default LabLanding;
