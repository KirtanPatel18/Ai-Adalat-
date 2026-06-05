/**
 * apps/web/app/api/documents/__tests__/versioning.test.ts
 *
 * Owner: Aayush Tilva (Team B — Backend) — Week 3, Issue #171
 *
 * Happy-path integration tests for:
 *   PATCH /api/documents/{id}         → creates DocumentVersion row
 *   GET  /api/documents/{id}/versions → returns version history
 *   GET  /api/audit/{document_id}     → returns AgentTrace[]
 *
 * Approach (same pattern as memory.supabase.test.ts by Yatri):
 *   Build a lightweight fake Supabase client that intercepts the query chain
 *   and returns canned responses. No live DB required; no SUPABASE_SERVICE_ROLE_KEY.
 *   This verifies the query shape and response mapping, not the DB itself.
 *
 * Run: pnpm --filter web test   (once vitest is added to web's devDependencies)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DocumentVersion, AgentTrace } from '@trionic/shared'

// ─── Mock Supabase query-builder factory ──────────────────────────────────────

/**
 * Builds a chainable fake Supabase client.
 * Every builder method (select/eq/order/limit/insert/update/single/maybeSingle)
 * returns `this` so chains work naturally. Terminal methods resolve with
 * the canned `response` value you provide.
 */
function buildMockSupabase(opts: {
  userResult?: { user: { id: string } | null; error: null | { message: string } }
  docResult?: { data: Record<string, unknown> | null; error: null | { message: string } }
  latestVersionResult?: { data: { version_num: number } | null }
  insertResult?: { data: Record<string, unknown> | null; error: null | { message: string } }
  updateResult?: { error: null | { message: string } }
  selectManyResult?: { data: Record<string, unknown>[] | null; error: null | { message: string } }
}) {
  const {
    userResult = { user: { id: 'user-abc' }, error: null },
    docResult = { data: { id: 'doc-001', owner_id: 'user-abc', current_version_id: null }, error: null },
    latestVersionResult = { data: null },
    insertResult = { data: null, error: null },
    updateResult = { error: null },
    selectManyResult = { data: [], error: null },
  } = opts

  // Inner builder — supports all the chained calls our routes make
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    // single() — used for doc lookup + insert
    single: vi.fn().mockImplementation(() => {
      // If called after insert, return insertResult; else docResult
      if (builder.insert.mock.calls.length > 0) return Promise.resolve(insertResult)
      return Promise.resolve(docResult)
    }),
    // maybeSingle() — used for version_num lookup
    maybeSingle: vi.fn().mockResolvedValue(latestVersionResult),
    // Awaiting the builder directly (used for multi-row selects and updates)
    then: vi.fn((resolve: (v: unknown) => void) => {
      if (builder.update.mock.calls.length > 0) return resolve({ error: updateResult.error })
      return resolve(selectManyResult)
    }),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: userResult, error: userResult.error }),
    },
    from: vi.fn().mockReturnValue(builder),
    _builder: builder,   // exposed for assertions
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a fake Next.js Request with a JSON body */
function makeRequest(body: unknown, method = 'PATCH'): Request {
  return new Request('http://localhost/api/documents/doc-001', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Unwrap a NextResponse to its JSON body */
async function json<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

// ─── PATCH /api/documents/{id} ────────────────────────────────────────────────

describe('PATCH /api/documents/{id}', () => {
  it('returns 400 when body_markdown is missing', async () => {
    // Dynamically import after vi.mock is hoisted
    const { PATCH } = await import('../[id]/route.js')

    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(buildMockSupabase({})),
    }))

    const req = makeRequest({ title: 'No body' })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-001' }) })

    expect(res.status).toBe(400)
    const body = await json<{ error: string }>(res)
    expect(body.error).toBe('bad_request')
  })

  it('returns 401 when user is not authenticated', async () => {
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(
        buildMockSupabase({
          userResult: { user: null, error: { message: 'no session' } },
        })
      ),
    }))

    const { PATCH } = await import('../[id]/route.js')
    const req = makeRequest({ body_markdown: 'Hello' })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-001' }) })

    expect(res.status).toBe(401)
    const body = await json<{ error: string }>(res)
    expect(body.error).toBe('unauthorized')
  })

  it('returns 404 when document is not found (or RLS blocked)', async () => {
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(
        buildMockSupabase({
          docResult: { data: null, error: { message: 'no rows returned' } },
        })
      ),
    }))

    const { PATCH } = await import('../[id]/route.js')
    const req = makeRequest({ body_markdown: 'Hello' })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-999' }) })

    expect(res.status).toBe(404)
  })

  it('happy path — creates version_num=1 on first edit and returns DocumentVersion', async () => {
    const newVersionRow = {
      id: 'ver-001',
      document_id: 'doc-001',
      version_num: 1,
      body_markdown: 'RTI application draft v1',
      change_note: null,
      created_by: 'user-abc',
      created_at: '2026-06-05T12:00:00Z',
    }

    const mockClient = buildMockSupabase({
      latestVersionResult: { data: null },              // no prior versions
      insertResult: { data: newVersionRow, error: null },
    })

    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(mockClient),
    }))

    const { PATCH } = await import('../[id]/route.js')
    const req = makeRequest({ body_markdown: 'RTI application draft v1' })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-001' }) })

    expect(res.status).toBe(200)

    const version = await json<DocumentVersion>(res)
    expect(version.id).toBe('ver-001')
    expect(version.version_num).toBe(1)
    expect(version.body_markdown).toBe('RTI application draft v1')
    expect(version.document_id).toBe('doc-001')
    expect(version.citations).toEqual([])  // citations in separate table
  })

  it('happy path — increments to version_num=2 on second edit', async () => {
    const newVersionRow = {
      id: 'ver-002',
      document_id: 'doc-001',
      version_num: 2,
      body_markdown: 'RTI application draft v2',
      change_note: 'fixed section reference',
      created_by: 'user-abc',
      created_at: '2026-06-05T13:00:00Z',
    }

    const mockClient = buildMockSupabase({
      latestVersionResult: { data: { version_num: 1 } },  // prior version exists
      insertResult: { data: newVersionRow, error: null },
    })

    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(mockClient),
    }))

    const { PATCH } = await import('../[id]/route.js')
    const req = makeRequest({
      body_markdown: 'RTI application draft v2',
      change_note: 'fixed section reference',
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'doc-001' }) })

    expect(res.status).toBe(200)
    const version = await json<DocumentVersion>(res)
    expect(version.version_num).toBe(2)
  })
})

