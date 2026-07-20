"use client";

import Navbar from "@/components/Navbar";
import { User, Mic, CreditCard, ChevronRight, Save, Camera, Sparkles, Bell, Volume2, Smartphone, Moon, Eye, Languages } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function SettingsPage() {
    const { 
        sessionAlerts, soundEffects, hapticFeedback, 
        darkMode, compactView, 
        micInput, speakerOutput, noiseCancellation, 
        updateSetting 
    } = useSettings();

    return (
        <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col font-sans">
            <Navbar />
            
            <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
                <h1 className="text-3xl font-semibold tracking-wide mb-12 text-white/90">
                    Settings
                </h1>

                <div className="w-full max-w-[800px] flex flex-col gap-10">
                    
                    {/* Profile Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold text-white/90 tracking-wide">
                            Public Profile
                        </h2>
                        <div className="bg-[#101625] border border-white/5 rounded-2xl flex flex-col p-8 gap-8">
                            <div className="flex items-center gap-6">
                                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold border-4 border-[#0a0e1a] shadow-xl relative group cursor-pointer">
                                    R
                                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Camera size={20} className="text-white" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[13px] font-medium transition-colors border border-white/5">
                                        Change Avatar
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-white/70">Full Name</label>
                                    <input type="text" defaultValue="Roth" className="bg-[#141b2e] border border-white/5 rounded-xl px-4 py-3 text-[14px] text-white/90 focus:outline-none focus:border-blue-500/50 transition-colors" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-white/70">Email Address</label>
                                    <input type="email" defaultValue="roth@example.com" className="bg-[#141b2e] border border-white/5 rounded-xl px-4 py-3 text-[14px] text-white/40 focus:outline-none transition-colors" disabled />
                                    <p className="text-[12px] text-white/40 mt-1">Contact support to change your email address.</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                                <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors shadow-lg shadow-blue-500/20 text-white">
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold text-white/90 tracking-wide">
                            Preferences
                        </h2>
                        
                        {/* Notifications */}
                        <div className="bg-[#101625] border border-white/5 rounded-2xl flex flex-col mb-4">
                            <div className="p-4 border-b border-white/5">
                                <span className="text-[11px] font-bold text-white/40 tracking-widest uppercase ml-1">Notifications</span>
                            </div>
                            
                            <div onClick={() => updateSetting("sessionAlerts", !sessionAlerts)} className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <Bell size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-white/90">Session alerts</span>
                                        <span className="text-[13px] text-white/40">Get notified when someone joins your session</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 shadow-inner transition-colors ${sessionAlerts ? 'bg-blue-500' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${sessionAlerts ? 'translate-x-6' : 'translate-x-0 bg-white/50'}`}></div>
                                </div>
                            </div>

                            <div onClick={() => updateSetting("soundEffects", !soundEffects)} className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                                        <Volume2 size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-white/90">Sound effects</span>
                                        <span className="text-[13px] text-white/40">Audio cues for key events</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 shadow-inner transition-colors ${soundEffects ? 'bg-blue-500' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${soundEffects ? 'translate-x-6' : 'translate-x-0 bg-white/50'}`}></div>
                                </div>
                            </div>

                            <div onClick={() => updateSetting("hapticFeedback", !hapticFeedback)} className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer group rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                                        <Smartphone size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-white/90">Haptic feedback</span>
                                        <span className="text-[13px] text-white/40">Vibrate on important events</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 shadow-inner transition-colors ${hapticFeedback ? 'bg-blue-500' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${hapticFeedback ? 'translate-x-6' : 'translate-x-0 bg-white/50'}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* Appearance */}
                        <div className="bg-[#101625] border border-white/5 rounded-2xl flex flex-col mb-4">
                            <div className="p-4 border-b border-white/5">
                                <span className="text-[11px] font-bold text-white/40 tracking-widest uppercase ml-1">Appearance</span>
                            </div>
                            
                            <div onClick={() => updateSetting("darkMode", !darkMode)} className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-400">
                                        <Moon size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-white/90">Dark mode</span>
                                        <span className="text-[13px] text-white/40">Always-on dark interface</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 shadow-inner transition-colors ${darkMode ? 'bg-blue-500' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0 bg-white/50'}`}></div>
                                </div>
                            </div>

                            <div onClick={() => updateSetting("compactView", !compactView)} className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer group rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                        <Eye size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-white/90">Compact view</span>
                                        <span className="text-[13px] text-white/40">Denser layout for session transcripts</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 shadow-inner transition-colors ${compactView ? 'bg-blue-500' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${compactView ? 'translate-x-6' : 'translate-x-0 bg-white/50'}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="bg-[#101625] border border-white/5 rounded-2xl flex flex-col">
                            <div className="p-4 border-b border-white/5">
                                <span className="text-[11px] font-bold text-white/40 tracking-widest uppercase ml-1">Language & Region</span>
                            </div>
                            
                            <div className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors cursor-pointer group rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <Languages size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-white/90">Language settings</span>
                                        <span className="text-[13px] text-white/40">Set your default display language</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
                            </div>
                        </div>
                    </div>

                    {/* Audio & Video Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold text-white/90 tracking-wide">
                            Audio & Video
                        </h2>
                        
                        <div className="bg-[#101625] border border-white/5 rounded-2xl flex flex-col p-6 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-white/70">Microphone Input</label>
                                <select 
                                    value={micInput} 
                                    onChange={(e) => updateSetting("micInput", e.target.value)}
                                    className="bg-[#141b2e] border border-white/5 rounded-xl px-4 py-3 text-[14px] text-white/90 focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="Default">Default - MacBook Pro Microphone</option>
                                    <option value="External">External USB Mic</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-white/70">Speaker Output</label>
                                <select 
                                    value={speakerOutput} 
                                    onChange={(e) => updateSetting("speakerOutput", e.target.value)}
                                    className="bg-[#141b2e] border border-white/5 rounded-xl px-4 py-3 text-[14px] text-white/90 focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="Default">Default - MacBook Pro Speakers</option>
                                    <option value="AirPods">AirPods Pro</option>
                                </select>
                            </div>

                            <div 
                                onClick={() => updateSetting("noiseCancellation", !noiseCancellation)}
                                className="flex items-center justify-between pt-6 border-t border-white/5 cursor-pointer group"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-medium text-white/90">AI Noise Cancellation</span>
                                    <span className="text-[13px] text-white/40">Removes background noise like typing and fans.</span>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 transition-colors ${noiseCancellation ? 'bg-blue-500' : 'bg-white/10'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${noiseCancellation ? 'translate-x-6' : 'translate-x-0 bg-white/50'}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>



                </div>
            </div>
        </div>
    );
}
