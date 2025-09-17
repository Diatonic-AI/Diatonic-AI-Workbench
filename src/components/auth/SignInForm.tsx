import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn } from './AuthComponents';
import AuthLayout from './AuthLayout';

const SignInForm: React.FC = () => {
  const navigate = useNavigate();

  const handleSwitchToSignUp = () => {
    navigate('/auth/signup');
  };

  const handleSwitchToForgotPassword = () => {
    // TODO: Implement forgot password functionality
    console.log('Forgot password clicked');
  };

  const handleSuccess = () => {
    // Redirect to dashboard or wherever user should go after sign in
    navigate('/dashboard');
  };

  return (
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Sign in to your Diatonic AI account"
    >
      <SignIn
        onSwitchToSignUp={handleSwitchToSignUp}
        onSwitchToForgotPassword={handleSwitchToForgotPassword}
        onSuccess={handleSuccess}
      />
    </AuthLayout>
  );
};

export default SignInForm;
