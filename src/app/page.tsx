import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="font-sans bg-black text-white min-h-screen flex flex-col items-center justify-center p-8 gap-16">
      <main className="flex flex-col gap-12 items-center text-center max-w-4xl">
        <div className="flex flex-col items-center gap-6">
          <h1 className="text-6xl font-bold tracking-tight kiro-heading">
            IELTS Coach
          </h1>
          <p className="text-xl text-gray-300 font-semibold max-w-2xl leading-relaxed">
            Master IELTS with AI-powered practice sessions. Get instant feedback on your writing and speaking skills with our advanced evaluation system.
          </p>
        </div>

        <SignedOut>
          <div className="flex flex-col gap-6 items-center">
            <p className="text-lg text-purple-300 font-semibold">
              Sign up to start your IELTS preparation journey
            </p>
            <div className="flex gap-4">
              <SignInButton>
                <Button className="border border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white rounded-full font-semibold px-8 py-3">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button className="kiro-button-primary rounded-full font-semibold px-8 py-3">
                  Get Started Free
                </Button>
              </SignUpButton>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="flex gap-8 items-center flex-col sm:flex-row">
            <Link href="/writing">
              <Button className="kiro-button-primary rounded-full px-10 py-6 text-xl font-bold min-w-[220px] h-auto">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">✍️</span>
                  <span>Writing Practice</span>
                </div>
              </Button>
            </Link>
            <Link href="/speaking">
              <Button className="kiro-button-primary rounded-full px-10 py-6 text-xl font-bold min-w-[220px] h-auto">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">🎤</span>
                  <span>Speaking Practice</span>
                </div>
              </Button>
            </Link>
          </div>
        </SignedIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full">
          <div className="kiro-bg-card p-6 rounded-xl text-center">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-bold text-lg kiro-text-primary mb-2">AI Evaluation</h3>
            <p className="text-gray-300 text-sm">Get detailed feedback on your performance with band scores and improvement suggestions</p>
          </div>
          <div className="kiro-bg-card p-6 rounded-xl text-center">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-bold text-lg kiro-text-secondary mb-2">Real IELTS Format</h3>
            <p className="text-gray-300 text-sm">Practice with authentic IELTS task formats and timing to prepare effectively</p>
          </div>
          <div className="kiro-bg-card p-6 rounded-xl text-center">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="font-bold text-lg kiro-text-accent mb-2">Track Progress</h3>
            <p className="text-gray-300 text-sm">Monitor your improvement over time with detailed performance analytics</p>
          </div>
        </div>
      </main>
      
      <footer className="flex gap-6 flex-wrap items-center justify-center">
        <ThemeToggle />
        <p className="text-gray-500 text-sm">Powered by AI</p>
      </footer>
    </div>
  );
}
