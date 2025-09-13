import OpenAI from "openai";
import { env } from "@/env.mjs";

// Initialize OpenAI client only when needed (server-side)
function getOpenAI() {
  console.log(
    "Getting OpenAI client with API key:",
    env.OPENAI_API_KEY ? "Present" : "Missing"
  );
  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

// Utility function to clean markdown formatting from AI responses
function cleanMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic markdown
    .replace(/__(.*?)__/g, '$1')     // Remove underline markdown
    .replace(/_(.*?)_/g, '$1')       // Remove italic underscore
    .replace(/`(.*?)`/g, '$1')       // Remove inline code
    .replace(/#{1,6}\s/g, '')        // Remove headers
    .trim();
}

// IELTS Writing Task 1 evaluation criteria
const WRITING_TASK1_CRITERIA = `
Coherence and Cohesion (25% of score):
- Logical organization of information
- Clear progression of ideas
- Appropriate use of cohesive devices

Lexical Resource (25% of score):
- Range and accuracy of vocabulary
- Appropriate word choice
- Spellings and word formation

Grammatical Range and Accuracy (25% of score):
- Range of sentence structures
- Accuracy of grammar and punctuation

Task Achievement (25% of score):
- Addressing all parts of the task
- Clear, detailed overview of main features
- Accurate reporting of data
- Clear comparisons where relevant
`;

// IELTS Writing Task 2 evaluation criteria
const WRITING_TASK2_CRITERIA = `
Coherence and Cohesion (25% of score):
- Logical organization of ideas
- Clear progression throughout the response
- Appropriate use of cohesive devices

Lexical Resource (25% of score):
- Wide range of vocabulary
- Natural and accurate use of vocabulary
- Skilful use of uncommon vocabulary

Grammatical Range and Accuracy (25% of score):
- Wide range of structures
- Majority of sentences are error-free
- Good control of grammar and punctuation

Task Response (25% of score):
- Fully addresses all parts of the task
- Presents a clear position
- Presents, extends and supports ideas
- Coherent and well-organized response
`;

// IELTS Speaking evaluation criteria
const SPEAKING_CRITERIA = `
Fluency and Coherence (25% of score):
- Speaks at length without noticeable effort or loss of coherence
- Maintains flow despite occasional hesitations
- Logical organization of ideas
- Effective use of discourse markers

Lexical Resource (25% of score):
- Wide range of vocabulary
- Precise and appropriate vocabulary choices
- Good understanding of collocations and idiomatic expressions

Grammatical Range and Accuracy (25% of score):
- Wide range of structures
- Frequent error-free sentences
- Good control of grammar and punctuation

Pronunciation (25% of score):
- Clear and intelligible pronunciation
- Effective use of intonation and stress
- Minimal L1 interference
`;

export async function generateWritingTask1Prompt(): Promise<{
  prompt: string;
  imageUrl: string;
}> {
  try {
    console.log("OpenAI Service: Getting client...");
    const openai = getOpenAI();
    console.log("OpenAI Service: Client created, generating chart data...");

    // First, generate the chart data and description
    const chartCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Generate IELTS Academic Writing Task 1 data. Create realistic data for a chart/graph with specific numbers, categories, and time periods. Include the type of chart (bar chart, line graph, pie chart, table, etc.) and all necessary details.",
        },
        {
          role: "user",
          content:
            "Generate detailed data for an IELTS Task 1 visual (chart/graph/table) with specific numbers, categories, time periods, and clear trends for analysis.",
        },
      ],
      max_tokens: 200,
    });

    const chartData = chartCompletion.choices[0]?.message?.content;
    if (!chartData) {
      throw new Error(
        "Failed to generate chart data - no content returned from OpenAI"
      );
    }

    // Generate the image based on the chart data
    console.log("OpenAI Service: Generating image...");
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create a clean, professional IELTS Academic Writing Task 1 chart/graph based on this data: ${chartData}. Make it look like an official IELTS exam chart with clear labels, numbers, axes, and title. Use a simple, academic style with black text on white background.`,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    if (!imageResponse.data || imageResponse.data.length === 0) {
      throw new Error(
        "Failed to generate image - no data returned from OpenAI"
      );
    }

    const imageUrl = imageResponse.data[0]?.url;
    if (!imageUrl) {
      throw new Error("Failed to generate image - no URL returned from OpenAI");
    }

    // Generate the official IELTS prompt
    const promptCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an IELTS examiner. Create the official IELTS Academic Writing Task 1 instructions based on the provided chart data. Use the standard IELTS format and language.",
        },
        {
          role: "user",
          content: `Create an official IELTS Writing Task 1 prompt for this chart: ${chartData}. Include the standard instructions: "You should spend about 20 minutes on this task. The chart/graph shows... Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."`,
        },
      ],
      max_tokens: 200,
    });

    const prompt = promptCompletion.choices[0]?.message?.content;
    if (!prompt) {
      throw new Error(
        "Failed to generate prompt - no content returned from OpenAI"
      );
    }

    console.log("OpenAI Service: Generated Task 1 with image");
    return { prompt, imageUrl };
  } catch (error) {
    console.error("OpenAI Service Error:", error);
    throw error;
  }
}

export async function evaluateWritingTask1(
  response: string,
  prompt: string
): Promise<{
  overallBand: string;
  taskAchievement: { score: string; feedback: string };
  coherenceCohesion: { score: string; feedback: string };
  lexicalResource: { score: string; feedback: string };
  grammaticalRange: { score: string; feedback: string };
  detailedFeedback: string;
}> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an official IELTS examiner evaluating Writing Task 1 (Academic). Provide detailed scoring for each of the 4 assessment criteria:

1. TASK ACHIEVEMENT (25%):
- Addresses all requirements of the task
- Presents clear overview of main trends/features
- Accurately reports data
- Makes appropriate comparisons

2. COHERENCE AND COHESION (25%):
- Logical organization of information
- Clear progression of ideas
- Appropriate use of cohesive devices
- Clear paragraphing

3. LEXICAL RESOURCE (25%):
- Range and accuracy of vocabulary
- Appropriate word choice for academic writing
- Correct spelling and word formation

4. GRAMMATICAL RANGE AND ACCURACY (25%):
- Range of sentence structures
- Accuracy of grammar and punctuation
- Error frequency and impact

Format your response EXACTLY as:
TASK_ACHIEVEMENT: [score] | [specific feedback]
COHERENCE_COHESION: [score] | [specific feedback]
LEXICAL_RESOURCE: [score] | [specific feedback]
GRAMMATICAL_RANGE: [score] | [specific feedback]
OVERALL_BAND: [score]
DETAILED_FEEDBACK: [comprehensive feedback with specific examples and improvement suggestions]`,
      },
      {
        role: "user",
        content: `Evaluate this IELTS Writing Task 1 response:

PROMPT: ${prompt}

RESPONSE: ${response}

Provide detailed scoring for each criterion with specific examples from the text.`,
      },
    ],
    max_tokens: 800,
  });

  const result = completion.choices[0]?.message?.content || "";

  // Parse the structured response
  const taskAchievementMatch = result.match(
    /TASK_ACHIEVEMENT: ([\d.]+) \| ([\s\S]*?)(?=COHERENCE_COHESION:|$)/
  );
  const coherenceMatch = result.match(
    /COHERENCE_COHESION: ([\d.]+) \| ([\s\S]*?)(?=LEXICAL_RESOURCE:|$)/
  );
  const lexicalMatch = result.match(
    /LEXICAL_RESOURCE: ([\d.]+) \| ([\s\S]*?)(?=GRAMMATICAL_RANGE:|$)/
  );
  const grammaticalMatch = result.match(
    /GRAMMATICAL_RANGE: ([\d.]+) \| ([\s\S]*?)(?=OVERALL_BAND:|$)/
  );
  const overallMatch = result.match(/OVERALL_BAND: ([\d.]+)/);
  const detailedMatch = result.match(/DETAILED_FEEDBACK: ([\s\S]*)/);

  return {
    overallBand: overallMatch ? overallMatch[1] : "N/A",
    taskAchievement: {
      score: taskAchievementMatch ? taskAchievementMatch[1] : "N/A",
      feedback: taskAchievementMatch
        ? taskAchievementMatch[2].trim()
        : "No feedback available",
    },
    coherenceCohesion: {
      score: coherenceMatch ? coherenceMatch[1] : "N/A",
      feedback: coherenceMatch
        ? coherenceMatch[2].trim()
        : "No feedback available",
    },
    lexicalResource: {
      score: lexicalMatch ? lexicalMatch[1] : "N/A",
      feedback: lexicalMatch ? lexicalMatch[2].trim() : "No feedback available",
    },
    grammaticalRange: {
      score: grammaticalMatch ? grammaticalMatch[1] : "N/A",
      feedback: grammaticalMatch
        ? grammaticalMatch[2].trim()
        : "No feedback available",
    },
    detailedFeedback: detailedMatch ? detailedMatch[1].trim() : result,
  };
}

