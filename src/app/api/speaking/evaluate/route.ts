import { NextRequest, NextResponse } from "next/server";
import { evaluateSpeakingResponse } from "@/lib/openai-service";

export async function POST(request: NextRequest) {
  try {
    const { response, question, part } = await request.json();

    if (!response || !question || !part) {
      return NextResponse.json(
        { error: "Response, question, and part are required" },
        { status: 400 }
      );
    }

    console.log(`API Route: Evaluating Speaking Part ${part} response...`);
    const evaluation = await evaluateSpeakingResponse(response, question, part);
    console.log("API Route: Speaking evaluation complete");
    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("Error evaluating speaking response:", error);
    return NextResponse.json(
      { error: `Failed to evaluate response: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
