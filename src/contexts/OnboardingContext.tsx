import React, { createContext, useContext, useState, useCallback } from 'react';
import { leadAPI, CreateLeadResponse } from '../lib/api/leads';
import { toast } from 'sonner';

export type UserType = 'individual' | 'company';

export interface OnboardingState {
  userType?: UserType;
  step: number;
  totalSteps: number;
  formData: Record<string, any>;
  isCompleted: boolean;
  isLoading: boolean;
  leadId?: string;
  leadCreated: boolean;
  error?: string;
}

interface OnboardingContextValue {
  state: OnboardingState;
  setUserType: (type: UserType) => void;
  nextStep: () => void;
  prevStep: () => void;
  setFormData: (data: Record<string, any>) => void;
  updateFormField: (field: string, value: any) => void;
  resetOnboarding: () => void;
  completeOnboarding: () => Promise<void>;
  setError: (error: string) => void;
  clearError: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const INITIAL_STATE: OnboardingState = {
  step: 1,
  totalSteps: 3,
  formData: {},
  isCompleted: false,
  isLoading: false,
  leadCreated: false,
};

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);

  const setUserType = useCallback((type: UserType) => {
    setState(prev => ({
      ...prev,
      userType: type,
      totalSteps: type === 'individual' ? 3 : 4, // Company flow has extra step
      formData: { ...prev.formData, userType: type },
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: Math.min(prev.step + 1, prev.totalSteps),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: Math.max(prev.step - 1, 1),
    }));
  }, []);

  const setFormData = useCallback((data: Record<string, any>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...data },
    }));
  }, []);

  const updateFormField = useCallback((field: string, value: any) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (state.leadCreated) {
      // Lead already created, just mark as completed
      setState(prev => ({ ...prev, isCompleted: true }));
      toast.success('Welcome to AI Nexus Workbench!');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // Create lead from form data
      const response: CreateLeadResponse = await leadAPI.createLeadFromOnboarding(
        state.userType!,
        state.formData,
        'onboarding'
      );

      // Update state with successful lead creation
      setState(prev => ({
        ...prev,
        isCompleted: true,
        isLoading: false,
        leadId: response.lead_id,
        leadCreated: true,
      }));

      // Show success message
      toast.success('Welcome to AI Nexus Workbench!', {
        description: 'Your registration is complete. We\'ll be in touch soon with next steps.',
        duration: 5000,
      });

      // Track successful lead creation for analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'lead_created', {
          event_category: 'onboarding',
          event_label: state.userType,
          value: response.priority_score,
        });
      }

    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete registration';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      toast.error('Registration failed', {
        description: 'Please try again or contact support if the problem persists.',
        duration: 5000,
      });
    }
  }, [state.userType, state.formData, state.leadCreated]);

  const value: OnboardingContextValue = {
    state,
    setUserType,
    nextStep,
    prevStep,
    setFormData,
    updateFormField,
    resetOnboarding,
    completeOnboarding,
    setError,
    clearError,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextValue => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};