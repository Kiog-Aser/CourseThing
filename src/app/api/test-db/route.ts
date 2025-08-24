import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET() {
  try {
    // Test basic database connection
    const result = await db.$queryRaw`SELECT 1 as test`;

    // Test if NextAuth tables exist
    const userCount = await db.user.count();
    const accountCount = await db.account.count();
    const sessionCount = await db.session.count();
    const verificationTokenCount = await db.verificationToken.count();

    return NextResponse.json({
      success: true,
      message: "Database connection successful!",
      data: {
        connection: result,
        tables: {
          users: userCount,
          accounts: accountCount,
          sessions: sessionCount,
          verificationTokens: verificationTokenCount,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
