import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./index.css";

const API = "";

/* ── HP Bar ── */
function HpBar({ current, max, color, label, size="normal" }) {
  const pct = Math.max(0, (current / max) * 100);
  const grad = color === "red" ? "linear-gradient(90deg,#991b1b,#dc2626,#f87171)" : "linear-gradient(90deg,#065f46,#059669,#34d399)";
  const glow = color === "red" ? "rgba(248,113,113,0.35)" : "rgba(52,211,153,0.35)";
  const height = size === "large" ? "h-4" : "h-2";
  const labelSize = size === "large" ? "text-xs" : "text-[10px]";
  
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className={`font-mono ${labelSize} text-muted tracking-wider uppercase font-semibold`}>{label}</span>
        <span className={`font-mono ${labelSize} text-text font-bold`}>
          {current}
          <span className="text-muted">/{max}</span>
          <span className={`ml-1.5 ${pct < 30 ? "text-red" : "text-muted"}`}>{pct.toFixed(0)}%</span>
        </span>
      </div>
      <div className={`w-full ${height} bg-surface-high/80 rounded-full overflow-hidden ghost-border`}>
        <motion.div className="h-full rounded-full" style={{ background: grad, boxShadow: `0 0 8px ${glow}` }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 60, damping: 14 }} />
      </div>
    </div>
  );
}

/* ── Resistance Row ── */
function ResBar({ label, icon, value }) {
  const pct = Math.min(100, (value / 100) * 100);
  let tc = value >= 100 ? "text-red" : value > 0 ? "text-amber" : "text-muted/40";
  return (
    <div className="flex items-center gap-2 p-2 bg-surface/60 rounded-lg ghost-border">
      <span className="material-symbols-outlined text-outline text-sm">{icon}</span>
      <span className="text-[10px] font-bold tracking-wider uppercase text-muted w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-high rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full bg-amber text-amber" animate={{ width: `${pct}%` }} transition={{ type: "spring" }} />
      </div>
      <span className={`text-[10px] font-bold w-8 text-right font-mono ${tc}`}>{value}</span>
    </div>
  );
}

/* ── Action Button ── */
function Btn({ label, onClick, variant = "default", disabled }) {
  const styles = {
    default: "border-outline-variant/40 text-muted hover:text-text hover:border-cyan/30 hover:bg-cyan-dim",
    danger: "border-red/30 text-red hover:bg-red-dim hover:border-red/50",
    primary: "border-cyan/30 text-cyan hover:bg-cyan-dim",
    domain: "border-purple-500/50 text-purple-400 hover:bg-purple-500/20",
    reset: "border-outline/30 text-muted/60 hover:text-muted",
  };
  return (
    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }} onClick={onClick} disabled={disabled} className={`px-3 py-1.5 rounded-md border font-bold text-[9px] tracking-[0.06em] uppercase transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed bg-surface/60 ${styles[variant]}`}>
      {label}
    </motion.button>
  );
}

/* ── Stat Chip ── */
function StatChip({ label, value, color = "text-text", glowing=false }) {
  return (
    <div className={`bg-surface/60 rounded-md p-2 ghost-border text-center min-w-[70px] transition-all ${glowing ? 'shadow-[0_0_12px_rgba(0,246,255,0.4)] border border-cyan/50' : 'border border-transparent'}`}>
      <div className="text-[7px] font-bold tracking-wider uppercase text-muted mb-0.5">{label}</div>
      <div className={`font-mono text-xs font-bold ${color}`}>{value}</div>
    </div>
  );
}

