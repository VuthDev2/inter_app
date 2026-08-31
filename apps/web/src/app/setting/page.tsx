"use client";

import Navbar from "@/components/Navbar";
import { User, Mic, CreditCard, ChevronRight, Save, Camera, Sparkles, Bell, Volume2, Smartphone, Moon, Eye, Languages, LogOut, X } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { loadProtectedNames, saveProtectedNames } from "@/lib/quickvoice-api";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

export default function SettingsPage() {
    const { 
        sessionAlerts, soundEffects, hapticFeedback, 
        darkMode, compactView, 
        micInput, speakerOutput, noiseCancellation, 
        updateSetting 
    } = useSettings();
    const { signOut, updateProfile, user } = useAuth();
    const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
    const email = user?.email || "";
    const initial = displayName.charAt(0).toUpperCase();
    const [profileName, setProfileName] = useState(displayName);
    const [profileMessage, setProfileMessage] = useState("");
    useEffect(() => setProfileName(displayName), [displayName]);
    const saveProfile = async () => {
        const result = await updateProfile(profileName);
        setProfileMessage(result.error || "Profile saved.");
    };

    // Protected names. NLLB renders most proper nouns correctly by itself;
    // this list is for the ones that are also ordinary words, where
    // "Hello, Nana" was being translated as こんにちは おばあちゃん.
    const [names, setNames] = useState<string[]>([]);
    const [nameDraft, setNameDraft] = useState("");
    const [namesMessage, setNamesMessage] = useState("");
    useEffect(() => {
        loadProtectedNames()
            .then(setNames)
            .catch(() => setNamesMessage("Could not reach the QuickVoice model server."));
    }, []);
    const persistNames = async (next: string[]) => {
        const previous = names;
        setNames(next);
        setNamesMessage("");
        try {
            setNames(await saveProtectedNames(next));
        } catch (reason) {
            setNames(previous);
            setNamesMessage(reason instanceof Error ? reason.message : "Could not save.");
        }
    };
    const addName = () => {
        const value = nameDraft.trim();
        if (!value) return;
        if (names.some((n) => n.toLowerCase() === value.toLowerCase())) {
            setNameDraft("");
            return;
        }
        setNameDraft("");
        void persistNames([...names, value]);
    };

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
                                    <span className="text-xs text-[rgba(var(--muted),1)]">Avatar uses your account initial</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-[rgba(var(--text-secondary),1)]">Full Name</label>
                                    <input type="text" value={profileName} onChange={(event) => setProfileName(event.target.value)} className="bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-[14px] text-[rgba(var(--text),0.9)] focus:outline-none focus:border-blue-500/50 transition-colors" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[13px] font-medium text-[rgba(var(--text-secondary),1)]">Email Address</label>
                                    <input type="email" defaultValue={email} className="bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-[14px] text-[rgba(var(--muted),1)] focus:outline-none transition-colors" disabled />
                                    <p className="text-[12px] text-[rgba(var(--muted),1)] mt-1">Contact support to change your email address.</p>
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                                <div className="flex items-center gap-3"><span className="text-xs text-[rgba(var(--muted),1)]">{profileMessage}</span><button onClick={() => void saveProfile()} disabled={!profileName.trim()} className="flex items-center gap-2 bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-pressed))] px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors shadow-lg shadow-[rgba(var(--primary),0.2)] text-[rgb(var(--text))] disabled:opacity-40">
                                    <Save size={16} /> Save Changes
                                </button></div>
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

                    {/* Protected names */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-semibold text-[rgba(var(--text),0.9)] tracking-wide">
                            Names &amp; Organisations
                        </h2>
                        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl flex flex-col p-8 gap-5">
                            <p className="text-[13px] text-[rgba(var(--muted),1)]">
                                Words listed here are kept exactly as they are instead of being translated.
                                Add a name when it is also an ordinary word &mdash; &ldquo;Nana&rdquo; otherwise
                                becomes &ldquo;grandmother&rdquo; in Japanese.
                            </p>

                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={nameDraft}
                                    onChange={(event) => setNameDraft(event.target.value)}
                                    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addName(); } }}
                                    placeholder="Add a name, e.g. Nana"
                                    aria-label="Add a protected name"
                                    className="flex-1 bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] rounded-xl px-4 py-3 text-[14px] text-[rgba(var(--text),0.9)] focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                                <button
                                    onClick={addName}
                                    disabled={!nameDraft.trim()}
                                    className="bg-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-pressed))] px-5 py-3 rounded-xl text-[14px] font-semibold transition-colors text-[rgb(var(--text))] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Add
                                </button>
                            </div>

                            {names.length === 0 ? (
                                <p className="text-[13px] text-[rgba(var(--muted),1)] italic">
                                    No protected names yet.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {names.map((name) => (
                                        <span
                                            key={name}
                                            className="flex items-center gap-2 bg-[rgb(var(--surface-muted))] border border-[rgb(var(--border))] rounded-full pl-4 pr-2 py-1.5 text-[13px] text-[rgba(var(--text),0.9)]"
                                        >
                                            {name}
                                            <button
                                                onClick={() => void persistNames(names.filter((n) => n !== name))}
                                                aria-label={`Remove ${name}`}
                                                className="rounded-full p-1 hover:bg-[rgba(var(--text),0.1)] transition-colors"
                                            >
                                                <X size={13} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {namesMessage && (
                                <span className="text-[12px] text-[rgba(var(--muted),1)]">{namesMessage}</span>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
