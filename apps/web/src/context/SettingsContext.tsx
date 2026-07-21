"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

type SettingsState = {
    sessionAlerts: boolean;
    soundEffects: boolean;
    hapticFeedback: boolean;
    darkMode: boolean;
    compactView: boolean;
    language: string;
    micInput: string;
    speakerOutput: string;
    noiseCancellation: boolean;
};

type SettingsContextType = SettingsState & {
    updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
};

const defaultSettings: SettingsState = {
    sessionAlerts: true,
    soundEffects: true,
    hapticFeedback: false,
    darkMode: false, // Default to light mode (matching mobile)
    compactView: false,
    language: "English",
    micInput: "Default",
    speakerOutput: "Default",
    noiseCancellation: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<SettingsState>(defaultSettings);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const storedSettings = localStorage.getItem("app_settings");
        if (storedSettings) {
            try {
                setSettings({ ...defaultSettings, ...JSON.parse(storedSettings) });
            } catch (e) {
                console.error("Failed to parse settings from localStorage", e);
            }
        }
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        localStorage.setItem("app_settings", JSON.stringify(settings));
        
        // Apply side effects to DOM for global CSS targeting
        if (settings.darkMode) {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
        } else {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
        }
        
        if (settings.compactView) {
            document.documentElement.classList.add("compact-mode");
        } else {
            document.documentElement.classList.remove("compact-mode");
        }
    }, [settings, isMounted]);

    const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <SettingsContext.Provider value={{ ...settings, updateSetting }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
