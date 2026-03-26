import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Use Supabase client auth methods for login/signup/session handling.",
  });
}
