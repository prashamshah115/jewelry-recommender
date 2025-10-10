import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isWhitelisted } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Show access denied if not whitelisted
  if (!isWhitelisted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            Your account is not authorized to use this application. Please contact the
            administrator for access.
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and whitelisted
  return <>{children}</>;
}

