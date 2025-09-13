"use client";

import { useState } from "react";
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
// Removed direct OpenAI service imports - now using API routes

interface WritingEvaluation {
  overallBand: number | string;
  taskAchievement: { score: number | string; feedback: string };
  coherenceCohesion: { score: number | string; feedback: string };
  lexicalResource: { score: number | string; feedback: string };
  grammaticalRange: { score: number | string; feedback: string };
  detailedFeedback: string;
}

export default function WritingPractice() {
  const [currentTask, setCurrentTask] = useState<"task1" | "task2">("task1");

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
    <div className="min-h-screen bg-black text-white p-8 pb-20 gap-16 sm:p-20">
      <header className="flex justify-between items-center mb-8">
        <Link href="/">
          <Button variant="outline" className="kiro-button-primary border-purple-500 text-white hover:bg-purple-600">
            ← Back to Home
          </Button>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl kiro-heading">
          IELTS Writing Practice
        </h1>
        
        <div className="flex gap-6">
          <Button 
            className={currentTask === "task1" ? "kiro-button-primary" : "border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"}
            variant={currentTask === "task1" ? "default" : "outline"}
            onClick={() => setCurrentTask("task1")}
          >
            <div className="text-center font-bold">
              <div>Task 1 (Academic)</div>
              <div className="text-xs opacity-75">Charts & Graphs</div>
            </div>
          </Button>
          <Button 
            className={currentTask === "task2" ? "kiro-button-primary" : "border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"}
            variant={currentTask === "task2" ? "default" : "outline"}
            onClick={() => setCurrentTask("task2")}
          >
            <div className="text-center font-bold">
              <div>Task 2 (Academic)</div>
              <div className="text-xs opacity-75">Essay Writing</div>
            </div>
          </Button>
        </div>

        {currentTask === "task1" ? (
          <Task1Section />
        ) : (
          <Task2Section />
        )}
      </main>
    </div>
      </SignedIn>
    </>
  );
}

