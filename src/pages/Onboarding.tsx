import React from 'react';
import { Navigate } from 'react-router-dom';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import UserTypeSelection from '@/components/onboarding/UserTypeSelection';
import IndividualRegistrationForm from '@/components/onboarding/IndividualRegistrationForm';
import CompanyRegistrationForm from '@/components/onboarding/CompanyRegistrationForm';
import CompanyDetailsForm from '@/components/onboarding/CompanyDetailsForm';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';

const OnboardingWizard: React.FC = () => {
  const { state } = useOnboarding();

  // Redirect if onboarding is completed
  if (state.isCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  const renderCurrentStep = () => {
    const { userType, step } = state;

    // Step 1: Always user type selection
    if (step === 1) {
      return <UserTypeSelection />;
    }

    // Steps 2+ depend on user type
    if (userType === 'individual') {
      switch (step) {
        case 2:
          return <IndividualRegistrationForm />;
        case 3:
          // Could add preferences step or go straight to dashboard
          return <div>Individual onboarding complete!</div>;
        default:
          return <Navigate to="/onboarding" replace />;
      }
    }

    if (userType === 'company') {
      switch (step) {
        case 2:
          return <CompanyRegistrationForm />;
        case 3:
          return <CompanyDetailsForm />;
        case 4:
          // Company onboarding complete
          return <div>Company onboarding complete!</div>;
        default:
          return <Navigate to="/onboarding" replace />;
      }
    }

    // Fallback to step 1 if no user type selected
    return <Navigate to="/onboarding" replace />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress indicator */}
          <OnboardingProgress />
          
          {/* Current step content */}
          <div className="mt-8">
            {renderCurrentStep()}
          </div>
        </div>
      </div>
    </div>
  );
};

const Onboarding: React.FC = () => {
  return (
    <OnboardingProvider>
      <OnboardingWizard />
    </OnboardingProvider>
  );
};

export default Onboarding;