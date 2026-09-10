"use client";

import InterpreterPage from "../interpreter/page";

/**
 * Recording happens here rather than bouncing to the Live Interpreter.
 *
 * It is the same screen in dictation mode: one direction, no typed input, just
 * the microphone and the transcript. Reusing the component instead of copying
 * it means a fix to the live screen lands here too.
 */
export default function RecordPage() {
  return <InterpreterPage recordMode />;
}
