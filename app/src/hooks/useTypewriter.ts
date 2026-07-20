import { useEffect, useRef, useState } from "react";

export function useTypewriter(text: string, { typingSpeed = 80, erasingSpeed = 40, pauseMs = 2000 } = {}) {
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "pause" | "erasing">("typing");
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    setPhase("typing");
  }, [text]);

  useEffect(() => {
    const tick = () => {
      if (phase === "typing") {
        if (idx.current < text.length) {
          idx.current++;
          setDisplayed(text.slice(0, idx.current));
        } else {
          setPhase("pause");
        }
      } else if (phase === "pause") {
        setPhase("erasing");
      } else {
        if (idx.current > 0) {
          idx.current--;
          setDisplayed(text.slice(0, idx.current));
        } else {
          setPhase("typing");
        }
      }
    };

    const delay = phase === "pause" ? pauseMs : phase === "erasing" ? erasingSpeed : typingSpeed;
    const id = setTimeout(tick, delay);
    return () => clearTimeout(id);
  }, [displayed, phase, text, typingSpeed, erasingSpeed, pauseMs]);

  return displayed;
}