export async function generateWritingTask2Prompt(): Promise<string> {
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an IELTS examiner. Generate a realistic IELTS Academic Writing Task 2 essay prompt. The prompt should present a clear argumentative topic, provide context, and include specific instructions. It should be exactly like real IELTS exams with the 250-word minimum requirement.",
        },
        {
          role: "user",
          content:
            "Generate a complete IELTS Writing Task 2 (Academic) essay prompt about a contemporary social, environmental, or educational issue that requires students to present and justify an opinion.",
        },
      ],
      max_tokens: 250,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI Service Error (Task 2):", error);
    throw error;
  }
}

export async function evaluateWritingTask2(
  response: string,
  prompt: string
): Promise<{
  overallBand: string;
  taskResponse: { score: string; feedback: string };
  coherenceCohesion: { score: string; feedback: string };
  lexicalResource: { score: string; feedback: string };
  grammaticalRange: { score: string; feedback: string };
  detailedFeedback: string;
}> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an official IELTS examiner evaluating Writing Task 2 (Academic). Provide detailed scoring for each of the 4 assessment criteria:

1. TASK RESPONSE (25%):
- Fully addresses all parts of the task
- Presents clear position throughout
- Presents, extends and supports ideas
- Relevant examples and evidence

2. COHERENCE AND COHESION (25%):
- Logical organization of ideas
- Clear progression throughout
- Appropriate use of cohesive devices
- Clear paragraphing

