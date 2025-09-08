import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ConfirmSignUp } from './AuthComponents';
import AuthLayout from './AuthLayout';

const ConfirmSignUpForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get username from navigation state
  const username = (location.state as any)?.username || '';

  // Redirect to signup if no username provided
  React.useEffect(() => {
    if (!username) {
      navigate('/auth/signup');
    }
  }, [username, navigate]);

  const handleSuccess = () => {
    // Redirect to dashboard after successful confirmation
    navigate('/dashboard');
  };

  const handleResendCode = () => {
    // Show success message or handle resend confirmation
    console.log('Confirmation code resent');
  };

  const handleBack = () => {
    // Go back to sign up page
    navigate('/auth/signup');
  };

  if (!username) {
    return null; // or loading spinner
  }

  return (
    <AuthLayout 
      title="Confirm Your Account" 
      subtitle={`We sent a confirmation code to your email`}
    >
      <ConfirmSignUp
        username={username}
        onSuccess={handleSuccess}
        onResendCode={handleResendCode}
        onBack={handleBack}
      />
    </AuthLayout>
  );
};

export default ConfirmSignUpForm;
