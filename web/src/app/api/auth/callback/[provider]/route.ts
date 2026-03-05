import { NextRequest, NextResponse } from "next/server";

// Placeholder — OAuth callback implementation in Sprint 1
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  return NextResponse.json(
    {
      message: `OAuth callback for ${provider} — implementation coming in Sprint 1`,
    },
    { status: 501 }
  );
}