// ─── GET /api/documents/{id}/versions ────────────────────────────────────────

describe('GET /api/documents/{id}/versions', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(
        buildMockSupabase({
          userResult: { user: null, error: { message: 'no session' } },
        })
      ),
    }))

    const { GET } = await import('../[id]/versions/route.js')
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'doc-001' }),
    })

    expect(res.status).toBe(401)
  })

  it('happy path — returns 3 versions in ascending order after 3 edits', async () => {
    const versionRows = [
      { id: 'ver-001', document_id: 'doc-001', version_num: 1, body_markdown: 'v1', change_note: null, created_by: 'user-abc', created_at: '2026-06-05T10:00:00Z' },
      { id: 'ver-002', document_id: 'doc-001', version_num: 2, body_markdown: 'v2', change_note: null, created_by: 'user-abc', created_at: '2026-06-05T11:00:00Z' },
      { id: 'ver-003', document_id: 'doc-001', version_num: 3, body_markdown: 'v3', change_note: null, created_by: 'user-abc', created_at: '2026-06-05T12:00:00Z' },
    ]

    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(
        buildMockSupabase({ selectManyResult: { data: versionRows, error: null } })
      ),
    }))

    const { GET } = await import('../[id]/versions/route.js')
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'doc-001' }),
    })

    expect(res.status).toBe(200)
    const body = await json<{ versions: DocumentVersion[] }>(res)
    expect(body.versions).toHaveLength(3)

    // Verify ascending order and shape
    expect(body.versions[0].version_num).toBe(1)
    expect(body.versions[1].version_num).toBe(2)
    expect(body.versions[2].version_num).toBe(3)
    expect(body.versions[0].citations).toEqual([])
  })

  it('returns empty array when document has no versions yet', async () => {
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(
        buildMockSupabase({ selectManyResult: { data: [], error: null } })
      ),
    }))

    const { GET } = await import('../[id]/versions/route.js')
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'doc-new' }),
    })

    expect(res.status).toBe(200)
    const body = await json<{ versions: DocumentVersion[] }>(res)
    expect(body.versions).toHaveLength(0)
  })
})

