import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.error(`[SYSTEM ERROR LOGGED] Component: ${body.component}\nError: ${body.error}\nStack: ${body.stack}\nInfo: ${body.info}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