3. LEXICAL RESOURCE (25%):
- Wide range of vocabulary
- Natural and accurate use
- Appropriate academic style
- Correct spelling and word formation

4. GRAMMATICAL RANGE AND ACCURACY (25%):
- Wide range of structures
- Majority error-free sentences
- Good control of grammar and punctuation

Format your response EXACTLY as:
TASK_RESPONSE: [score] | [specific feedback]
COHERENCE_COHESION: [score] | [specific feedback]
LEXICAL_RESOURCE: [score] | [specific feedback]
GRAMMATICAL_RANGE: [score] | [specific feedback]
OVERALL_BAND: [score]
DETAILED_FEEDBACK: [comprehensive feedback with specific examples and improvement suggestions]`,
      },
      {
        role: "user",
        content: `Evaluate this IELTS Writing Task 2 response:

PROMPT: ${prompt}

RESPONSE: ${response}

Provide detailed scoring for each criterion with specific examples from the text.`,
      },
    ],
    max_tokens: 800,
  });

  const result = completion.choices[0]?.message?.content || "";

  // Parse the structured response
  const taskResponseMatch = result.match(
    /TASK_RESPONSE: ([\d.]+) \| ([\s\S]*?)(?=COHERENCE_COHESION:|$)/
  );
  const coherenceMatch = result.match(
    /COHERENCE_COHESION: ([\d.]+) \| ([\s\S]*?)(?=LEXICAL_RESOURCE:|$)/
  );
  const lexicalMatch = result.match(
    /LEXICAL_RESOURCE: ([\d.]+) \| ([\s\S]*?)(?=GRAMMATICAL_RANGE:|$)/
  );
  const grammaticalMatch = result.match(
    /GRAMMATICAL_RANGE: ([\d.]+) \| ([\s\S]*?)(?=OVERALL_BAND:|$)/
  );
  const overallMatch = result.match(/OVERALL_BAND: ([\d.]+)/);
  const detailedMatch = result.match(/DETAILED_FEEDBACK: ([\s\S]*)/);

  return {
    overallBand: overallMatch ? overallMatch[1] : "N/A",
    taskResponse: {
      score: taskResponseMatch ? taskResponseMatch[1] : "N/A",
      feedback: taskResponseMatch
        ? taskResponseMatch[2].trim()
        : "No feedback available",
    },
    coherenceCohesion: {
      score: coherenceMatch ? coherenceMatch[1] : "N/A",
      feedback: coherenceMatch
        ? coherenceMatch[2].trim()
        : "No feedback available",
    },
    lexicalResource: {
      score: lexicalMatch ? lexicalMatch[1] : "N/A",
      feedback: lexicalMatch ? lexicalMatch[2].trim() : "No feedback available",
    },
    grammaticalRange: {
      score: grammaticalMatch ? grammaticalMatch[1] : "N/A",
      feedback: grammaticalMatch
        ? grammaticalMatch[2].trim()
        : "No feedback available",
    },
    detailedFeedback: detailedMatch ? detailedMatch[1].trim() : result,
  };
}

export async function generateSpeakingQuestion(part: number): Promise<string> {
  let systemPrompt = "";
  let userPrompt = "";

  switch (part) {
    case 1:
      systemPrompt =
        "You are an IELTS examiner conducting Speaking Part 1. Generate a realistic question about familiar topics like work, studies, hometown, interests, etc.";
      userPrompt =
        "Generate a new IELTS Speaking Part 1 question. Make it realistic and engaging.";
      break;
    case 2:
      systemPrompt =
        "You are an IELTS examiner conducting Speaking Part 2. Generate a realistic cue card with a topic and specific points to cover.";
      userPrompt =
        "Generate a new IELTS Speaking Part 2 cue card. Include the topic and 3-4 specific points to address. Make it realistic and challenging.";
      break;
    case 3:
      systemPrompt =
        "You are an IELTS examiner conducting Speaking Part 3. Generate a realistic discussion question related to Part 2 topics.";
      userPrompt =
        "Generate a new IELTS Speaking Part 3 discussion question. Make it realistic and thought-provoking.";
      break;
    default:
      systemPrompt = "You are an IELTS examiner. Generate a speaking question.";
      userPrompt = "Generate a speaking question.";
  }

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    max_tokens: 200,
  });

  return completion.choices[0]?.message?.content || "";
}

export async function evaluateSpeakingResponse(
  response: string,
  question: string,
  part: number
): Promise<{
  overallBand: string;
  fluencyCoherence: { score: string; feedback: string };
  lexicalResource: { score: string; feedback: string };
  grammaticalRange: { score: string; feedback: string };
  pronunciation: { score: string; feedback: string };
  detailedFeedback: string;
}> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an official IELTS examiner evaluating Speaking Part ${part} responses. Provide detailed scoring for each of the 4 assessment criteria:

1. FLUENCY AND COHERENCE (25%):
- Speaks at length without effort or loss of coherence
- Maintains flow despite occasional hesitations
- Logical organization of ideas
- Effective use of discourse markers

2. LEXICAL RESOURCE (25%):
- Wide range of vocabulary
- Precise and appropriate vocabulary choices
- Good understanding of collocations and idiomatic expressions

3. GRAMMATICAL RANGE AND ACCURACY (25%):
- Wide range of structures
- Frequent error-free sentences
- Good control of grammar and punctuation

4. PRONUNCIATION (25%):
- Clear and intelligible pronunciation
- Effective use of intonation and stress
- Minimal L1 interference

Format your response EXACTLY as:
FLUENCY_COHERENCE: [score] | [specific feedback]
LEXICAL_RESOURCE: [score] | [specific feedback]
GRAMMATICAL_RANGE: [score] | [specific feedback]
PRONUNCIATION: [score] | [specific feedback]
OVERALL_BAND: [score]
DETAILED_FEEDBACK: [comprehensive feedback with specific examples and improvement suggestions]`,
      },
      {
        role: "user",
        content: `Evaluate this IELTS Speaking Part ${part} response:

QUESTION: ${question}

RESPONSE: ${response}

Provide detailed scoring for each criterion with specific examples from the speech.`,
      },
    ],
    max_tokens: 800,
  });

  const result = completion.choices[0]?.message?.content || "";

  // Parse the structured response
  const fluencyMatch = result.match(
    /FLUENCY_COHERENCE: ([\d.]+) \| ([\s\S]*?)(?=LEXICAL_RESOURCE:|$)/
  );
  const lexicalMatch = result.match(
    /LEXICAL_RESOURCE: ([\d.]+) \| ([\s\S]*?)(?=GRAMMATICAL_RANGE:|$)/
  );
  const grammaticalMatch = result.match(
    /GRAMMATICAL_RANGE: ([\d.]+) \| ([\s\S]*?)(?=PRONUNCIATION:|$)/
  );
  const pronunciationMatch = result.match(
    /PRONUNCIATION: ([\d.]+) \| ([\s\S]*?)(?=OVERALL_BAND:|$)/
  );
  const overallMatch = result.match(/OVERALL_BAND: ([\d.]+)/);
  const detailedMatch = result.match(/DETAILED_FEEDBACK: ([\s\S]*)/);

  return {
    overallBand: overallMatch ? overallMatch[1] : "N/A",
    fluencyCoherence: {
      score: fluencyMatch ? fluencyMatch[1] : "N/A",
      feedback: fluencyMatch ? fluencyMatch[2].trim() : "No feedback available",
    },
    lexicalResource: {
      score: lexicalMatch ? lexicalMatch[1] : "N/A",
      feedback: lexicalMatch ? lexicalMatch[2].trim() : "No feedback available",
    },
    grammaticalRange: {
      score: grammaticalMatch ? grammaticalMatch[1] : "N/A",
      feedback: grammaticalMatch
        ? grammaticalMatch[2].trim()
        : "No feedback available",
    },
    pronunciation: {
      score: pronunciationMatch ? pronunciationMatch[1] : "N/A",
      feedback: pronunciationMatch
        ? pronunciationMatch[2].trim()
        : "No feedback available",
    },
    detailedFeedback: detailedMatch ? detailedMatch[1].trim() : result,
  };
}
