'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SupportedLanguage } from '@trionic/shared'

const LANGUAGES: { value: SupportedLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'gu', label: 'ગુજરાતી' },
  { value: 'mr', label: 'मराठी' },
  { value: 'ta', label: 'தமிழ்' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [language, setLanguage] = useState<SupportedLanguage>('en')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!displayName.trim()) {
      setError('Please enter your name')
      return
    }

    setLoading(true)
    setError(null)

    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName,
        default_language: language,
        onboarded: true,
      }),
    })

if (!response.ok) {
  const data = await response.json()
  setError(data.message || 'Something went wrong. Please try again.')
  setLoading(false)
  return
}

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">
          Welcome to Trionic Adalat
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Let's set up your account in a few seconds.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What should we call you?
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What language do you prefer for drafts?
            </label>
            <div className="space-y-2">
              {LANGUAGES.map((lang) => (
                <label key={lang.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="language"
                    value={lang.value}
                    checked={language === lang.value}
                    onChange={() => setLanguage(lang.value)}
                    className="accent-black"
                  />
                  <span className="text-sm">{lang.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue →'}
          </button>
        </div>

        <p className="text-xs text-center text-gray-400 mt-6">
          AI-generated drafts — not legal advice
        </p>
      </div>
    </div>
  )
}