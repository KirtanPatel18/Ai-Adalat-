'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { AgentStreamEvent, SupportedLanguage } from '@trionic/shared'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

interface StreamingIndicatorProps {
  documentId: string
  intakeText: string
  targetLanguage: SupportedLanguage
  docType?: string
  onCancel: () => void
}

interface StepItem {
  id: string
  agent: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
}

export function StreamingIndicator({
  documentId,
  intakeText,
  targetLanguage,
  docType,
  onCancel,
}: StreamingIndicatorProps) {
  const router = useRouter()
  const supabase = createClient()
  const streamStarted = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [steps, setSteps] = useState<StepItem[]>([
    { id: '1', agent: 'classifier', label: 'Classifying your issue', status: 'pending' },
    { id: '2', agent: 'planner', label: 'Identifying applicable Acts', status: 'pending' },
    { id: '3', agent: 'pageindex', label: 'Retrieving legal sections', status: 'pending' },
    { id: '4', agent: 'drafter', label: 'Drafting', status: 'pending' },
    { id: '5', agent: 'citator', label: 'Verifying citations', status: 'pending' },
    { id: '6', agent: 'reviewer', label: 'Final review', status: 'pending' },
  ])

  const [statusMessage, setStatusMessage] = useState('Usually takes ~30 seconds')
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Dynamically add translation step if needed
  useEffect(() => {
    if (targetLanguage !== 'en') {
      setSteps((prev) => {
        if (prev.some((s) => s.agent === 'translator')) return prev
        return [
          ...prev,
          { id: '7', agent: 'translator', label: 'Translating draft', status: 'pending' },
        ]
      })
    }
  }, [targetLanguage])

  useEffect(() => {
    if (streamStarted.current) return
    streamStarted.current = true

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    async function runMockStream() {
      setStatusMessage('Demo Mode: Simulating agent pipeline...')
      try {
        const mockEvents: any[] = [
          { type: 'step.start', agent: 'classifier' },
          { type: 'step.done', agent: 'classifier' },
          { type: 'step.start', agent: 'planner' },
          { type: 'step.done', agent: 'planner' },
          { type: 'step.start', agent: 'pageindex' },
          { type: 'step.done', agent: 'pageindex' },
          { type: 'step.start', agent: 'drafter' },
          { type: 'step.done', agent: 'drafter' },
          { type: 'step.start', agent: 'citator' },
          { type: 'step.done', agent: 'citator' },
          { type: 'step.start', agent: 'reviewer' },
          { type: 'step.done', agent: 'reviewer' },
        ]

        if (targetLanguage !== 'en') {
          mockEvents.splice(mockEvents.length, 0, 
            { type: 'step.start', agent: 'translator' },
            { type: 'step.done', agent: 'translator' }
          )
        }

        mockEvents.push({
          type: 'draft.final',
          response: {
            document_id: documentId,
            version_id: 'v1',
            body_markdown: '# Mock Draft',
            citations: [],
            trace_ids: [],
            warnings: [],
          },
        })

        for (const event of mockEvents) {
          if (abortController.signal.aborted) return

          if (event.type === 'step.start') {
            await delay(1200 + Math.random() * 850)
          } else if (event.type === 'step.done') {
            await delay(600 + Math.random() * 600)
          } else if (event.type === 'draft.final') {
            await delay(1000)
          }

          if (abortController.signal.aborted) return
          handleEvent(event)
        }
      } catch (err) {
        console.error('Mock stream error:', err)
      }
    }

    async function startStream() {
      try {
        const response = await fetch('/api/draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_id: documentId,
            intake_text: intakeText,
            target_language: targetLanguage,
            doc_type: docType || undefined,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Server error: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('Readable stream not supported by browser/server response')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6)
              try {
                const event = JSON.parse(jsonStr) as AgentStreamEvent
                handleEvent(event)
              } catch (err) {
                console.error('Failed to parse SSE event:', err)
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Stream aborted by client')
          return
        }
        console.warn('Real SSE connection failed, falling back to mock stream:', err.message || err)
        await runMockStream()
      }
    }

    startStream()

    return () => {
      // Clean up connection on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [documentId, intakeText, targetLanguage, docType])

  function handleEvent(event: AgentStreamEvent) {
    if (event.type === 'step.start') {
      setSteps((prev) =>
        prev.map((step) =>
          step.agent === event.agent ? { ...step, status: 'running' } : step
        )
      )
    } else if (event.type === 'step.done') {
      setSteps((prev) =>
        prev.map((step) =>
          step.agent === event.agent ? { ...step, status: 'done' } : step
        )
      )
    } else if (event.type === 'step.error') {
      setSteps((prev) =>
        prev.map((step) =>
          step.agent === event.agent ? { ...step, status: 'error' } : step
        )
      )
      setIsError(true)
      setErrorMessage(event.message || `Error in ${event.agent} agent`)
      setStatusMessage('Generation failed')
    } else if (event.type === 'draft.final') {
      // Automatically redirect to draft/[id] editor
      router.push(`/draft/${documentId}`)
    }
  }

  async function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    try {
      // Update status to 'failed' using RLS policy permissions
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId)
    } catch (err) {
      console.error('Failed to update document status to failed:', err)
    }

    onCancel()
  }

  return (
    <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-zinc-200 p-8 shadow-xl relative overflow-hidden transition-all">
      {/* Background soft glow indicator */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse" />

      <div className="flex flex-col items-center text-center mb-8 mt-2">
        {!isError ? (
          <div className="size-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4 shadow-inner">
            <Loader2 className="size-6 text-zinc-900 animate-spin" />
          </div>
        ) : (
          <div className="size-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
            <AlertCircle className="size-6 text-red-600" />
          </div>
        )}
        <h2 className="text-xl font-bold text-zinc-900">
          {isError ? 'Generation Interrupted' : 'Generating your draft...'}
        </h2>
        <p className={`text-sm mt-1 font-medium ${isError ? 'text-red-500' : 'text-zinc-500'}`}>
          {statusMessage}
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-4 mb-8">
        {steps.map((step) => {
          return (
            <div key={step.id} className="flex items-center gap-4 py-1.5 px-3 rounded-xl hover:bg-zinc-50 transition-colors">
              <div className="flex items-center justify-center size-6 shrink-0">
                {step.status === 'pending' && (
                  <div className="size-4 rounded-full border-2 border-zinc-300 bg-white" />
                )}
                {step.status === 'running' && (
                  <Loader2 className="size-5 text-blue-600 animate-spin" />
                )}
                {step.status === 'done' && (
                  <CheckCircle2 className="size-5 text-green-600 fill-green-50" />
                )}
                {step.status === 'error' && (
                  <XCircle className="size-5 text-red-600 fill-red-50" />
                )}
              </div>
              <span
                className={`text-sm font-medium transition-colors ${
                  step.status === 'done'
                    ? 'text-zinc-500 line-through decoration-zinc-300'
                    : step.status === 'running'
                    ? 'text-zinc-900 font-semibold'
                    : step.status === 'error'
                    ? 'text-red-600'
                    : 'text-zinc-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {isError && errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-700 font-medium whitespace-pre-wrap leading-relaxed">
          {errorMessage}
        </div>
      )}

      {/* Cancel Action */}
      <div className="flex justify-center border-t border-zinc-100 pt-6">
        <button
          onClick={handleCancel}
          className="px-6 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-2xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-zinc-300"
        >
          {isError ? 'Go back' : 'Cancel Generation'}
        </button>
      </div>
    </div>
  )
}
