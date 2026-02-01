import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Settings as SettingsIcon, X, Sun, Check, Smartphone, Timer, Clock, Coffee, Brain, Leaf } from 'lucide-react';

// Types
type TimerMode = 'pomodoro' | 'stopwatch';
type TimerType = 'focus' | 'shortBreak' | 'longBreak';
type Theme = 'lavender' | 'ocean' | 'sunset' | 'forest' | 'midnight' | 'cherry' | 'aurora' | 'mint';

interface TimerSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLong: number;
}

interface Stats {
  totalFocusTime: number;
  sessionsCompleted: number;
  currentStreak: number;
  lastSessionDate: string | null;
}

// Data
const themes: { id: Theme; name: string; colors: string; accent: string }[] = [
  { id: 'lavender', name: 'Lavender', colors: 'from-[#9b7bb8] to-[#c4a8dc]', accent: 'bg-[#7d5a9e]' },
  { id: 'ocean', name: 'Ocean', colors: 'from-[#4facfe] to-[#00f2fe]', accent: 'bg-[#0080ff]' },
  { id: 'sunset', name: 'Sunset', colors: 'from-[#fa709a] to-[#fee140]', accent: 'bg-[#f7797d]' },
  { id: 'forest', name: 'Forest', colors: 'from-[#11998e] to-[#38ef7d]', accent: 'bg-[#0f8a5f]' },
  { id: 'midnight', name: 'Midnight', colors: 'from-[#232526] to-[#414345]', accent: 'bg-[#6c5ce7]' },
  { id: 'cherry', name: 'Cherry', colors: 'from-[#ffecd2] to-[#fcb69f]', accent: 'bg-[#ff6b6b]' },
  { id: 'aurora', name: 'Aurora', colors: 'from-[#667eea] to-[#764ba2]', accent: 'bg-[#5f27cd]' },
  { id: 'mint', name: 'Mint', colors: 'from-[#a8edea] to-[#fed6e3]', accent: 'bg-[#00b894]' },
];

