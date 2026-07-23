"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
    const router = useRouter();
    const { signUp, signInWithGoogle, user, initialized } = useAuth();
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        if (initialized && user) router.push("/dashboard");
    }, [initialized, user, router]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        if (!agreeTerms) {
            setError("You must agree to the Terms & Privacy policy.");
            return;
        }
        setLoading(true);
        const result = await signUp(email, password, displayName);
        setLoading(false);
        if (result.error) {
            setError(result.error);
        } else {
            router.push("/dashboard");
        }
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
                <div className="w-full max-w-[480px] bg-white rounded-[2rem] p-10 sm:p-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom-8 fade-in duration-700">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-10">Create an account</h2>
                    
                    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl px-5 py-3">
                                {error}
                            </div>
                        )}
                        <div className="flex flex-col gap-2 group">
                            <label className="text-sm font-bold text-slate-700 group-focus-within:text-blue-600 transition-colors">Full name</label>
                            <input 
                                type="text" 
                                placeholder="enter your Full Name" 
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                required
                                className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-5 py-4 text-base text-slate-800 focus:outline-none focus:border-blue-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400 font-medium transition-all duration-300 hover:bg-slate-100 focus:scale-[1.01]"
                            />
                        </div>

                        <div className="flex flex-col gap-2 group">
                            <label className="text-sm font-bold text-slate-700 group-focus-within:text-blue-600 transition-colors">Your Email</label>
                            <input 
                                type="email" 
                                placeholder="enter your email" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-5 py-4 text-base text-slate-800 focus:outline-none focus:border-blue-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400 font-medium transition-all duration-300 hover:bg-slate-100 focus:scale-[1.01]"
                            />
                        </div>

                        <div className="flex flex-col gap-2 group">
                            <label className="text-sm font-bold text-slate-700 group-focus-within:text-blue-600 transition-colors">Password</label>
                            <input 
                                type="password" 
                                placeholder="enter your password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-5 py-4 text-base text-slate-800 focus:outline-none focus:border-blue-100 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder-slate-400 font-medium transition-all duration-300 hover:bg-slate-100 focus:scale-[1.01]"
                            />
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                            <input 
                                type="checkbox" 
                                id="terms" 
                                checked={agreeTerms}
                                onChange={e => setAgreeTerms(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-transform hover:scale-110" 
                            />
                            <label htmlFor="terms" className="text-sm font-semibold text-slate-600 cursor-pointer">
                                I agree to the <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">Terms</a> & <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">Private policy</a>.
                            </label>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-base rounded-xl py-4 mt-4 transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(37,99,235,0.6)] hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {loading ? "Creating account..." : "Continue"}
                        </button>
                    </form>

                    <div className="flex items-center gap-4 my-10">
                        <div className="flex-1 h-px bg-slate-200"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Or continue with</span>
                        <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button type="button" onClick={signInWithGoogle} className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl py-4 flex items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/>
                                <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 01-6.723-4.806L1.24 17.35C3.198 21.302 7.269 24 12 24c3.24 0 5.966-1.08 7.96-2.916l-3.92-3.071z"/>
                                <path fill="#4A90E2" d="M19.96 21.084C21.6 19.398 22.5 16.96 22.5 14.1c0-.986-.11-1.928-.29-2.82H12v5.334h5.92c-.27 1.407-1.125 2.593-2.316 3.42l4.356 3.05z"/>
                                <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 014.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 000 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z"/>
                            </svg>
                            Login with Google
                        </button>
                        <button type="button" className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl py-4 flex items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
                            <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            Login with Facebook
                        </button>
                    </div>

                    <div className="mt-10 text-center">
                        <span className="text-sm font-semibold text-slate-500">
                            Have an account? <Link href="/login" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors ml-1">Sign In</Link>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
