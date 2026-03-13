import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Remove trailing slash from API URL to prevent double slashes
    const PYTHON_API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://voichat1012-production.up.railway.app').replace(/\/$/, '');
    
    const response = await fetch(`${PYTHON_API_URL}/api/ablation-study`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Remove trailing slash from API URL to prevent double slashes
    const PYTHON_API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://voichat1012-production.up.railway.app').replace(/\/$/, '');
    
    const response = await fetch(`${PYTHON_API_URL}/api/ablation-study/example`);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
