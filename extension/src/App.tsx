import { useState } from 'react'
import { Mic, Settings, Cloud, ExternalLink } from 'lucide-react'
import { useLiveInterpretation } from './hooks/useLiveInterpretation'

function App() {
  const [isTwoWay, setIsTwoWay] = useState(false)
  const { isListening, interimText, entries, start, stop } = useLiveInterpretation("English (US)", "Japanese")

  return (
    <div className="w-[360px] h-[500px] flex flex-col bg-background font-sans p-4 gap-4">
      {/* 1. Top Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
          <span className="font-bold text-[16px] tracking-wide">QuickVoice</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 rounded-md glass text-[12px] font-semibold tracking-wider border-[rgba(37,99,235,0.3)] text-primary">
            EN ↔ JA
          </span>
          <button className="text-muted hover:text-text transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Control Panel */}
      <div className="glass rounded-2xl p-5 flex flex-col items-center gap-6 relative overflow-hidden">
        {/* Active Mode Selector */}
        <button
            onClick={() => setIsTwoWay(!isTwoWay)}
            className="flex items-center gap-2 cursor-pointer focus:outline-none group z-10"
        >
            <div className="w-10 h-5 rounded-full border border-border bg-[rgba(0,0,0,0.5)] flex items-center px-1 transition-all relative">
                <div className={`w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_10px_rgba(37,99,235,0.8)] transition-transform duration-200 ease-in-out absolute left-1 ${isTwoWay ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className={`text-[12px] font-medium transition-colors ${isTwoWay ? 'text-primary' : 'text-muted group-hover:text-text'}`}>
                {isTwoWay ? 'Two-Way Dialogue' : 'One-Way Mode'}
            </span>
        </button>

        {/* Central Action Area */}
        <div className="flex flex-col items-center gap-4 z-10">
          <button 
            onClick={() => isListening ? stop() : start()}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening 
                ? 'bg-primary shadow-[0_0_30px_rgba(37,99,235,0.6)] scale-105' 
                : 'bg-[rgba(37,99,235,0.2)] border border-primary hover:bg-[rgba(37,99,235,0.3)]'
            }`}
          >
            <Mic className={`w-8 h-8 ${isListening ? 'text-white' : 'text-primary'}`} />
          </button>
          <span className="text-[13px] font-medium text-muted">
            {isListening ? 'Interpreting...' : 'Ready to capture audio...'}
          </span>
        </div>

        {/* Real-time Visualizer */}
        <div className="h-6 flex items-end gap-1 z-10">
          {isListening ? (
             [...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-primary rounded-t-full animate-pulse"
                  style={{ 
                    height: `${Math.max(20, Math.random() * 100)}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.5s'
                  }}
                />
             ))
          ) : (
            <div className="w-32 h-[2px] bg-border rounded-full" />
          )}
        </div>
        
        {/* Glow behind */}
        {isListening && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-[40px]" />
        )}
      </div>

      {/* 3. Live Transcript Box */}
      <div className="flex-1 glass rounded-xl p-4 overflow-y-auto flex flex-col gap-3">
        {isListening || entries.length > 0 ? (
          <>
            {entries.map(entry => (
                <div key={entry.id} className="flex flex-col gap-1 mb-2">
                  <span className="text-[10px] text-primary/70 font-semibold">Saved</span>
                  <p className="text-[13px] text-text/90">{entry.original}</p>
                  <p className="text-[13px] text-muted">{entry.translation}</p>
                </div>
            ))}
            {interimText && (
               <div className="flex flex-col gap-1">
                 <span className="text-[10px] text-primary font-semibold">Live</span>
                 <p className="text-[13px] text-text/90 animate-pulse">{interimText}</p>
               </div>
            )}
          </>
        ) : (
           <div className="h-full flex items-center justify-center text-[12px] text-muted">
             Transcripts will appear here
           </div>
        )}
      </div>

      {/* 4. Web Sync & Save Section */}
      <div className="flex items-center gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-white py-2.5 rounded-xl text-[13px] font-semibold transition-colors shadow-[0_4px_14px_rgba(37,99,235,0.4)]">
          <Cloud className="w-4 h-4" />
          Save to QuickVoice Web
        </button>
        <button className="w-10 h-10 flex items-center justify-center glass rounded-xl hover:bg-[rgba(255,255,255,0.1)] transition-colors">
          <ExternalLink className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* 5. Footer Note */}
      <div className="flex items-center justify-center gap-1.5 mt-1">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
        <span className="text-[10px] text-muted truncate">
          Connected to Supabase Realtime • Account: roth@kirirom.edu.kh
        </span>
      </div>
    </div>
  )
}

export default App