function Task1Section() {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<WritingEvaluation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const generatePrompt = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/writing/task1/generate", {
        method: "POST",
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate prompt");
      }
      
      setPrompt(data.prompt);
      setImageUrl(data.imageUrl);
      setUserAnswer("");
      setEvaluation(null);
    } catch (error) {
      console.error("Error generating Task 1 prompt:", error);
      setPrompt("Error generating prompt. Please try again.");
      setImageUrl(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluateAnswer = async () => {
    if (!userAnswer.trim() || !prompt) return;
    
    setIsEvaluating(true);
    try {
      const response = await fetch("/api/writing/task1/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: userAnswer,
          prompt: prompt,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to evaluate response");
      }
      
      setEvaluation(data);
    } catch (error) {
      console.error("Error evaluating Task 1 response:", error);
      setEvaluation({
        overallBand: "N/A",
        taskAchievement: { score: "N/A", feedback: "Error evaluating response. Please try again." },
        coherenceCohesion: { score: "N/A", feedback: "" },
        lexicalResource: { score: "N/A", feedback: "" },
        grammaticalRange: { score: "N/A", feedback: "" },
        detailedFeedback: "Error evaluating response. Please try again."
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Task 1 (Academic): Diagram Description</h2>
        <p className="text-muted-foreground">
          You will be given a diagram, chart, graph, or table. Your task is to describe,
          summarize, or explain the information in your own words. You should write at
          least 150 words.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Button 
          onClick={generatePrompt}
          disabled={isGenerating}
          className="w-fit"
        >
          {isGenerating ? "Generating Task & Chart..." : "Generate New Task"}
        </Button>

        {prompt && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-secondary rounded-md">
              <p className="text-lg">{prompt}</p>
            </div>
            {imageUrl && (
              <div className="flex justify-center">
                <img 
                  src={imageUrl} 
                  alt="IELTS Task 1 Chart" 
                  className="max-w-full h-auto rounded-md border shadow-lg"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {prompt && (
        <div className="flex flex-col gap-4">
          <label htmlFor="answer" className="text-lg font-medium">
            Your Answer:
          </label>
          <textarea
            id="answer"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="min-h-[300px] p-4 border rounded-md"
            placeholder="Write your response here..."
          />
          <Button 
            onClick={evaluateAnswer}
            disabled={isEvaluating}
            className="w-fit"
          >
            {isEvaluating ? "Evaluating..." : "Evaluate Answer"}
          </Button>
        </div>
      )}

      {evaluation && (
        <div className="space-y-6">
          <div className="text-center p-6 bg-primary text-primary-foreground rounded-lg">
            <h3 className="text-2xl font-bold">Overall Band Score: {evaluation.overallBand}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-lg mb-2">Task Achievement</h4>
              <div className="text-2xl font-bold text-blue-600 mb-2">Band {evaluation.taskAchievement.score}</div>
              <p className="text-sm text-muted-foreground">{evaluation.taskAchievement.feedback}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-lg mb-2">Coherence & Cohesion</h4>
              <div className="text-2xl font-bold text-green-600 mb-2">Band {evaluation.coherenceCohesion.score}</div>
              <p className="text-sm text-muted-foreground">{evaluation.coherenceCohesion.feedback}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-lg mb-2">Lexical Resource</h4>
              <div className="text-2xl font-bold text-purple-600 mb-2">Band {evaluation.lexicalResource.score}</div>
              <p className="text-sm text-muted-foreground">{evaluation.lexicalResource.feedback}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-lg mb-2">Grammatical Range & Accuracy</h4>
              <div className="text-2xl font-bold text-orange-600 mb-2">Band {evaluation.grammaticalRange.score}</div>
              <p className="text-sm text-muted-foreground">{evaluation.grammaticalRange.feedback}</p>
            </div>
          </div>
          
          <div className="p-6 bg-secondary rounded-lg">
            <h4 className="text-xl font-semibold mb-4">Detailed Feedback & Improvement Suggestions</h4>
            <div className="whitespace-pre-wrap text-sm">{evaluation.detailedFeedback}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Task2Section() {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<WritingEvaluation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const generatePrompt = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/writing/task2/generate", {
        method: "POST",
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate prompt");
      }
      
      setPrompt(data.prompt);
      setUserAnswer("");
      setEvaluation(null);
    } catch (error) {
      console.error("Error generating Task 2 prompt:", error);
      setPrompt("Error generating prompt. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluateAnswer = async () => {
    if (!userAnswer.trim() || !prompt) return;
    
    setIsEvaluating(true);
    try {
      const response = await fetch("/api/writing/task2/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: userAnswer,
          prompt: prompt,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to evaluate response");
      }
      
      setEvaluation(data);
    } catch (error) {
      console.error("Error evaluating Task 2 response:", error);
      setEvaluation({
        overallBand: "N/A",
        taskAchievement: { score: "N/A", feedback: "Error evaluating response. Please try again." },
        coherenceCohesion: { score: "N/A", feedback: "" },
        lexicalResource: { score: "N/A", feedback: "" },
        grammaticalRange: { score: "N/A", feedback: "" },
        detailedFeedback: "Error evaluating response. Please try again."
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Task 2 (Academic): Essay Writing</h2>
        <p className="text-muted-foreground">
          You will be given a topic to write about. Present a clear argument or opinion
          with supporting examples. You should write at least 250 words.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Button 
          onClick={generatePrompt}
          disabled={isGenerating}
          className="w-fit"
        >
          {isGenerating ? "Generating..." : "Generate New Topic"}
        </Button>

        {prompt && (
          <div className="mt-4 p-4 bg-secondary rounded-md">
            <p className="text-lg">{prompt}</p>
          </div>
        )}
      </div>

      {prompt && (
        <div className="flex flex-col gap-4">
          <label htmlFor="answer" className="text-lg font-medium">
            Your Answer:
          </label>
          <textarea
            id="answer"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="min-h-[400px] p-4 border rounded-md"
            placeholder="Write your essay here..."
          />
          <Button 
            onClick={evaluateAnswer}
            disabled={isEvaluating}
            className="w-fit"
          >
            {isEvaluating ? "Evaluating..." : "Evaluate Answer"}
          </Button>
        </div>
      )}

      {evaluation && (
        <div className="space-y-6">
          <div className="text-center p-6 bg-primary text-primary-foreground rounded-lg">
            <h3 className="text-2xl font-bold">Overall Band Score: {evaluation.overallBand}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-lg mb-2">Task Response</h4>
              <div className="text-2xl font-bold text-blue-600 mb-2">Band {evaluation.taskAchievement.score}</div>
              <p className="text-sm text-muted-foreground">{evaluation.taskAchievement.feedback}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-lg mb-2">Coherence & Cohesion</h4>
              <div className="text-2xl font-bold text-green-600 mb-2">Band {evaluation.coherenceCohesion.score}</div>
              <p className="text-sm text-muted-foreground">{evaluation.coherenceCohesion.feedback}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-lg mb-2">Lexical Resource</h4>
              <div className="text-2xl font-bold text-purple-600 mb-2">Band {evaluation.lexicalResource.score}</div>
              <p className="text-sm text-muted-foreground">{evaluation.lexicalResource.feedback}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-lg mb-2">Grammatical Range & Accuracy</h4>
              <div className="text-2xl font-bold text-orange-600 mb-2">Band {evaluation.grammaticalRange.score}</div>
              <p className="text-sm text-muted-foreground">{evaluation.grammaticalRange.feedback}</p>
            </div>
          </div>
          
          <div className="p-6 bg-secondary rounded-lg">
            <h4 className="text-xl font-semibold mb-4">Detailed Feedback & Improvement Suggestions</h4>
            <div className="whitespace-pre-wrap text-sm">{evaluation.detailedFeedback}</div>
          </div>
        </div>
      )}
    </div>
  );
}