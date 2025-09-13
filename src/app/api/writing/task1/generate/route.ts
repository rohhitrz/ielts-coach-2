import { NextResponse } from "next/server";
import { generateWritingTask1Prompt } from "@/lib/openai-service";

export async function POST() {
  try {
    console.log("API Route: Starting Task 1 prompt generation...");
    const result = await generateWritingTask1Prompt();
    console.log("API Route: Generated Task 1 with image");
    return NextResponse.json(result);
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: `Failed to generate prompt: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}