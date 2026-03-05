import { NextRequest, NextResponse } from "next/server";

// Placeholder — OAuth connect flow implementation in Sprint 1
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  return NextResponse.json(
    {
      message: `OAuth connect for ${provider} — implementation coming in Sprint 1`,
    },
    { status: 501 }
  );
}
