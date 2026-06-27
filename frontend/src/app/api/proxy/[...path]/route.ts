import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

async function handler(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname.replace('/api/proxy', '');
    const url = `${BACKEND_URL}${path}${req.nextUrl.search}`;

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      if (!['host', 'connection'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    const res = await fetch(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : undefined,
    });

    const resHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch {
    return NextResponse.json(
      { detail: 'Backend tidak tersedia. Pastikan server FastAPI berjalan.' },
      { status: 503 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
