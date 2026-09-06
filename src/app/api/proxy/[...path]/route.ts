import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_URL = 'https://upaos.onrender.com';

async function proxyHandler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetPath = path.join('/');
  const searchParams = req.nextUrl.search;
  const targetUrl = `${UPSTREAM_URL}/${targetPath}${searchParams}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!['host', 'origin', 'referer', 'content-length'].includes(lower)) {
      headers.set(key, value);
    }
  });

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text();

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const resBody = await upstreamRes.text();
    const contentType = upstreamRes.headers.get('Content-Type') || 'application/json';

    return new NextResponse(resBody, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido de red';
    return NextResponse.json(
      { success: false, message: `Error conectando al backend de UPAO: ${msg}` },
      { status: 502 }
    );
  }
}

export {
  proxyHandler as GET,
  proxyHandler as POST,
  proxyHandler as PATCH,
  proxyHandler as PUT,
  proxyHandler as DELETE,
};
