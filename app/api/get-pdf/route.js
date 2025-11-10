import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'avisos/' });
    
    if (blobs.length === 0) {
      return NextResponse.json({ url: null });
    }
    
    return NextResponse.json({ url: blobs[0].url });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}