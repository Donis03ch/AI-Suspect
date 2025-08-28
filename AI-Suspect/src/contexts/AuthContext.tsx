
"use client";

import type { User } from 'firebase/auth';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  loadingAuth: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Signed in with Google successfully!" });
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: "Signed up successfully!" });
    } catch (error: any) {
      console.error("Email Sign-Up Error:", error);
      toast({ title: "Sign-Up Failed", description: error.message, variant: "destructive" });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Signed in successfully!" });
    } catch (error: any) {
      console.error("Email Sign-In Error:", error);
      toast({ title: "Sign-In Failed", description: error.message, variant: "destructive" });
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed out successfully." });
    } catch (error: any) {
      console.error("Sign-Out Error:", error);
      toast({ title: "Sign-Out Failed", description: error.message, variant: "destructive" });
    }
  };
  
  const value = {
    currentUser,
    loadingAuth,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signOutUser,
  };

  return <AuthContext.Provider value={value}>{!loadingAuth && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
