import React from 'react';
import DynamicLandingPage from '@/components/DynamicLandingPage';

const CommunityLanding: React.FC = () => {
  const fallbackData = {
    title: 'Community Hub',
    subtitle: 'Connect. Learn. Grow.',
    description: 'Join a vibrant ecosystem of AI developers, researchers, and innovators. Share knowledge, collaborate on projects, and accelerate your AI journey with our global community.',
    ctaText: 'Join Community',
    ctaUrl: '/community'
  };

  return (
    <DynamicLandingPage 
      pageId="community" 
      fallbackData={fallbackData}
    />
  );
};

export default CommunityLanding;
