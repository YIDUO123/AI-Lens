/**
 * better-auth 客户端 hooks
 * - 客户端组件用这个:useSession()、signIn()、signOut()
 * - Server Component 里请直接 import auth from '@/lib/auth'
 */
'use client';

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
