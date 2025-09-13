"use client";

import { useState, useEffect, useRef } from "react";
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

interface Question {
  text: string;
  timeLimit: number; // in seconds
}

interface TestSession {
  part: 1 | 2 | 3;
  currentQuestionIndex: number;
  questions: Question[];
  responses: string[];
  isActive: boolean;
  timeRemaining: number;
}

export default function SpeakingPractice() {
  const [session, setSession] = useState<TestSession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [evaluation, setEvaluation] = useState<{
    overallBand: string;
    fluencyCoherence: { score: string; feedback: string };
    lexicalResource: { score: string; feedback: string };
    grammaticalRange: { score: string; feedback: string };
    pronunciation: { score: string; feedback: string };
    detailedFeedback: string;
  } | null>(null);

  const [avatarSpeaking, setAvatarSpeaking] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [preparationTime, setPreparationTime] = useState(0);
  const [isPreparationPhase, setIsPreparationPhase] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
          console.log('Speech recognition started');
        };
        
        recognition.onresult = (event) => {
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            setCurrentResponse(prev => prev + finalTranscript + ' ');
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          // Reset recognition state on error
          if (event.error === 'aborted' || event.error === 'not-allowed') {
            console.warn('Speech recognition was aborted or not allowed');
          }
        };
        
        recognition.onend = () => {
          setIsListening(false);
          console.log('Speech recognition ended');
        };
        
        recognitionRef.current = recognition;
      } else {
        console.warn('Speech recognition not supported in this browser');
      }
    }
    
    return () => {
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.abort();
        } catch (error) {
          console.error('Error cleaning up speech recognition:', error);
        }
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (session?.isActive && session.timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setSession(prev => prev ? { ...prev, timeRemaining: prev.timeRemaining - 1 } : null);
      }, 1000);
    } else if (session?.isActive && session.timeRemaining === 0) {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [session?.timeRemaining, session?.isActive]);

  // Preparation timer effect
  useEffect(() => {
    if (isPreparationPhase && preparationTime > 0) {
      const timer = setTimeout(() => {
        setPreparationTime(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isPreparationPhase && preparationTime === 0) {
      setIsPreparationPhase(false);
      speakAvatar("Your preparation time is over. Please start speaking now.");
      startRecording();
    }
  }, [preparationTime, isPreparationPhase]);

  const speakAvatar = (message: string) => {
    setAvatarSpeaking(true);
    setAvatarMessage(message);
    // Simulate avatar speaking time based on message length
    const speakingTime = Math.max(2000, message.length * 50);
    setTimeout(() => {
      setAvatarSpeaking(false);
      setAvatarMessage("");
    }, speakingTime);
  };

  const startTest = async (part: 1 | 2 | 3) => {
    setIsGeneratingQuestion(true);
    speakAvatar(`Welcome to IELTS Speaking Part ${part}. I'm generating your questions now...`);
    
    try {
      // Generate questions for the selected part
      const questions = await generateQuestionsForPart(part);
      
      const newSession: TestSession = {
        part,
        currentQuestionIndex: 0,
        questions,
        responses: [],
        isActive: true,
        timeRemaining: questions[0]?.timeLimit || 60
      };
      
      setSession(newSession);
      setEvaluation(null);
      
      // Avatar introduction
      let intro = "";
      if (part === 1) {
        intro = "Hello, I'm your IELTS examiner. In Part 1, I'll ask you some general questions about yourself and familiar topics. Let's begin.";
      } else if (part === 2) {
        intro = "Now we'll move to Part 2. I'll give you a topic card and you'll have 1 minute to prepare, then speak for 1-2 minutes.";
      } else {
        intro = "Finally, Part 3. I'll ask you some more abstract questions related to the previous topic. Let's discuss.";
      }
      
      setTimeout(() => {
        speakAvatar(intro);
        setTimeout(() => {
          askCurrentQuestion(newSession);
        }, intro.length * 50 + 1000);
      }, 1000);
      
    } catch (error) {
      console.error("Error starting test:", error);
      speakAvatar("Sorry, there was an error generating questions. Please try again.");
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const generateQuestionsForPart = async (part: number): Promise<Question[]> => {
    const questions: Question[] = [];
    const questionCount = part === 1 ? 3 : part === 2 ? 1 : 2;
    
    for (let i = 0; i < questionCount; i++) {
      const response = await fetch("/api/speaking/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part })
      });
      
      const data = await response.json();
      if (response.ok) {
        questions.push({
          text: data.question,
          timeLimit: part === 1 ? 60 : part === 2 ? 120 : 90
        });
      }
    }
    
    return questions;
  };

  const askCurrentQuestion = (currentSession: TestSession) => {
    const question = currentSession.questions[currentSession.currentQuestionIndex];
    if (question) {
      if (currentSession.part === 2) {
        speakAvatar(`Here's your topic card: ${question.text}. You have 1 minute to prepare.`);
        setIsPreparationPhase(true);
        setPreparationTime(60);
      } else {
        speakAvatar(question.text);
        setTimeout(() => {
          startRecording();
        }, question.text.length * 50 + 500);
      }
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setCurrentResponse("");
    
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        // Fallback to text input if speech recognition fails
        setIsListening(false);
      }
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        setIsListening(false);
      }
    }
    
    if (currentResponse.trim()) {
      handleResponseSubmitted();
    }
  };

  const handleTimeUp = () => {
    cleanupSpeechRecognition();
    if (currentResponse.trim()) {
      handleResponseSubmitted();
    }
  };

  const cleanupSpeechRecognition = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    setIsListening(false);
    setIsRecording(false);
  };

  const handleResponseSubmitted = () => {
    if (!session || !currentResponse.trim()) return;

    // Stop speech recognition first
    cleanupSpeechRecognition();

    const updatedResponses = [...session.responses, currentResponse];
    
    if (session.currentQuestionIndex < session.questions.length - 1) {
      // Move to next question
      const nextIndex = session.currentQuestionIndex + 1;
      const nextQuestion = session.questions[nextIndex];
      
      setSession({
        ...session,
        currentQuestionIndex: nextIndex,
        responses: updatedResponses,
        timeRemaining: nextQuestion.timeLimit
      });
      
      setCurrentResponse("");
      speakAvatar("Thank you. Let's move to the next question.");
      
      setTimeout(() => {
        askCurrentQuestion({
          ...session,
          currentQuestionIndex: nextIndex,
          responses: updatedResponses
        });
      }, 2000);
      
    } else {
      // End of part - evaluate
      setSession({
        ...session,
        responses: updatedResponses,
        isActive: false
      });
      
      speakAvatar("That's the end of this part. I'm now evaluating your performance...");
      evaluatePerformance(updatedResponses);
    }
  };

  const evaluatePerformance = async (responses: string[]) => {
    if (!session) return;
    

    
    try {
      // Combine all responses for evaluation
      const combinedResponse = responses.join(" ");
      const combinedQuestions = session.questions.map(q => q.text).join(" ");
      
      const response = await fetch("/api/speaking/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: combinedResponse,
          question: combinedQuestions,
          part: session.part
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setEvaluation(data);
        speakAvatar(`Your evaluation is complete. You achieved an overall band score of ${data.overallBand}. Please review your detailed feedback below.`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error evaluating performance:", error);
      speakAvatar("Sorry, there was an error evaluating your performance. Please try again.");
    } finally {
      // Evaluation complete
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
          IELTS Speaking Practice
        </h1>
        
        {!session && (
          <div className="flex gap-6 flex-wrap justify-center">
            <Button 
              onClick={() => startTest(1)}
              disabled={isGeneratingQuestion}
              className="kiro-button-primary px-8 py-6 text-lg font-bold min-w-[200px] h-auto"
            >
              <div className="text-center">
                <div className="text-xl font-bold">Start Part 1</div>
                <div className="text-sm opacity-90 mt-1">Introduction (4-5 min)</div>
              </div>
            </Button>
            <Button 
              onClick={() => startTest(2)}
              disabled={isGeneratingQuestion}
              className="kiro-button-primary px-8 py-6 text-lg font-bold min-w-[200px] h-auto"
            >
              <div className="text-center">
                <div className="text-xl font-bold">Start Part 2</div>
                <div className="text-sm opacity-90 mt-1">Cue Card (3-4 min)</div>
              </div>
            </Button>
            <Button 
              onClick={() => startTest(3)}
              disabled={isGeneratingQuestion}
              className="kiro-button-primary px-8 py-6 text-lg font-bold min-w-[200px] h-auto"
            >
              <div className="text-center">
                <div className="text-xl font-bold">Start Part 3</div>
                <div className="text-sm opacity-90 mt-1">Discussion (4-5 min)</div>
              </div>
            </Button>
          </div>
        )}

        <div className="w-full max-w-4xl flex flex-col gap-8">
          {/* AI Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className={`w-48 h-48 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-700 flex items-center justify-center transition-all duration-300 border-4 border-purple-400 ${avatarSpeaking ? 'scale-110 shadow-2xl shadow-purple-500/50' : 'shadow-lg shadow-purple-500/30'}`}>
              <div className="text-7xl">🎓</div>
            </div>
            
            {avatarSpeaking && (
              <div className="kiro-bg-card p-6 rounded-xl max-w-2xl text-center shadow-lg">
                <p className="text-lg font-semibold text-white">{avatarMessage}</p>
                <div className="flex justify-center mt-3">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {session && (
            <div className="space-y-6">
              {/* Test Status */}
              <div className="kiro-bg-card p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold kiro-text-primary">
                    Part {session.part}: Question {session.currentQuestionIndex + 1} of {session.questions.length}
                  </h2>
                  {session.isActive && (
                    <div className="text-2xl font-mono font-bold">
                      {isPreparationPhase ? (
                        <span className="text-orange-400">Prep: {formatTime(preparationTime)}</span>
                      ) : (
                        <span className="text-red-400">Time: {formatTime(session.timeRemaining)}</span>
                      )}
                    </div>
                  )}
                </div>
                
                {session.questions[session.currentQuestionIndex] && (
                  <div className="p-6 bg-gray-900 rounded-xl border border-purple-500/30">
                    <p className="text-lg font-semibold text-white leading-relaxed">{session.questions[session.currentQuestionIndex].text}</p>
                  </div>
                )}
              </div>

              {/* Recording Interface */}
              {session.isActive && !isPreparationPhase && (
                <div className="flex flex-col items-center gap-6">
                  <div className="flex gap-4">
                    <Button 
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={avatarSpeaking}
                      className={`kiro-button-primary px-10 py-5 text-lg font-bold ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : ''}`}
                    >
                      {isRecording ? (
                        isListening ? "🔴 Recording (Listening...)" : "🔴 Recording (Processing...)"
                      ) : (
                        "🎤 Start Speaking"
                      )}
                    </Button>
                    
                    {isRecording && (
                      <Button 
                        onClick={handleResponseSubmitted}
                        variant="outline"
                        className="px-8 py-5 text-lg font-bold border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white"
                      >
                        Submit Response
                      </Button>
                    )}
                  </div>
                  
                  {/* Speech Recognition Display */}
                  <div className="w-full max-w-2xl">
                    {isRecording && (
                      <div className="mb-4 p-4 kiro-bg-card rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                          <span className="text-sm font-semibold kiro-text-primary">
                            {isListening ? 'Listening to your speech...' : 'Processing speech...'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Speak clearly and naturally. Your speech is being converted to text automatically.
                        </div>
                      </div>
                    )}
                    
                    <div className="relative">
                      <textarea
                        value={currentResponse}
                        onChange={(e) => setCurrentResponse(e.target.value)}
                        placeholder={recognitionRef.current ? "Your speech will appear here automatically..." : "Speech recognition not available. Please type your response..."}
                        className="w-full min-h-[120px] p-4 bg-gray-900 border border-purple-500/30 rounded-xl text-white font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        disabled={isRecording && isListening}
                      />
                      {isRecording && isListening && (
                        <div className="absolute top-2 right-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Preparation Phase */}
              {isPreparationPhase && (
                <div className="text-center p-8 kiro-bg-card rounded-xl border border-orange-500/30">
                  <h3 className="text-2xl font-bold mb-4 kiro-text-accent">Preparation Time</h3>
                  <div className="text-5xl font-mono text-orange-400 mb-4 font-bold">
                    {formatTime(preparationTime)}
                  </div>
                  <p className="text-lg font-semibold text-white mb-6">Use this time to make notes and organize your thoughts.</p>
                  <div className="mt-4 p-4 bg-gray-900 rounded-xl border border-orange-500/30">
                    <textarea
                      placeholder="Make your notes here..."
                      className="w-full min-h-[100px] p-4 bg-transparent border-none text-white font-medium resize-none focus:outline-none placeholder-gray-400"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evaluation Results */}
          {evaluation && (
            <div className="space-y-6">
              <div className="text-center p-8 kiro-button-primary rounded-xl shadow-lg">
                <h3 className="text-3xl font-bold text-white">Overall Band Score: {evaluation.overallBand}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="kiro-bg-card p-6 rounded-xl shadow-lg">
                  <h4 className="font-bold text-lg mb-3 kiro-text-primary">Fluency & Coherence</h4>
                  <div className="text-3xl font-bold text-blue-400 mb-3">Band {evaluation.fluencyCoherence.score}</div>
                  <p className="text-sm text-gray-300 font-medium">{evaluation.fluencyCoherence.feedback}</p>
                </div>
                
                <div className="kiro-bg-card p-6 rounded-xl shadow-lg">
                  <h4 className="font-bold text-lg mb-3 kiro-text-secondary">Lexical Resource</h4>
                  <div className="text-3xl font-bold text-green-400 mb-3">Band {evaluation.lexicalResource.score}</div>
                  <p className="text-sm text-gray-300 font-medium">{evaluation.lexicalResource.feedback}</p>
                </div>
                
                <div className="kiro-bg-card p-6 rounded-xl shadow-lg">
                  <h4 className="font-bold text-lg mb-3 kiro-text-accent">Grammatical Range & Accuracy</h4>
                  <div className="text-3xl font-bold text-purple-400 mb-3">Band {evaluation.grammaticalRange.score}</div>
                  <p className="text-sm text-gray-300 font-medium">{evaluation.grammaticalRange.feedback}</p>
                </div>
                
                <div className="kiro-bg-card p-6 rounded-xl shadow-lg">
                  <h4 className="font-bold text-lg mb-3 text-orange-400">Pronunciation</h4>
                  <div className="text-3xl font-bold text-orange-400 mb-3">Band {evaluation.pronunciation.score}</div>
                  <p className="text-sm text-gray-300 font-medium">{evaluation.pronunciation.feedback}</p>
                </div>
              </div>
              
              <div className="p-6 bg-secondary rounded-lg">
                <h4 className="text-xl font-semibold mb-4">Detailed Feedback & Improvement Suggestions</h4>
                <div className="whitespace-pre-wrap text-sm">{evaluation.detailedFeedback}</div>
              </div>
              
              <div className="text-center">
                <Button 
                  onClick={() => {
                    setSession(null);
                    setEvaluation(null);
                    setCurrentResponse("");
                  }}
                  className="px-8 py-4 text-lg"
                >
                  Start New Test
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
      </SignedIn>
    </>
  );
}
