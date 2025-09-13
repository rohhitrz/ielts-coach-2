import { NextResponse } from "next/server";
import { generateWritingTask2Prompt } from "@/lib/openai-service";

export async function POST() {
  try {
    console.log("API Route: Starting Task 2 prompt generation...");
    const prompt = await generateWritingTask2Prompt();
    console.log("API Route: Generated Task 2 prompt:", prompt);
    return NextResponse.json({ prompt });
  } catch (error) {
    console.error("API Route Error (Task 2):", error);
    return NextResponse.json(
      { error: `Failed to generate prompt: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}