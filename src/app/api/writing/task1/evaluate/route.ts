import { NextRequest, NextResponse } from "next/server";
import { evaluateWritingTask1 } from "@/lib/openai-service";

export async function POST(request: NextRequest) {
  try {
    const { response, prompt } = await request.json();
    
    if (!response || !prompt) {
      return NextResponse.json(
        { error: "Response and prompt are required" },
        { status: 400 }
      );
    }

    console.log("API Route: Evaluating Task 1 response...");
    const evaluation = await evaluateWritingTask1(response, prompt);
    console.log("API Route: Task 1 evaluation complete");
    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("Error evaluating Task 1 response:", error);
    return NextResponse.json(
      { error: `Failed to evaluate response: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}