function App() {
  // State
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timerType, setTimerType] = useState<TimerType>('focus');
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60); // For progress ring
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [currentSession, setCurrentSession] = useState(0);

  const [settings, setSettings] = useState<TimerSettings>(() => {
    const saved = localStorage.getItem('studySettings');
    return saved ? JSON.parse(saved) : {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLong: 4
    };
  });

  const [stats, setStats] = useState<Stats>(() => {
    const saved = localStorage.getItem('studyStats');
    return saved ? JSON.parse(saved) : {
      totalFocusTime: 0,
      sessionsCompleted: 0,
      currentStreak: 0,
      lastSessionDate: null
    };
  });

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('studyTheme') as Theme) || 'lavender');
  const [showSettings, setShowSettings] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Persistence
  useEffect(() => localStorage.setItem('studySettings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('studyStats', JSON.stringify(stats)), [stats]);
  useEffect(() => localStorage.setItem('studyTheme', theme), [theme]);

  // PWA Install Prompt
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  // Timer Logic
  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        if (mode === 'pomodoro') {
          setTime((t) => {
            if (t <= 1) {
              completePomodoro();
              return 0;
            }
            return t - 1;
          });
        } else {
          setStopwatchTime(t => t + 1);
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, mode]);

  const completePomodoro = () => {
    setIsActive(false);

    if (timerType === 'focus') {
      const newStats = { ...stats };
      newStats.sessionsCompleted += 1;
      newStats.totalFocusTime += settings.focusDuration * 60;

      const today = new Date().toDateString();
      const last = stats.lastSessionDate ? new Date(stats.lastSessionDate).toDateString() : null;

      if (last !== today) {
        if (last === new Date(Date.now() - 86400000).toDateString()) {
          newStats.currentStreak += 1;
        } else {
          newStats.currentStreak = 1;
        }
      }
      newStats.lastSessionDate = new Date().toISOString();
      setStats(newStats);

      const nextSession = currentSession + 1;
      setCurrentSession(nextSession);

      if (nextSession >= settings.sessionsBeforeLong) {
        switchTimerType('longBreak');
        setCurrentSession(0);
      } else {
        switchTimerType('shortBreak');
      }
    } else {
      switchTimerType('focus');
    }
  };

  const switchTimerType = (type: TimerType) => {
    setTimerType(type);
    const duration = type === 'focus' ? settings.focusDuration :
      type === 'shortBreak' ? settings.shortBreakDuration :
        settings.longBreakDuration;
    setTime(duration * 60);
    setTotalTime(duration * 60);
    setIsActive(false);
  };

  const switchMode = (newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    if (newMode === 'pomodoro') {
      switchTimerType(timerType); // Reset time
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    if (mode === 'pomodoro') {
      const duration = timerType === 'focus' ? settings.focusDuration :
        timerType === 'shortBreak' ? settings.shortBreakDuration :
          settings.longBreakDuration;
      setTime(duration * 60);
    } else {
      setStopwatchTime(0);
    }
  };

  // Helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isDark = theme === 'midnight';
  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800/90' : 'bg-white/80';
  const btnPrimary = isDark ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:scale-105';

  // Progress Ring
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progress = mode === 'pomodoro' ? time / totalTime : 1;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Background Gradients */}
      <div className={`fixed inset-0 bg-gradient-to-br opacity-50 -z-10 transition-all duration-500 ${themes.find(t => t.id === theme)?.colors}`} />

      <div className="w-full max-w-md md:max-w-5xl mx-auto min-h-screen px-4 py-6 md:py-12 flex flex-col gap-6 md:gap-10">

        {/* Header */}
        <header className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${themes.find(t => t.id === theme)?.colors} shadow-md`}>
              <Timer className="w-6 h-6 text-white" />
            </div>
            <h1 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${themes.find(t => t.id === theme)?.colors} brightness-150`}>
              StudyFlow
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowThemePicker(true)}
              className={`p-2.5 rounded-xl transition-all ${cardBg} shadow-sm hover:scale-105 border border-white/10`}>
              {theme === 'midnight' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Sun className="w-5 h-5 text-orange-400" />}
            </button>
            <button onClick={() => setShowSettings(true)}
              className={`p-2.5 rounded-xl transition-all ${cardBg} shadow-sm hover:scale-105 border border-white/10 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start justify-center flex-1">

          {/* LEFT COLUMN - Timer & Controls */}
          <div className="w-full md:flex-1 flex flex-col gap-6">

            {/* Mode Selector */}
            <div className={`flex p-1.5 rounded-2xl ${isDark ? 'bg-slate-800/80' : 'bg-white/60'} backdrop-blur shadow-sm border border-white/10`}>
              <button onClick={() => switchMode('pomodoro')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                ${mode === 'pomodoro' ? `${isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white shadow text-purple-600'}` : `hover:bg-black/5 ${subTextColor}`}`}>
                <Clock className="w-4 h-4" /> Pomodoro
              </button>
              <button onClick={() => switchMode('stopwatch')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                ${mode === 'stopwatch' ? `${isDark ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white shadow text-emerald-600'}` : `hover:bg-black/5 ${subTextColor}`}`}>
                <Timer className="w-4 h-4" /> Stopwatch
              </button>
            </div>

            {/* Main Timer Card */}
            <main className={`flex-1 flex flex-col items-center justify-center gap-8 rounded-[2rem] p-8 md:p-12 shadow-2xl backdrop-blur-xl border border-white/20 transition-all duration-300 relative overflow-hidden ${cardBg}`}>

              {/* Background Decoration */}
              <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${themes.find(t => t.id === theme)?.colors} opacity-5 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none`} />
              <div className={`absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr ${themes.find(t => t.id === theme)?.colors} opacity-5 blur-3xl rounded-full -ml-32 -mb-32 pointer-events-none`} />

              {mode === 'pomodoro' && (
                <div className="flex flex-wrap justify-center gap-2 z-10 w-full">
                  {[
                    { id: 'focus' as const, label: 'Focus', icon: Brain },
                    { id: 'shortBreak' as const, label: 'Short Break', icon: Coffee },
                    { id: 'longBreak' as const, label: 'Long Break', icon: Leaf },
                  ].map((type) => (
                    <button key={type.id} onClick={() => switchTimerType(type.id)}
                      className={`flex-1 min-w-[100px] px-4 py-3 rounded-2xl text-sm font-bold transition-all flex flex-col md:flex-row items-center justify-center gap-2 border-2
                      ${timerType === type.id
                          ? `border-transparent ${isDark ? 'bg-indigo-600/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'} ring-2 ring-indigo-500/20`
                          : `border-transparent hover:bg-black/5 ${subTextColor}`}`}>
                      <type.icon className={`w-5 h-5 ${timerType === type.id ? 'animate-bounce-subtle' : ''}`} />
                      {type.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Timer Ring */}
              <div className="relative group cursor-pointer z-10 my-4 md:my-8" onClick={toggleTimer}>
                {/* Glow Effect */}
                <div className={`absolute inset-4 rounded-full bg-gradient-to-tr ${themes.find(t => t.id === theme)?.colors} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-500`} />

                <svg width="280" height="280" className="-rotate-90 drop-shadow-2xl">
                  <circle cx="140" cy="140" r={radius} fill="none" stroke="currentColor" strokeWidth="12"
                    className={`${isDark ? 'text-slate-700/50' : 'text-slate-200'} transition-colors duration-500`} />
                  <circle cx="140" cy="140" r={radius} fill="none" stroke="currentColor" strokeWidth="12"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={mode === 'stopwatch' ? 0 : strokeDashoffset}
                    className={`transition-all duration-1000 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-[5.5rem] md:text-8xl font-black tracking-tighter tabular-nums leading-none ${textColor} drop-shadow-sm scale-110 lg:scale-100`}>
                    {mode === 'pomodoro' ? formatTime(time) : formatTime(stopwatchTime)}
                  </span>
                  <span className={`text-sm md:text-base font-bold tracking-[0.2em] uppercase mt-4 px-3 py-1 rounded-full ${isDark ? 'bg-white/5 text-slate-400' : 'bg-black/5 text-slate-500'}`}>
                    {isActive ? (mode === 'pomodoro' ? 'Focusing' : 'Running') : 'Paused'}
                  </span>
                </div>

                {/* Play overlay on hover */}
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100">
                    <div className="bg-white p-4 rounded-full shadow-lg">
                      <Play className="w-10 h-10 text-indigo-600 ml-1" fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 w-full max-w-sm z-10">
                <button onClick={resetTimer} className={`p-5 rounded-2xl transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <RotateCcw className="w-6 h-6" />
                </button>
                <button onClick={toggleTimer} className={`flex-1 py-5 rounded-2xl text-white font-bold text-xl shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 active:shadow-none flex items-center justify-center gap-3 ${btnPrimary}`}>
                  {isActive ? <span className="flex items-center gap-2"><div className="w-3 h-8 bg-white/90 rounded-full" /> <div className="w-3 h-8 bg-white/90 rounded-full" /></span> : <Play className="w-8 h-8 fill-current" />}
                  {isActive ? 'Pause' : 'Start'}
                </button>
              </div>
            </main>
          </div>

          {/* RIGHT COLUMN - Stats & Extras */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4 md:gap-6">

            {/* Stats Card */}
            <div className={`p-6 md:p-8 rounded-[2rem] shadow-xl backdrop-blur border border-white/20 ${cardBg} flex flex-col gap-6`}>
              <h3 className={`text-lg font-bold ${textColor} flex items-center gap-2`}>
                Today's Stats
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800 border border-white/5' : 'bg-slate-50 border border-slate-100'} transition-transform hover:scale-105`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                      <span className="text-xl">🔥</span>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${subTextColor}`}>Streak</span>
                  </div>
                  <span className={`text-3xl font-black ${textColor}`}>{stats.currentStreak} <span className="text-sm font-medium text-gray-400">days</span></span>
                </div>

                <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800 border border-white/5' : 'bg-slate-50 border border-slate-100'} transition-transform hover:scale-105`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <span className="text-xl">🎯</span>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${subTextColor}`}>Sessions</span>
                  </div>
                  <span className={`text-3xl font-black ${textColor}`}>{stats.sessionsCompleted}</span>
                </div>

                <div className={`col-span-2 md:col-span-1 p-4 rounded-2xl ${isDark ? 'bg-slate-800 border border-white/5' : 'bg-slate-50 border border-slate-100'} transition-transform hover:scale-105`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                      <span className="text-xl">⏳</span>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${subTextColor}`}>Focus Time</span>
                  </div>
                  <span className={`text-3xl font-black ${textColor}`}>{Math.floor(stats.totalFocusTime / 60)} <span className="text-sm font-medium text-gray-400">min</span></span>
                </div>
              </div>
            </div>

            {/* Installation Banner (Mobile/Tablet only) */}
            {showInstall && (
              <div className={`p-6 rounded-[2rem] shadow-lg border border-indigo-100 relative overflow-hidden ${cardBg}`}>
                <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setShowInstall(false)} className={`p-1 rounded-full hover:bg-black/5 ${subTextColor}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-2">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg leading-tight ${textColor}`}>Install StudyFlow</h3>
                    <p className={`text-sm mt-1 ${subTextColor}`}>Add to your home screen for the best fullscreen experience.</p>
                  </div>
                  <button onClick={handleInstallClick} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
                    Install App
                  </button>
                </div>
              </div>
            )}

            {/* Quote of the day placeholder or extra widget could go here */}
            <div className={`p-6 rounded-[2rem] ${isDark ? 'bg-indigo-900/20 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'} border flex items-center justify-center text-center`}>
              <p className={`text-sm italic font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                "Focus on being productive instead of busy."
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="p-4 border-b border-black/5 flex justify-between items-center bg-black/5">
              <h2 className={`font-bold text-lg ${textColor}`}>Settings</h2>
              <button onClick={() => setShowSettings(false)} className={`p-1 rounded-full hover:bg-black/10 ${subTextColor}`}><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-6">
              {[
                { label: 'Focus Duration', key: 'focusDuration', max: 120 },
                { label: 'Short Break', key: 'shortBreakDuration', max: 30 },
                { label: 'Long Break', key: 'longBreakDuration', max: 60 },
              ].map((setting) => (
                <div key={setting.key} className="flex justify-between items-center">
                  <span className={`font-medium ${textColor}`}>{setting.label}</span>
                  <div className="flex items-center gap-3 bg-black/5 rounded-lg p-1">
                    <button onClick={() => setSettings(s => ({ ...s, [setting.key]: Math.max(1, (s as any)[setting.key] - 1) }))}
                      className={`w-8 h-8 rounded-md flex items-center justify-center font-bold hover:bg-white`}>-</button>
                    <span className={`w-8 text-center font-mono font-bold ${textColor}`}>{(settings as any)[setting.key]}</span>
                    <button onClick={() => setSettings(s => ({ ...s, [setting.key]: Math.min(setting.max, (s as any)[setting.key] + 1) }))}
                      className={`w-8 h-8 rounded-md flex items-center justify-center font-bold hover:bg-white`}>+</button>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-black/5">
                <button onClick={() => { if (confirm('Reset all stats?')) setStats({ totalFocusTime: 0, sessionsCompleted: 0, currentStreak: 0, lastSessionDate: null }); }}
                  className="w-full py-3 rounded-xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50">
                  Reset Statistics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Picker Modal */}
      {showThemePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${textColor}`}>Pick a Theme</h2>
              <button onClick={() => setShowThemePicker(false)}><X className={`w-6 h-6 ${subTextColor}`} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((t) => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-2xl flex items-center gap-3 transition-all border-2
                   ${theme === t.id ? 'border-indigo-500 bg-indigo-50' : `border-transparent hover:bg-black/5 ${isDark ? 'hover:bg-white/5' : ''}`}`}>
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.colors} shadow-sm outline-2 outline-offset-1`} />
                  <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{t.name}</span>
                  {theme === t.id && <Check className="w-4 h-4 text-indigo-600 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
