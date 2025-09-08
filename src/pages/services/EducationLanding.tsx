import React from 'react';
import DynamicLandingPage from '@/components/DynamicLandingPage';

const EducationLanding: React.FC = () => {
  const fallbackData = {
    title: 'Education Hub',
    subtitle: 'Learn AI Development the Right Way',
    description: 'Master AI development with our comprehensive learning platform. From beginner tutorials to advanced courses, get hands-on experience with real-world projects and expert guidance.',
    ctaText: 'Start Learning',
    ctaUrl: '/education'
  };

  return (
    <DynamicLandingPage 
      pageId="education" 
      fallbackData={fallbackData}
    />
  );
};

export default EducationLanding;
