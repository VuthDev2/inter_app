"use client";

import Navbar from "@/components/Navbar";
import { User, Mic, CreditCard, ChevronRight, Save, Camera, Sparkles, Bell, Volume2, Smartphone, Moon, Eye, Languages, LogOut } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
    const { 
        sessionAlerts, soundEffects, hapticFeedback, 
        darkMode, compactView, 
        micInput, speakerOutput, noiseCancellation, 
        updateSetting 
    } = useSettings();
    const { signOut, user } = useAuth();
    const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
    const email = user?.email || "";
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex flex-col font-sans">
            <Navbar />
            
            <div className="flex-1 flex flex-col items-center px-6 pt-16 pb-24">
                <h1 className="text-3xl font-semibold tracking-wide mb-12 text-[rgba(var(--text),0.9)]">
                    Settings
                </h1>

                <div className="w-full max-w-[800px] flex flex-col gap-10">
                    
                    {/* Profile Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                            Public Profile
                        </h2>
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col p-8 gap-8">
                            <div className="flex items-center gap-6">
                                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--purple))] flex items-center justify-center text-2xl font-bold border-4 border-[rgb(var(--bg))] shadow-xl relative group cursor-pointer">
                                    {initial}
                                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Camera size={20} className="text-white" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button className="px-4 py-2 bg-[rgba(var(--text),0.05)] hover:bg-[rgba(var(--text),0.1)] rounded-xl text-[13px] font-medium transition-colors border border-[rgb(var(--border))]">
                                        Change Avatar
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-[rgba(var(--text-secondary),1)]">Full Name</label>
                                    <input type="text" defaultValue={displayName} className="bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-[14px] text-[rgba(var(--text),0.9)] focus:outline-none focus:border-blue-500/50 transition-colors" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-[rgba(var(--text-secondary),1)]">Email Address</label>
                                    <input type="email" defaultValue={email} className="bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-[14px] text-[rgba(var(--muted),1)] focus:outline-none transition-colors" disabled />
                                    <p className="text-[12px] text-[rgba(var(--muted),1)] mt-1">Contact support to change your email address.</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                                <button className="flex items-center gap-2 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-pressed))] px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors shadow-lg shadow-[rgba(var(--primary),0.2)] text-[rgb(var(--text))]">
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                            Preferences
                        </h2>
                        
                        {/* Notifications */}
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col mb-4">
                            <div className="p-4 border-b border-[rgb(var(--border))]">
                                <span className="text-[11px] font-bold text-[rgba(var(--muted),1)] tracking-widest uppercase ml-1">Notifications</span>
                            </div>
                            
                            <div onClick={() => updateSetting("sessionAlerts", !sessionAlerts)} className="flex items-center justify-between p-5 border-b border-[rgb(var(--border))] hover:bg-[rgba(var(--text),0.05)] transition-colors cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--primary))]/10 flex items-center justify-center text-[rgb(var(--primary))]">
                                        <Bell size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">Session alerts</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Get notified when someone joins your session</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 shadow-inner transition-colors ${sessionAlerts ? 'bg-[rgb(var(--primary))]' : 'bg-[rgba(var(--text),0.1)]'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${sessionAlerts ? 'translate-x-6' : 'translate-x-0 bg-[rgba(var(--text),0.5)]'}`}></div>
                                </div>
                            </div>

                            <div onClick={() => updateSetting("soundEffects", !soundEffects)} className="flex items-center justify-between p-5 border-b border-[rgb(var(--border))] hover:bg-[rgba(var(--text),0.05)] transition-colors cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--orange))]/10 flex items-center justify-center text-[rgb(var(--orange))]">
                                        <Volume2 size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">Sound effects</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Audio cues for key events</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 shadow-inner transition-colors ${soundEffects ? 'bg-[rgb(var(--primary))]' : 'bg-[rgba(var(--text),0.1)]'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${soundEffects ? 'translate-x-6' : 'translate-x-0 bg-[rgba(var(--text),0.5)]'}`}></div>
                                </div>
                            </div>

                            <div onClick={() => updateSetting("hapticFeedback", !hapticFeedback)} className="flex items-center justify-between p-5 hover:bg-[rgba(var(--text),0.05)] transition-colors cursor-pointer group rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--purple))]/10 flex items-center justify-center text-[rgb(var(--purple))]">
                                        <Smartphone size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">Haptic feedback</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Vibrate on important events</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 shadow-inner transition-colors ${hapticFeedback ? 'bg-[rgb(var(--primary))]' : 'bg-[rgba(var(--text),0.1)]'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${hapticFeedback ? 'translate-x-6' : 'translate-x-0 bg-[rgba(var(--text),0.5)]'}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* Appearance */}
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col mb-4">
                            <div className="p-4 border-b border-[rgb(var(--border))]">
                                <span className="text-[11px] font-bold text-[rgba(var(--muted),1)] tracking-widest uppercase ml-1">Appearance</span>
                            </div>
                            
                            <div onClick={() => updateSetting("darkMode", !darkMode)} className="flex items-center justify-between p-5 border-b border-[rgb(var(--border))] hover:bg-[rgba(var(--text),0.05)] transition-colors cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--muted))]/10 flex items-center justify-center text-[rgb(var(--muted))]">
                                        <Moon size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">Dark mode</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Always-on dark interface</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 shadow-inner transition-colors ${darkMode ? 'bg-[rgb(var(--primary))]' : 'bg-[rgba(var(--text),0.1)]'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0 bg-[rgba(var(--text),0.5)]'}`}></div>
                                </div>
                            </div>

                            <div onClick={() => updateSetting("compactView", !compactView)} className="flex items-center justify-between p-5 hover:bg-[rgba(var(--text),0.05)] transition-colors cursor-pointer group rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--emerald))]/10 flex items-center justify-center text-[rgb(var(--emerald))]">
                                        <Eye size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">Compact view</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Denser layout for session transcripts</span>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 shadow-inner transition-colors ${compactView ? 'bg-[rgb(var(--primary))]' : 'bg-[rgba(var(--text),0.1)]'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${compactView ? 'translate-x-6' : 'translate-x-0 bg-[rgba(var(--text),0.5)]'}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col">
                            <div className="p-4 border-b border-[rgb(var(--border))]">
                                <span className="text-[11px] font-bold text-[rgba(var(--muted),1)] tracking-widest uppercase ml-1">Language & Region</span>
                            </div>
                            
                            <div className="flex items-center justify-between p-5 hover:bg-[rgba(var(--text),0.05)] transition-colors cursor-pointer group rounded-b-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--indigo))]/10 flex items-center justify-center text-[rgb(var(--indigo))]">
                                        <Languages size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">Language settings</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Set your default display language</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-[rgba(var(--muted),0.8)] group-hover:text-[rgba(var(--text-secondary),1)] transition-colors" />
                            </div>
                        </div>
                    </div>

                    {/* Account Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                            Account
                        </h2>
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col">
                            <button
                                onClick={signOut}
                                className="flex items-center justify-between p-5 hover:bg-[rgba(var(--text),0.05)] transition-colors cursor-pointer group rounded-2xl"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[rgb(var(--red))]/10 flex items-center justify-center text-[rgb(var(--red))]">
                                        <LogOut size={18} />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">Sign out</span>
                                        <span className="text-[13px] text-[rgba(var(--muted),1)]">Sign out of your account</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Audio & Video Section */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                            Audio & Video
                        </h2>
                        
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col p-6 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-[rgba(var(--text-secondary),1)]">Microphone Input</label>
                                <select 
                                    value={micInput} 
                                    onChange={(e) => updateSetting("micInput", e.target.value)}
                                    className="bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-[14px] text-[rgba(var(--text),0.9)] focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="Default">Default - MacBook Pro Microphone</option>
                                    <option value="External">External USB Mic</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-medium text-[rgba(var(--text-secondary),1)]">Speaker Output</label>
                                <select 
                                    value={speakerOutput} 
                                    onChange={(e) => updateSetting("speakerOutput", e.target.value)}
                                    className="bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-[14px] text-[rgba(var(--text),0.9)] focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="Default">Default - MacBook Pro Speakers</option>
                                    <option value="AirPods">AirPods Pro</option>
                                </select>
                            </div>

                            <div 
                                onClick={() => updateSetting("noiseCancellation", !noiseCancellation)}
                                className="flex items-center justify-between pt-6 border-t border-[rgb(var(--border))] cursor-pointer group"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-medium text-[rgba(var(--text),0.9)]">AI Noise Cancellation</span>
                                    <span className="text-[13px] text-[rgba(var(--muted),1)]">Removes background noise like typing and fans.</span>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative flex items-center px-1 shrink-0 transition-colors ${noiseCancellation ? 'bg-[rgb(var(--primary))]' : 'bg-[rgba(var(--text),0.1)]'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${noiseCancellation ? 'translate-x-6' : 'translate-x-0 bg-[rgba(var(--text),0.5)]'}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>



                </div>
            </div>
        </div>
    );
}
