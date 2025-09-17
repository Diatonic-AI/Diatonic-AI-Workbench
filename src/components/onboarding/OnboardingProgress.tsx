import React from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Check } from 'lucide-react';

const OnboardingProgress: React.FC = () => {
  const { state } = useOnboarding();
  const { step, totalSteps, userType } = state;

  const getStepLabel = (stepNumber: number) => {
    if (stepNumber === 1) return 'User Type';
    
    if (userType === 'individual') {
      switch (stepNumber) {
        case 2: return 'Personal Info';
        case 3: return 'Complete';
        default: return `Step ${stepNumber}`;
      }
    }
    
    if (userType === 'company') {
      switch (stepNumber) {
        case 2: return 'Admin Info';
        case 3: return 'Company Details';
        case 4: return 'Complete';
        default: return `Step ${stepNumber}`;
      }
    }
    
    return `Step ${stepNumber}`;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Get Started</h1>
        <span className="text-sm text-gray-400">
          Step {step} of {totalSteps}
        </span>
      </div>
      
      <div className="flex items-center space-x-4">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < step;
          const isCurrent = stepNumber === step;
          
          return (
            <React.Fragment key={stepNumber}>
              {/* Step circle */}
              <div
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                  ${isCompleted 
                    ? 'bg-workbbench-purple border-workbbench-purple text-white' 
                    : isCurrent 
                      ? 'border-workbbench-purple text-workbbench-purple bg-transparent'
                      : 'border-gray-600 text-gray-600'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-medium">{stepNumber}</span>
                )}
              </div>
              
              {/* Step label */}
              <div className="flex flex-col">
                <span
                  className={`text-sm font-medium ${
                    isCompleted || isCurrent ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {getStepLabel(stepNumber)}
                </span>
              </div>
              
              {/* Connector line */}
              {stepNumber < totalSteps && (
                <div
                  className={`flex-1 h-0.5 transition-colors ${
                    isCompleted ? 'bg-workbbench-purple' : 'bg-gray-600'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingProgress;