import React, { Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface PageWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ 
  children, 
  fallback = <LoadingSpinner size="lg" text="Loading page..." /> 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

export default PageWrapper;
