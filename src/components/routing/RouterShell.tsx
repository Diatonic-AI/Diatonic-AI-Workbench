import React from "react";

type Props = { 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
};

/**
 * RouterShell - Conditionally enables subdomain routing
 * 
 * When VITE_ENABLE_SUBDOMAIN_ROUTING=false (default), this simply passes through children.
 * When enabled, it would wrap with subdomain routing logic (currently disabled for stability).
 */
const RouterShell: React.FC<Props> = ({ children, fallback = null }) => {
  const enabled = import.meta.env.VITE_ENABLE_SUBDOMAIN_ROUTING === "true";
  
  // For now, always pass through children to avoid complex subdomain routing issues
  // TODO: Implement gradual rollout of subdomain routing when feature is stable
  if (!enabled || true) { // Force disabled until subdomain routing is fully implemented
    return <>{children}</>;
  }

  // Future: Enable this when subdomain routing is ready
  // const LazySubdomainRouter = React.lazy(() => import("./SubdomainRouter"));
  // return (
  //   <Suspense fallback={fallback}>
  //     <LazySubdomainRouter>{children}</LazySubdomainRouter>
  //   </Suspense>
  // );
  
  return <>{children}</>;
};

export default RouterShell;
