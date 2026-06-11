import { useEffect, useState } from "react";
import type { Quiz } from "./types";
import { getQuizId, loadQuiz } from "./lib/loadQuiz";
import { saveProfile } from "./lib/storage";
import type { TraitProfile } from "./lib/scoring";
import QuizRunner from "./components/Quiz";
import Results from "./components/Results";
import Layout from "./components/Layout";

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "running"; quiz: Quiz }
  | { phase: "results"; quiz: Quiz; profile: TraitProfile };

function testOf(quiz: Quiz): 1 | 2 {
  return quiz.test === 2 ? 2 : 1;
}

export default function App() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const quizId = getQuizId();

  useEffect(() => {
    let alive = true;
    loadQuiz(quizId)
      .then((quiz) => alive && setState({ phase: "running", quiz }))
      .catch((e) => alive && setState({ phase: "error", message: String(e.message || e) }));
    return () => {
      alive = false;
    };
  }, [quizId]);

  return <Layout>{renderPhase()}</Layout>;

  function renderPhase() {
    if (state.phase === "loading") {
      return <Centered>Loading quiz…</Centered>;
    }

    if (state.phase === "error") {
      return (
        <Centered>
          <div className="max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-left">
            <h2 className="font-semibold text-red-700">Couldn&apos;t load this quiz</h2>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-red-800">{state.message}</pre>
            <p className="mt-3 text-sm text-neutral-600">
              Expected a YAML file at <code>/quizzes/{quizId}</code>.
            </p>
          </div>
        </Centered>
      );
    }

    if (state.phase === "running") {
      const test = testOf(state.quiz);
      return (
        <QuizRunner
          quiz={state.quiz}
          onFinish={(profile) => {
            saveProfile(test, profile);
            setState({ phase: "results", quiz: state.quiz, profile });
          }}
        />
      );
    }

    const test = testOf(state.quiz);
    return (
      <Results
        test={test}
        profile={state.profile}
        quiz={state.quiz}
        onRetake={() => setState({ phase: "running", quiz: state.quiz })}
      />
    );
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid place-items-center p-6 py-20 text-center text-neutral-500">{children}</div>
  );
}
