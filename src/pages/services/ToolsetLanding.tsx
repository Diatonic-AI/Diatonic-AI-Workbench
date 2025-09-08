import React from 'react';
import DynamicLandingPage from '@/components/DynamicLandingPage';

const ToolsetLanding: React.FC = () => {
  const fallbackData = {
    title: 'AI Toolset',
    subtitle: 'Visual Agent Builder for Everyone',
    description: 'Create powerful AI agents with our intuitive drag-and-drop interface. No coding required - just connect, configure, and deploy intelligent automation solutions in minutes.',
    ctaText: 'Start Building Agents',
    ctaUrl: '/toolset'
  };

  return (
    <DynamicLandingPage 
      pageId="toolset" 
      fallbackData={fallbackData}
    />
  );
};

export default ToolsetLanding;
