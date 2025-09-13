import { NextRequest, NextResponse } from "next/server";
import { generateSpeakingQuestion } from "@/lib/openai-service";

export async function POST(request: NextRequest) {
  try {
    const { part } = await request.json();
    
    if (!part || ![1, 2, 3].includes(part)) {
      return NextResponse.json(
        { error: "Valid part number (1, 2, or 3) is required" },
        { status: 400 }
      );
    }

    const question = await generateSpeakingQuestion(part);
    return NextResponse.json({ question });
  } catch (error) {
    console.error("Error generating speaking question:", error);
    return NextResponse.json(
      { error: "Failed to generate question" },
      { status: 500 }
    );
  }
}