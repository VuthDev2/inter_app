"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mic } from "lucide-react";
import { Suspense, useState, useEffect, FormEvent, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

function VerifyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const { verifyOTP, sendOTP, initialized } = useAuth();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isMounted, setIsMounted] = useState(false);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        setIsMounted(true);
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    function handleOtpChange(index: number, value: string) {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            inputsRef.current[index + 1]?.focus();
        }
    }

    function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const token = otp.join("");
        if (token.length !== 6) {
            setError("Please enter the full 6-digit code.");
            return;
        }
        setError("");
        setLoading(true);
        const result = await verifyOTP(email, token);
        setLoading(false);
        if (result.error) {
            setError(result.error);
        } else {
            router.push(`/verify?email=${encodeURIComponent(email)}&verified=true`);
            router.replace(`/verifysuccess?email=${encodeURIComponent(email)}`);
        }
    }

    async function handleResend() {
        setResending(true);
        await sendOTP(email);
        setResending(false);
        setOtp(["", "", "", "", "", ""]);
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-r from-white via-blue-100 to-blue-600 font-sans text-slate-900 overflow-hidden relative">
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes eq-pulse {
                    0%, 100% { height: 30%; opacity: 0.5; }
                    50% { height: 100%; opacity: 1; }
                }
                .animate-eq-pulse {
                    animation: eq-pulse 1s ease-in-out infinite;
                }
                @keyframes translate-wave {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-33.3333%); }
                }
                .animate-translate-wave {
                    animation: translate-wave 15s linear infinite;
                }
                @keyframes oscillate {
                    0%, 100% { transform: scaleY(0.85); }
                    50% { transform: scaleY(1.15); }
                }
                .animate-oscillate {
                    animation: oscillate 4s ease-in-out infinite;
                }
            `}} />

            {/* Global Full-Screen Background Effects */}
            {isMounted && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">

                    {/* Crisp Glowing Waveform Line - Spans across the entire layout */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 left-0 w-[150%] sm:w-[120%] h-[400px] pointer-events-none flex items-center z-0 opacity-80"
                        style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 60%, transparent)' }}
                    >
                        <div className="w-[300%] h-full flex animate-translate-wave">
                            <div className="w-full h-full flex animate-oscillate origin-center">
                                {[...Array(3)].map((_, i) => (
                                    <svg key={i} className="w-full h-full flex-shrink-0" preserveAspectRatio="none" viewBox="0 0 1200 400" fill="none">
                                        <path
                                            d="M0,200 C150,380 150,20 300,200 C450,380 450,20 600,200 C750,380 750,20 900,200 C1050,380 1050,20 1200,200"
                                            stroke="#3b82f6"
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            style={{ filter: 'drop-shadow(0px 0px 25px rgba(59,130,246,0.7))' }}
                                        />
                                        <path
                                            d="M0,200 C150,280 150,120 300,200 C450,280 450,120 600,200 C750,280 750,120 900,200 C1050,280 1050,120 1200,200"
                                            stroke="#60a5fa"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                            style={{ filter: 'drop-shadow(0px 0px 16px rgba(96,165,250,0.9))' }}
                                        />
                                    </svg>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Interactive Dot Grid spanning full width */}
                    <div
                        className="absolute inset-[-50%] opacity-40 transition-transform duration-300 ease-out will-change-transform"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, #3b82f6 2px, transparent 0)',
                            backgroundSize: '40px 40px',
                            transform: `translate(${mousePos.x * -0.02}px, ${mousePos.y * -0.02}px)`
                        }}
                    ></div>

                    <div
                        className="absolute inset-[-50%] opacity-20 transition-transform duration-500 ease-out will-change-transform"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, #60a5fa 1.5px, transparent 0)',
                            backgroundSize: '24px 24px',
                            transform: `translate(${mousePos.x * -0.04}px, ${mousePos.y * -0.04}px)`
                        }}
                    ></div>

                    {/* Global Masking Gradients for seamless blending */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-transparent to-white/90"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-blue-600/60"></div>

                    {/* White dots fading in on the blue side */}
                    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px', maskImage: 'linear-gradient(to right, transparent 50%, black)' }}></div>

                    {/* Interactive glow behind the form card */}
                    <div
                        className="absolute w-[800px] h-[800px] bg-white/5 rounded-[100%] blur-[100px] pointer-events-none transition-transform duration-1000 ease-out will-change-transform z-0"
                        style={{
                            left: 0, top: 0,
                            transform: `translate(${mousePos.x - 400}px, ${mousePos.y - 400}px)`
                        }}
                    ></div>
                </div>
            )}

            {/* Left Side Content (Text) */}
            <div className="hidden lg:flex flex-1 flex-col justify-between px-16 py-12 relative z-10 pointer-events-none">
                {/* Logo */}
                <div className="flex items-center gap-5 relative z-10 pointer-events-auto w-max">
                    <img src="/logo-d.png" alt="QuickVoice Logo" className="h-20 w-auto" />
                    <span className="text-4xl font-bold italic tracking-tight text-slate-700">
                        <span className="text-blue-500">Quick</span>Voice
                    </span>
                </div>

                {/* Content */}
                <div className="flex flex-col max-w-xl mt-4 relative z-10">
                    <h1 className="text-6xl font-extrabold text-[#1f2937] leading-[1.1] tracking-tight mb-6 animate-in slide-in-from-left-8 fade-in duration-700">
                        Break The Language<br />Barrier Instantly
                    </h1>
                    <p className="text-xl font-semibold text-[#3b82f6] max-w-sm leading-snug animate-in slide-in-from-left-8 fade-in duration-700 delay-150">
                        Experience real-time AI voice interpretation between English and Japanese conversations.
                    </p>

                    {/* Animated Audio Equalizer */}
                    <div className="flex items-center gap-1.5 h-10 mt-8 animate-in slide-in-from-left-8 fade-in duration-700 delay-300">
                        {[...Array(15)].map((_, i) => (
                            <div
                                key={i}
                                className="w-[5px] bg-[#3b82f6] rounded-full animate-eq-pulse"
                                style={{
                                    animationDelay: `${(i * 0.17) % 1.2}s`,
                                    animationDuration: `${0.7 + (i % 3) * 0.15}s`
                                }}
                            ></div>
                        ))}
                    </div>
                </div>

                {/* Footer text */}
                <p className="text-base font-semibold text-slate-400 relative z-10 animate-in fade-in duration-1000 delay-500">
                    Enterprise-grade privacy & security encryption
                </p>
            </div>

            {/* Right Side Content (Form Card) */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10">

                <div className="w-full max-w-[480px] bg-[#fafafa] rounded-[2rem] p-10 sm:p-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom-8 fade-in duration-700">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Verify your identity</h2>
                    <p className="text-sm font-bold text-slate-600 mt-2 mb-10">
                        We sent a code to {email ? email.replace(/(?<=.{3}).(?=.*@)/g, "*") : "your email"}
                    </p>

                    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl px-5 py-3">
                                {error}
                            </div>
                        )}

                        {/* OTP Verification Inputs */}
                        <div className="flex justify-between items-center gap-2 mb-4">
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={el => { inputsRef.current[i] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleOtpChange(i, e.target.value)}
                                    onKeyDown={e => handleOtpKeyDown(i, e)}
                                    className="w-[3.25rem] h-14 sm:w-[3.5rem] sm:h-16 bg-white border-2 border-slate-200 rounded-[1.25rem] text-center text-xl font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 shadow-sm hover:border-blue-200"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-base rounded-xl py-4 mt-2 transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(59,130,246,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(59,130,246,0.6)] hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {loading ? "Verifying..." : "Verify code"}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <span className="text-sm font-semibold text-slate-500">
                            Didn't receive code?{" "}
                            <button 
                                type="button" 
                                onClick={handleResend}
                                disabled={resending}
                                className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-colors ml-1 disabled:opacity-50"
                            >
                                {resending ? "Sending..." : "Resend code"}
                            </button>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))]"><div className="text-[rgba(var(--muted),1)] text-lg">Loading...</div></div>}>
            <VerifyForm />
        </Suspense>
    );
}
