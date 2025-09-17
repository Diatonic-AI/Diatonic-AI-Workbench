/**
 * Unified useAuth hook that works in both development and production modes
 * 
 * This hook automatically detects the environment and uses the appropriate
 * auth context while providing a consistent interface.
 */

import { useAuth as useProductionAuth } from '@/contexts/AuthContext';
import { useDevAuth, useDevAuthMapped } from '@/contexts/DevAuthContext';

/**
 * Unified useAuth hook that works in both development and production modes
 */
export const useAuth = () => {
  const isDevelopment = import.meta.env.MODE === 'development';
  
  if (isDevelopment) {
    // In development, use the mapped version that conforms to AuthContext interface
    return useDevAuthMapped();
  } else {
    // In production, use the standard AuthContext
    return useProductionAuth();
  }
};

/**
 * Development-specific auth hook (only for development use)
 * This gives access to dev-specific features like simulateLogin
 */
export const useDevAuthDirect = () => {
  const isDevelopment = import.meta.env.MODE === 'development';
  
  if (!isDevelopment) {
    throw new Error('useDevAuthDirect can only be used in development mode');
  }
  
  return useDevAuth();
};

export default useAuth;
