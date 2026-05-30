import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import { Document, Packer, Paragraph, TextRun, Header, HeadingLevel } from 'docx';
import { promises as fs } from 'fs';
import path from 'path';

// ----------------------------------------------------------------------
// TYPES & CONSTANTS
// ----------------------------------------------------------------------
type ExportFormat = 'pdf' | 'docx';
type ExportResult = {
  url: string;
  format: ExportFormat;
  expires_in: number;
};

const BANNER_TEXT = "AI-generated draft — not legal advice";

// TODO: Remove this mock data once database fetching is implemented
const MOCK_DOCUMENT = {
  body_markdown: "# Software Services Agreement\n\nThis agreement is entered into subject to the jurisdiction of the courts of New Delhi, India. The service provider agrees to deliver the software modules as per the specifications outlined in Annexure A. All intellectual property rights shall be governed by the applicable laws of India.",
  citations: [
    { text: "The Indian Contract Act, 1872" },
    { text: "The Information Technology Act, 2000" },
    { text: "The Companies Act, 2013" }
  ]
};

// ----------------------------------------------------------------------
// MAIN API HANDLER
// ----------------------------------------------------------------------
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    // 1. Initialize Supabase (Using public anon key per Trionic guidelines)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[Export API] Missing PUBLIC Supabase variables.");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 2. Parse and Validate Request
    const resolvedParams = await context.params;
    const documentId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') as ExportFormat;
    const includeAppendix = searchParams.get('include_appendix') !== 'false';

    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json({ error: 'Unsupported format. Use pdf or docx.' }, { status: 400 });
    }

    // TODO: Fetch actual document from Supabase DB using documentId here
    // const { data: docData } = await supabase.from('documents').select('*').eq('id', documentId).single();
    const docData = MOCK_DOCUMENT;

    // 3. Generate File Buffer
    const fileBuffer = format === 'pdf'
      ? await buildPdf(docData, includeAppendix)
      : await buildDocx(docData, includeAppendix);

    // 4. Generate Unique Filename
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).replace(/[\/\s:,]/g, '-');
    const fileName = `export_${timestamp}.${format}`;

    // ------------------------------------------------------------------
    // MOCK STORAGE UPLOAD 
    // TODO: Awaiting PR #103 (Auth). Replace this block with Supabase Storage.
    // ------------------------------------------------------------------
    const publicDir = path.join(process.cwd(), 'public', 'temp-exports');
    await fs.mkdir(publicDir, { recursive: true });

    const localFilePath = path.join(publicDir, fileName);
    await fs.writeFile(localFilePath, fileBuffer);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const finalUrl = `${baseUrl}/temp-exports/${fileName}`;
    // ------------------------------------------------------------------

    // 5. Return Result
    return NextResponse.json({
      url: finalUrl,
      format: format,
      expires_in: 300
    } satisfies ExportResult);

  } catch (err) {
    console.error('[Export Route] Critical crash during file generation:', err);
    return NextResponse.json({ error: 'Failed to export document' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// EXPORT ENGINES
// ----------------------------------------------------------------------

async function buildPdf(doc: typeof MOCK_DOCUMENT, includeAppendix: boolean): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  let appendixHtml = '';
  if (includeAppendix && doc.citations.length > 0) {
    const listItems = doc.citations.map(c => `<li>${c.text}</li>`).join('');
    appendixHtml = `
      <div style="margin-top: 40px; border-top: 1px solid black; padding-top: 20px;">
        <h2>Citation Appendix</h2>
        <ul>${listItems}</ul>
      </div>
    `;
  }

  const html = `
    <div style="text-align: center; color: red; font-weight: bold; padding-bottom: 10px; border-bottom: 1px solid #ccc; font-family: sans-serif;">
      ${BANNER_TEXT}
    </div>
    <div style="padding: 40px; font-family: serif; line-height: 1.6;">
      ${doc.body_markdown.replace(/\n/g, '<br/>')}
      ${appendixHtml}
    </div>
  `;

  await page.setContent(html);
  const pdfBytes = await page.pdf({ format: 'A4' });
  await browser.close();

  return Buffer.from(pdfBytes);
}

async function buildDocx(doc: typeof MOCK_DOCUMENT, includeAppendix: boolean): Promise<Buffer> {
  const children: any[] = [
    new Paragraph({
      children: [new TextRun({ text: doc.body_markdown })]
    })
  ];

  if (includeAppendix && doc.citations.length > 0) {
    children.push(
      new Paragraph({ text: "Citation Appendix", heading: HeadingLevel.HEADING_1, spacing: { before: 400 } })
    );
    doc.citations.forEach(c => {
      children.push(new Paragraph({ text: c.text, bullet: { level: 0 } }));
    });
  }

  const document = new Document({
    sections: [{
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [new TextRun({ text: BANNER_TEXT, color: "FF0000", bold: true })]
            })
          ]
        })
      },
      children
    }]
  });

  return await Packer.toBuffer(document);
}