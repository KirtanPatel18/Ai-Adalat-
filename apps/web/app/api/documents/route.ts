import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupportedLanguage, DocumentType, Document, DocumentStatus } from '@trionic/shared'

// ─── DB Enum Mapping Helpers ────────────────────────────────────────────────

function sharedToDbDocType(type?: string): 'petition' | 'affidavit' | 'notice' | 'agreement' | 'complaint' | 'reply' | 'other' {
  if (type === 'rti_application') return 'petition'
  if (type === 'legal_notice' || type === 'cheque_bounce_notice') return 'notice'
  if (type === 'nda') return 'agreement'
  if (type === 'consumer_complaint') return 'complaint'
  return 'other'
}

function dbToSharedDocType(dbType: string, title?: string): DocumentType {
  if (dbType === 'petition') return 'rti_application'
  if (dbType === 'agreement') return 'nda'
  if (dbType === 'complaint') return 'consumer_complaint'
  if (dbType === 'notice') {
    if (title && /cheque/i.test(title)) {
      return 'cheque_bounce_notice'
    }
    return 'legal_notice'
  }
  return 'legal_notice' // Default fallback
}

function sharedToDbStatus(status?: string): 'draft' | 'review' | 'final' | 'archived' | 'failed' {
  if (status === 'generating') return 'review'
  if (status === 'exported') return 'final'
  if (status === 'draft' || status === 'final' || status === 'archived' || status === 'failed') {
    return status
  }
  return 'draft'
}

function dbToSharedStatus(dbStatus: string): DocumentStatus {
  if (dbStatus === 'review') return 'generating'
  if (dbStatus === 'draft' || dbStatus === 'final' || dbStatus === 'archived' || dbStatus === 'failed') {
    return dbStatus as DocumentStatus
  }
  return 'draft'
}

// ─── POST /api/documents ─────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Authentication required' }, { status: 401 })
    }

    // 2. Parse and validate body
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'bad_request', message: 'Invalid JSON body' }, { status: 400 })
    }

    const { doc_type, language, intake_text } = body

    if (!language || typeof language !== 'string') {
      return NextResponse.json({ error: 'bad_request', message: 'language is required and must be a string' }, { status: 400 })
    }
    if (!intake_text || typeof intake_text !== 'string' || intake_text.trim().length === 0) {
      return NextResponse.json({ error: 'bad_request', message: 'intake_text is required and must not be empty' }, { status: 400 })
    }

    const allowedLanguages = ['en', 'hi', 'gu', 'mr', 'ta']
    if (!allowedLanguages.includes(language)) {
      return NextResponse.json({ error: 'bad_request', message: `language must be one of: ${allowedLanguages.join(', ')}` }, { status: 400 })
    }

    if (doc_type !== undefined) {
      const allowedDocTypes = ['rti_application', 'legal_notice', 'nda', 'consumer_complaint', 'cheque_bounce_notice']
      if (!allowedDocTypes.includes(doc_type)) {
        return NextResponse.json({ error: 'bad_request', message: `doc_type must be one of: ${allowedDocTypes.join(', ')}` }, { status: 400 })
      }
    }

    // 3. Map values for database
    const dbDocType = sharedToDbDocType(doc_type)
    
    // Derive initial title from doc_type or intake preview
    let title = 'Untitled Draft'
    if (doc_type) {
      const docTypeLabels: Record<string, string> = {
        rti_application: 'RTI Application',
        legal_notice: 'Legal Notice',
        nda: 'NDA',
        consumer_complaint: 'Consumer Complaint',
        cheque_bounce_notice: 'Cheque Bounce Notice'
      }
      title = docTypeLabels[doc_type] || 'Untitled Draft'
    } else {
      // preview first 30 chars of intake
      const preview = intake_text.trim().slice(0, 30)
      title = preview.length > 0 ? (preview.length === 30 ? `${preview}...` : preview) : 'Untitled Draft'
    }

    // 4. Create document in DB
    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        owner_id: user.id,
        title,
        doc_type: dbDocType,
        language,
        intake_text,
        status: 'draft'
      })
      .select('id')
      .single()

    if (insertError || !document) {
      console.error('[POST /api/documents] DB insert failed:', insertError)
      return NextResponse.json({ error: 'internal', message: 'Failed to create document record' }, { status: 500 })
    }

    return NextResponse.json({ document_id: document.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/documents] handler exception:', err)
    return NextResponse.json({ error: 'internal', message: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

// ─── GET /api/documents ──────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Authentication required' }, { status: 401 })
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const doc_type = searchParams.get('doc_type')
    const language = searchParams.get('language')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const cursor = searchParams.get('cursor')

    // 3. Build query
    let query = supabase
      .from('documents')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', sharedToDbStatus(status))
    }
    if (doc_type) {
      query = query.eq('doc_type', sharedToDbDocType(doc_type))
    }
    if (language) {
      query = query.eq('language', language)
    }
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    // 4. Fetch from DB
    const { data: dbDocs, error: queryError } = await query

    if (queryError) {
      console.error('[GET /api/documents] DB select failed:', queryError)
      return NextResponse.json({ error: 'internal', message: 'Failed to query documents' }, { status: 500 })
    }

    // 5. Map DB rows back to @trionic/shared Document types
    const documents: Document[] = (dbDocs || []).map((row) => ({
      id: row.id,
      owner_id: row.owner_id,
      title: row.title,
      doc_type: dbToSharedDocType(row.doc_type, row.title),
      language: row.language as SupportedLanguage,
      status: dbToSharedStatus(row.status),
      current_version_id: row.current_version_id || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))

    const nextCursor = dbDocs && dbDocs.length === limit ? dbDocs[dbDocs.length - 1].created_at : null

    return NextResponse.json({
      documents,
      next_cursor: nextCursor
    }, { status: 200 })
  } catch (err) {
    console.error('[GET /api/documents] handler exception:', err)
    return NextResponse.json({ error: 'internal', message: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
