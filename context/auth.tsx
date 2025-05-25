// context/auth.jsx

import { useRouter, useSegments } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { usePocketBase } from './pocketbase';

// Define the sign-in response interface
interface AppSignInResponse {
  user?: Record<string, any>;
  error?: any;
}

// Define a proper interface for the auth context
interface AuthContextType {
  signIn: (email: string, password: string) => Promise<AppSignInResponse>;
  signOut: () => Promise<{ user: null } | { error: any }>;
  createAccount: (params: {
    email: string;
    password: string;
    passwordConfirm: string;
    name?: string;
  }) => Promise<{ user: any } | { error: any }>;
  isLoggedIn: boolean;
  isInitialized: boolean;
  user: Record<string, any> | null;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  signIn: async () => ({ error: 'AuthProvider not initialized' }),
  signOut: async () => ({ error: 'AuthProvider not initialized' }),
  createAccount: async () => ({ error: 'AuthProvider not initialized' }),
  isLoggedIn: false,
  isInitialized: false,
  user: null,
});

// This hook can be used to access the user info.
export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

interface UseProtectedRouteProps {
    user: null | Record<string, any>;
    isInitialized: boolean;
}

function useProtectedRoute({ user, isInitialized }: UseProtectedRouteProps) {
    const router = useRouter();
    const segments: string[] = useSegments();

    useEffect(() => {
        // Skip navigation until initialized
        if (!isInitialized) return;
        
        // Safely check for auth group
        const inAuthGroup = segments[0] === '(auth)' || (segments[0] && segments[0].includes('auth'));

        if (!user && !inAuthGroup) {
            // Redirect to the sign-in page.
            router.replace('/(auth)/login' as any);
        } else if (user && inAuthGroup) {
            // Redirect away from the sign-in page.
            router.replace('/(tabs)' as any);
        }
    }, [user, segments, isInitialized, router]);
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const { pb } = usePocketBase();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Use null as initial state, and properly handle the potentially null pb
  const [user, setUser] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (pb) {
        // Assuming your PocketBase setup includes some method to check auth status
        const isLoggedIn = pb.authStore.isValid;
        setIsLoggedIn(isLoggedIn);
        // No need for the redundant pb check since we're already inside an if(pb) block
        setUser(isLoggedIn ? pb.authStore.model : null);
        setIsInitialized(true);
      }
    };

    checkAuthStatus();
  }, [pb]);

interface AppSignInResponse {
    user?: Record<string, any>;
    error?: any;
}

const appSignIn = async (
    email: string,
    password: string
): Promise<AppSignInResponse> => {
    if (!pb) return { error: 'PocketBase not initialized' };

    try {
        // Remove the optional chaining here since we already checked pb is not null
        const resp = await pb
            .collection('users')
            .authWithPassword(email, password);
        // Use optional chaining consistently
        setUser(pb.authStore.isValid ? pb.authStore.model : null);
        setIsLoggedIn(pb.authStore.isValid);
        return { user: resp?.record };
    } catch (e) {
        return { error: e };
    }
};

const appSignOut = async () => {
    if (!pb) return { error: 'PocketBase not initialized' };

    try {
        // Remove the optional chaining since we already checked pb is not null
        await pb.authStore.clear();
        setUser(null);
        setIsLoggedIn(false);
        return { user: null };
    } catch (e) {
        return { error: e };
    }
};

  const createAccount = async ({
    email,
    password,
    passwordConfirm,
    name,
  }: {
    email: string;
    password: string;
    passwordConfirm: string;
    name?: string;
  }) => {
    if (!pb) return { error: 'PocketBase not initialized' };

    try {
      const resp = await pb.collection('users').create({
        email,
        password,
        passwordConfirm,
        name: name ?? '',
      });

      return { user: resp };
    } catch (e) {
      return { error: (e as any)?.response };
    }
  };

  useProtectedRoute({ user, isInitialized });

  return (
    <AuthContext.Provider
      value={{
        signIn: (email: string, password: string) => appSignIn(email, password),
        signOut: () => appSignOut(),
        createAccount: ({
          email,
          password,
          passwordConfirm,
          name,
        }: {
          email: string;
          password: string;
          passwordConfirm: string;
          name?: string;
        }) =>
          createAccount({ email, password, passwordConfirm, name }),
        isLoggedIn,
        isInitialized,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
