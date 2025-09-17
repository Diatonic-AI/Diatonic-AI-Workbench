import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUp } from './AuthComponents';
import AuthLayout from './AuthLayout';

const SignUpForm: React.FC = () => {
  const navigate = useNavigate();

  const handleSwitchToSignIn = () => {
    navigate('/auth/signin');
  };

  const handleSuccess = (username: string) => {
    // Navigate to confirmation page with username
    navigate('/auth/confirm', { 
      state: { username } 
    });
  };

  return (
    <AuthLayout 
      title="Create Your Account" 
      subtitle="Join the Diatonic AI community"
    >
      <SignUp
        onSwitchToSignIn={handleSwitchToSignIn}
        onSuccess={handleSuccess}
      />
    </AuthLayout>
  );
};

export default SignUpForm;
