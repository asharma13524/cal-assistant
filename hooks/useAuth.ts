'use client'

import { useState, useEffect, useCallback } from 'react'

export interface User {
  id: string
  email: string
  name: string
  picture: string
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  })

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()

      setState({
        isAuthenticated: data.authenticated,
        isLoading: false,
        user: data.user,
      })
    } catch (error) {
      console.error('Failed to check auth:', error)
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      })
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const signIn = useCallback(() => {
    window.location.href = '/api/auth/google'
  }, [])

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      })
      window.location.href = '/'
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }, [])

  return {
    ...state,
    signIn,
    signOut,
    refreshAuth: checkAuth,
  }
}