// ─── GET /api/audit/{document_id} ────────────────────────────────────────────

describe('GET /api/audit/{document_id}', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(
        buildMockSupabase({
          userResult: { user: null, error: { message: 'no session' } },
        })
      ),
    }))

    const { GET } = await import('../../audit/[document_id]/route.js')
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ document_id: 'doc-001' }),
    })

    expect(res.status).toBe(401)
  })

  it('happy path — maps agent_traces DB columns to AgentTrace shape', async () => {
    const traceRows = [
      {
        id: 'trace-001',
        document_id: 'doc-001',
        user_id: 'user-abc',
        agent_name: 'classifier',
        llm_provider: 'anthropic',
        model_name: 'claude-3-5-sonnet-20241022',
        prompt_tokens: 420,
        completion_tokens: 88,
        cost_usd: '0.001512',
        latency_ms: 1102,
        status: 'ok',
        error_msg: null,
        metadata: { cited_nodes: [] },
        created_at: '2026-06-05T10:00:00Z',
      },
      {
        id: 'trace-002',
        document_id: 'doc-001',
        user_id: 'user-abc',
        agent_name: 'citator-gatekeeper',
        llm_provider: 'anthropic',
        model_name: 'claude-3-5-sonnet-20241022',
        prompt_tokens: 1240,
        completion_tokens: 120,
        cost_usd: '0.004512',
        latency_ms: 1830,
        status: 'ok',
        error_msg: null,
        metadata: { cited_nodes: ['ICA-1872/CH-VI/S-73'] },
        created_at: '2026-06-05T10:01:00Z',
      },
    ]

    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(
        buildMockSupabase({ selectManyResult: { data: traceRows, error: null } })
      ),
    }))

    const { GET } = await import('../../audit/[document_id]/route.js')
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ document_id: 'doc-001' }),
    })

    expect(res.status).toBe(200)
    const body = await json<{ traces: AgentTrace[] }>(res)
    expect(body.traces).toHaveLength(2)

    // Verify DB column → AgentTrace field mapping
    const [classifier, citator] = body.traces
    expect(classifier.agent).toBe('classifier')
    expect(classifier.model).toBe('anthropic/claude-3-5-sonnet-20241022')
    expect(classifier.tokens_in).toBe(420)
    expect(classifier.tokens_out).toBe(88)
    expect(classifier.cited_nodes).toEqual([])
    expect(classifier.status).toBe('ok')
    expect(classifier.timestamp).toBe('2026-06-05T10:00:00Z')

    expect(citator.agent).toBe('citator-gatekeeper')
    expect(citator.cited_nodes).toEqual(['ICA-1872/CH-VI/S-73'])
  })

  it('returns empty traces when no agent calls exist for document', async () => {
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue(
        buildMockSupabase({ selectManyResult: { data: [], error: null } })
      ),
    }))

    const { GET } = await import('../../audit/[document_id]/route.js')
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ document_id: 'doc-no-traces' }),
    })

    expect(res.status).toBe(200)
    const body = await json<{ traces: AgentTrace[] }>(res)
    expect(body.traces).toHaveLength(0)
  })
})
