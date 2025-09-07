import React from 'react';
import { Link } from 'react-router-dom';
import { WorkbbenchLogo } from '../WorkbbenchLogo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-workbbench-dark-purple via-purple-950 to-indigo-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/">
            <WorkbbenchLogo className="h-12 w-auto" />
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-center text-sm text-gray-300">
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {children}
      </div>
      
      <div className="mt-8 text-center">
        <Link 
          to="/" 
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
};

export default AuthLayout;