/* MAIN APP */
export default function App() {
  const [state, setState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shakeClass, setShakeClass] = useState("");
  const [flashBg, setFlashBg] = useState("");
  const [wheelRot, setWheelRot] = useState(0);
  const [adaptFlash, setAdaptFlash] = useState(false);
  
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const triggerVisuals = (oldState, newState) => {
    // Damage flashes
    if (newState.player_hp < oldState.player_hp) {
      setFlashBg("bg-red-900/30");
      setShakeClass("shake-sm");
      setTimeout(() => { setFlashBg(""); setShakeClass(""); }, 300);
    } else if (newState.player_hp > oldState.player_hp) {
      setFlashBg("bg-green-900/30");
      setTimeout(() => setFlashBg(""), 300);
    }

    // Wheel rotation logic
    const oldTotalRes = oldState.resistances.physical + oldState.resistances.ce + oldState.resistances.ct;
    const newTotalRes = newState.resistances.physical + newState.resistances.ce + newState.resistances.ct;
    
    if (newTotalRes > oldTotalRes) {
      setWheelRot(prev => prev + 45);
      setAdaptFlash(true);
      setTimeout(() => setAdaptFlash(false), 800);
    }
  };

  async function doReset() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ difficulty: "hard" }) });
      const d = await r.json();
      setState(d);
      setWheelRot(0);
      setLogs([{ turn: d.turn_number, text: d.log }]);
    } catch {}
    setLoading(false);
  }

  async function doStep(action) {
    if (!state || state.done || loading) return;
    setLoading(true);
    const oldState = state;
    try {
      const r = await fetch(`${API}/api/step`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json();
      setState(d);
      setLogs(prev => [...prev, { turn: d.turn_number, text: d.log }]);
      triggerVisuals(oldState, d);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    doReset();
  }, []);

  if (!state) return <div className="h-screen flex items-center justify-center bg-bg"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-10 h-10 border-2 border-cyan border-t-transparent rounded-full" /></div>;

  const done = state.done;
  const isDE = state.domain.active;

  return (
    <>
      <div className={`h-screen flex flex-col bg-bg grid-bg scanlines relative overflow-hidden transition-colors duration-300 ${shakeClass} ${flashBg}`}>
        {isDE && <div className="absolute inset-0 pointer-events-none z-0 border-[8px] border-purple-500/30 shadow-[inset_0_0_100px_rgba(168,85,247,0.15)] bg-purple-900/10 transition-all duration-500" />}

        <header className="glass-panel mx-2 mt-1.5 px-4 py-1.5 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black tracking-[-0.02em] uppercase text-text">AERO-TACTICAL</span>
            <span className="text-[9px] text-muted tracking-wide hidden sm:inline">Mahoraga Adaptation Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted">T{state.turn_number}/{state.max_turns}</span>
            <span className={`text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-1 rounded-md ${done ? "bg-red-dim text-red border border-red/20" : "bg-cyan-dim text-cyan border border-cyan/20"}`}>
              {done ? "ENDED" : "LIVE"}
            </span>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-12 gap-2 px-2 py-1.5 min-h-0 overflow-hidden relative z-10">
          
          {/* LEFT: Player (Sorcerer) */}
          <div className="col-span-5 flex flex-col gap-2 min-h-0">
            <div className="glass-panel p-6 flex-1 relative overflow-hidden flex flex-col justify-center border-cyan-900/20">
              {isDE && <div className="absolute inset-0 bg-purple-500/10 animate-pulse pointer-events-none" />}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-cyan text-xl">person</span>
                  <span className="text-[14px] font-black tracking-[0.12em] uppercase text-cyan/90">PLAYER (SORCERER)</span>
                </div>
              </div>
              <HpBar current={state.player_hp} max={1200} color="green" label="Vitality" size="large" />
              
              <div className="flex gap-4 mt-8 flex-wrap justify-center">
                <StatChip label="Crit Stack" value={state.crit_stack} color={state.crit_stack === 3 ? "text-cyan" : "text-muted"} glowing={state.crit_stack === 3} />
                <StatChip label="Heal CD" value={state.cooldowns.heal === 0 ? "RDY" : state.cooldowns.heal} color={state.cooldowns.heal === 0 ? "text-green" : "text-red"} />
                <StatChip label="DE Cooldown" value={state.cooldowns.turns_since_last_DE >= 4 ? "RDY" : 4 - state.cooldowns.turns_since_last_DE} color={state.cooldowns.turns_since_last_DE >= 4 ? "text-purple-400" : "text-red"} />
              </div>

              {isDE && (
                <div className="mt-8 p-4 border border-purple-500/40 bg-purple-500/10 rounded-md text-center">
                  <span className="text-sm font-bold text-purple-400 uppercase tracking-widest">Domain Active</span>
                  <div className="text-[12px] text-purple-300 font-mono mt-2">Turns Left: {state.domain.turns_left}</div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Boss & Log */}
          <div className="col-span-7 flex flex-col gap-2 min-h-0">
            
            {/* TOP ROW: Boss Stats + Wheel */}
            <div className="flex gap-2 shrink-0">
              {/* Boss Stats */}
              <div className="glass-panel p-4 flex-1 border-red-900/30 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red/80 text-base">warning</span>
                    <span className="text-[14px] font-black tracking-[0.15em] uppercase text-red">MAHORAGA (BOSS)</span>
                  </div>
                </div>
                <HpBar current={state.boss_hp} max={2000} color="red" label="Boss HP" size="large" />
                
                <div className="mt-5">
                  <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted mb-2">ADAPTATION STATUS</div>
                  <div className="space-y-2">
                    <ResBar label="Physical" icon="fitness_center" value={state.resistances.physical} />
                    <ResBar label="CE" icon="bolt" value={state.resistances.ce} />
                    <ResBar label="Technique" icon="precision_manufacturing" value={state.resistances.ct} />
                  </div>
                </div>
              </div>

              {/* Wheel */}
              <div className="glass-panel p-4 w-1/3 flex items-center justify-center overflow-hidden relative border-amber-900/20">
                <AnimatePresence>
                  {adaptFlash && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                      <div className="w-[80%] aspect-square rounded-full border-2 border-amber-500/50 adapt-ring"
                        style={{ boxShadow: "0 0 30px rgba(245,158,11,0.3)" }} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.img
                  src="/mahoraga_wheel.svg"
                  alt="Mahoraga Wheel"
                  className="w-full max-w-[150px] aspect-square object-contain wheel-idle"
                  animate={{ rotate: wheelRot }}
                  transition={{ type: "spring", stiffness: 25, damping: 14, mass: 2.5 }}
                  draggable={false}
                />
              </div>
            </div>

            {/* BOTTOM ROW: Combat Log */}
            <div className="glass-panel p-3 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted">COMBAT LOG</span>
              </div>
              <div ref={logRef} className="flex-1 overflow-y-auto bg-bg/40 rounded-lg p-2 ghost-border min-h-0">
                {logs.map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="py-2 border-b border-outline-variant/15 last:border-0 text-[11px] font-mono text-muted/80">
                    <span className="text-cyan">T{l.turn}:</span> {l.text}
                  </motion.div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="glass-panel mx-2 mb-1.5 px-4 py-3 flex items-center justify-center gap-3 flex-wrap z-10 shrink-0">
          <Btn label="Physical Attack" onClick={() => doStep(0)} disabled={done} />
          <Btn label="CE Attack" onClick={() => doStep(1)} disabled={done} />
          <Btn label="CT Attack" onClick={() => doStep(2)} disabled={done} />
          <div className="w-px h-6 bg-outline-variant/20 mx-1" />
          <Btn label="Domain Expansion" variant="domain" onClick={() => doStep(3)} disabled={done || state.cooldowns.turns_since_last_DE < 4 || isDE} />
          <Btn label="Heal" variant="primary" onClick={() => doStep(4)} disabled={done || state.cooldowns.heal > 0} />
          <Btn label="Binding Vow" variant="danger" onClick={() => doStep(5)} disabled={done} />
          <div className="w-px h-6 bg-outline-variant/20 mx-1" />
          <Btn label="Reset" onClick={() => doReset()} variant="reset" />
        </div>

      </div>
    </>
  );
}
