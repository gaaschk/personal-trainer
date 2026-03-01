import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_TEXT_CHARS = 80_000;           // ~20k tokens

const SUPPORTED_TYPES: Record<string, 'pdf' | 'image' | 'text'> = {
  'application/pdf':  'pdf',
  'image/jpeg':       'image',
  'image/png':        'image',
  'image/gif':        'image',
  'image/webp':       'image',
  'text/plain':       'text',
  'text/csv':         'text',
  'application/json': 'text',
};

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 });
  }

  const category = SUPPORTED_TYPES[file.type];
  if (!category) {
    return NextResponse.json(
      { error: `Unsupported file type "${file.type}". Supported: PDF, images (JPEG/PNG/GIF/WEBP), plain text.` },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (category === 'pdf') {
      // Avoid Next.js / Turbopack test-file issue by importing from lib path
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
        buf: Buffer,
      ) => Promise<{ text: string; numpages: number }>;

      const data = await pdfParse(buffer);
      const text = data.text.trim();
      const content = text.length > MAX_TEXT_CHARS
        ? text.slice(0, MAX_TEXT_CHARS) + '\n\n[… document truncated …]'
        : text;

      return NextResponse.json({
        name:    file.name,
        kind:    'pdf',
        content,
        pages:   data.numpages,
      });
    }

    if (category === 'image') {
      return NextResponse.json({
        name:     file.name,
        kind:     'image',
        content:  buffer.toString('base64'),
        mimeType: file.type,
      });
    }

    // text / csv / json
    const raw = buffer.toString('utf-8');
    const content = raw.length > MAX_TEXT_CHARS
      ? raw.slice(0, MAX_TEXT_CHARS) + '\n\n[… file truncated …]'
      : raw;

    return NextResponse.json({ name: file.name, kind: 'text', content });
  } catch (err) {
    console.error('[upload] processing error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process file' },
      { status: 500 },
    );
  }
}
