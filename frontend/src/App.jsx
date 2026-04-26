import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./index.css";

const API = "";

/* ── Attack category theme ── */
const CAT_THEME = {
  PHYSICAL: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25", hex: "#f97316", label: "Physical" },
  CE: { text: "text-purple-bright", bg: "bg-purple/10", border: "border-purple/25", hex: "#a855f7", label: "CE" },
  TECHNIQUE: { text: "text-cyan", bg: "bg-cyan/10", border: "border-cyan/25", hex: "#22d3ee", label: "Technique" },
};
const catTheme = (type) => CAT_THEME[type] || CAT_THEME.PHYSICAL;


/* ═══════════════════════════════════════════════════════
   SUBCOMPONENTS
   ═══════════════════════════════════════════════════════ */

function HpBar({ current, max, color, label, sublabel }) {
  const pct = Math.max(0, (current / max) * 100);
  const isLow = pct < 30;
  const grad =
    color === "red"
      ? "linear-gradient(90deg, #991b1b, #dc2626, #f87171)"
      : color === "purple"
      ? "linear-gradient(90deg, #581c87, #7c3aed, #a855f7)"
      : "linear-gradient(90deg, #065f46, #059669, #4ade80)";
  const glow =
    color === "red"
      ? "rgba(248,113,113,0.3)"
      : color === "purple"
      ? "rgba(168,85,247,0.3)"
      : "rgba(74,222,128,0.3)";

  return (
    <div>
      <div className="flex justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted">{label}</span>
          {sublabel && <span className="text-[9px] text-muted/50 font-mono">{sublabel}</span>}
        </div>
        <span className="font-mono text-[11px] font-bold text-text">
          {current}
          <span className="text-muted/60">/{max}</span>
          <span className={`ml-1.5 text-[10px] ${isLow ? "text-red" : "text-muted/50"}`}>
            {pct.toFixed(0)}%
          </span>
        </span>
      </div>
      <div className="w-full h-2.5 bg-surface-high/80 rounded-full overflow-hidden ghost-border">
        <motion.div
          className="h-full rounded-full"
          style={{ background: grad, boxShadow: `0 0 10px ${glow}` }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 14 }}
        />
      </div>
    </div>
  );
}

function ResBar({ label, value, color, flashing }) {
  const pct = Math.min(100, (value / 80) * 100);
  const isHigh = value >= 50;
  const tagColor = value >= 60 ? "text-red" : value > 0 ? "text-amber" : "text-muted/30";
  const barColor = isHigh ? "bg-red/80" : value > 0 ? `bg-${color}` : "bg-muted/20";

  return (
    <motion.div
      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface/50 ghost-border"
      animate={flashing ? { backgroundColor: ["rgba(168,85,247,0)", "rgba(168,85,247,0.15)", "rgba(168,85,247,0)"] } : {}}
      transition={{ duration: 0.5 }}
    >
      <span className={`text-[10px] font-bold tracking-wider uppercase w-16 shrink-0 ${catTheme(label).text}`}>
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-surface-high/80 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 12 }}
        />
      </div>
      <span className={`text-[10px] font-bold w-10 text-right font-mono ${tagColor}`}>
        {value > 0 ? `${value}%` : "—"}
      </span>
    </motion.div>
  );
}

function ActionBtn({ label, icon, onClick, variant = "default", disabled, active }) {
  const styles = {
    default: "border-outline-variant/40 text-muted hover:text-text hover:border-purple/40 hover:bg-purple-dim",
    attack: "border-purple/25 text-purple-bright hover:bg-purple/15 hover:border-purple/50",
    domain: "border-violet/30 text-violet hover:bg-violet-dim hover:border-violet/50",
    heal: "border-green/25 text-green hover:bg-green-dim hover:border-green/40",
    danger: "border-red/25 text-red hover:bg-red-dim hover:border-red/40",
  };
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg border font-bold text-[10px] tracking-[0.05em] uppercase transition-all cursor-pointer
        disabled:opacity-20 disabled:cursor-not-allowed bg-surface/60
        ${active ? "ring-1 ring-purple/40 bg-purple/10" : ""}
        ${styles[variant]}`}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </motion.button>
  );
}

function StatChip({ label, value, color = "text-text" }) {
  return (
    <div className="bg-surface/50 rounded-lg px-3 py-2 ghost-border text-center min-w-[72px]">
      <div className="text-[8px] font-bold tracking-wider uppercase text-muted/60 mb-0.5">{label}</div>
      <div className={`font-mono text-xs font-bold ${color}`}>{value}</div>
    </div>
  );
}

function DomainOverlay({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-purple/30"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 0.3, 0.6, 0] }}
            transition={{ duration: 1.0 }} />
          <motion.div className="absolute inset-0"
            style={{ background: "radial-gradient(circle,rgba(168,85,247,0.5) 0%,transparent 70%)" }}
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5 }} />
          <motion.div className="relative z-10 text-center"
            initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }} transition={{ type: "spring", stiffness: 150, damping: 10 }}
          >
            <div className="text-5xl md:text-7xl font-black tracking-[-0.03em] text-white text-glow-purple">
              DOMAIN EXPANSION
            </div>
            <motion.div className="text-sm font-mono text-purple-bright mt-3 tracking-[0.2em] uppercase"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              — resistances nullified —
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════ */
export default function App() {
  const [state, setState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shakeClass, setShakeClass] = useState("");
  const [flashRes, setFlashRes] = useState(null);
  const [showDomain, setShowDomain] = useState(false);
  const [wheelRot, setWheelRot] = useState(0);
  const [adaptFlash, setAdaptFlash] = useState(false);
  const [lastLog, setLastLog] = useState(null);
  const [difficulty, setDifficulty] = useState("hard");
  const [autoPlay, setAutoPlay] = useState(false);
  const [, setModelStatus] = useState(null);
  const logRef = useRef(null);
  const prevRes = useRef({ Physical: 0, CE: 0, Technique: 0 });
  const autoRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const triggerShake = useCallback((heavy) => {
    setShakeClass(heavy ? "shake-heavy" : "shake-sm");
    setTimeout(() => setShakeClass(""), heavy ? 500 : 350);
  }, []);

  const MOCK_STATE = {
    player_hp: 1400, player_hp_max: 1500,
    boss_hp: 1200, boss_hp_max: 2000,
    enemy_hp: 1200, enemy_hp_max: 2000,
    mahoraga_hp: 1400, mahoraga_hp_max: 1500,
    resistances: { Physical: 25, CE: 0, Technique: 50 },
    adaptation_stack: 2, heal_cooldown: 0,
    turn_number: 5, max_turns: 30,
    done: false, done_reason: null, turn_log: null,
    difficulty: "hard",
  };

  async function doReset(diff) {
    const d2use = diff || difficulty;
    setLoading(true);
    setAutoPlay(false);
    try {
      const r = await fetch(`${API}/api/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: d2use }),
      });
      const d = await r.json();
      setState(d);
    } catch {
      setState({ ...MOCK_STATE, difficulty: d2use });
    }
    setLogs([]); setLastLog(null);
    setWheelRot(0); prevRes.current = { Physical: 0, CE: 0, Technique: 0 };
    setLoading(false);
  }

  function processStepResult(d) {
    const log = d.turn_log;
    if (log) {
      setLastLog(log);
      if (log.damage_taken > 150) triggerShake(true);
      else if (log.damage_taken > 60) triggerShake(false);

      if (log.correct_adaptation) {
        setAdaptFlash(true);
        setWheelRot((p) => p + 45);
        setTimeout(() => setAdaptFlash(false), 1200);
      } else {
        setWheelRot((p) => p + 8);
      }

      if (log.mahoraga_action === "DOMAIN EXPANSION") {
        setShowDomain(true);
        triggerShake(true);
        setTimeout(() => setShowDomain(false), 2000);
      }

      setLogs((prev) => [...prev, log]);
    }
    if (d.resistances) {
      const p = prevRes.current;
      for (const k of ["Physical", "CE", "Technique"]) {
        if (d.resistances[k] > p[k]) {
          setFlashRes(k);
          setTimeout(() => setFlashRes(null), 500);
          break;
        }
      }
      prevRes.current = { ...d.resistances };
    }
    setState(d);
    setLoading(false);
  }

  async function doStep(action) {
    if (!state || state.done || loading) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      processStepResult(await r.json());
    } catch { setLoading(false); }
  }

  useEffect(() => {
    if (autoPlay && state && !state.done && !loading) {
      autoRef.current = setTimeout(async () => {
        try {
          const r = await fetch(`${API}/api/auto-step`, { method: "POST" });
          processStepResult(await r.json());
        } catch { setAutoPlay(false); }
      }, 1200);
    }
    return () => clearTimeout(autoRef.current);
  }, [autoPlay, state, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.done) setAutoPlay(false);
  }, [state?.done]);

  useEffect(() => {
    doReset(); // eslint-disable-line react-hooks/set-state-in-effect
    fetch(`${API}/api/model-status`).then(r => r.json()).then(setModelStatus).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state)
    return (
      <div className="h-screen flex items-center justify-center bg-bg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-10 h-10 border-2 border-purple border-t-transparent rounded-full"
        />
      </div>
    );

  const done = state.done;
  const playerHp = state.player_hp ?? state.mahoraga_hp;
  const playerMax = state.player_hp_max ?? state.mahoraga_hp_max;
  const bossHp = state.boss_hp ?? state.enemy_hp;
  const bossMax = state.boss_hp_max ?? state.enemy_hp_max;

  return (
    <>
      <DomainOverlay show={showDomain} />

      <div className={`h-screen flex flex-col bg-bg grid-bg vignette relative overflow-hidden ${shakeClass}`}>

        {/* ═══ HEADER ═══ */}
        <header className="glass-panel-accent mx-3 mt-2 px-5 py-2.5 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-base font-black tracking-tight uppercase text-purple-bright text-glow-purple">
              MAHORAGA
            </span>
            <span className="text-[10px] text-muted/60 tracking-wide hidden sm:inline font-mono">
              Adaptive Boss Fight
            </span>
          </div>
          <div className="flex items-center gap-3">
            {autoPlay && (
              <span className="text-[9px] font-bold tracking-widest uppercase text-amber animate-pulse">
                LLM AUTO
              </span>
            )}
            <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${
              difficulty === "easy" ? "bg-green/10 text-green border border-green/20"
              : difficulty === "medium" ? "bg-amber/10 text-amber border border-amber/20"
              : "bg-red/10 text-red border border-red/20"
            }`}>
              {difficulty}
            </span>
            <span className="font-mono text-[11px] text-muted/60">
              Turn <span className="text-text font-bold">{state.turn_number}</span>
              <span className="text-muted/40">/{state.max_turns}</span>
            </span>
            <span className={`text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md ${
              done
                ? "bg-red-dim text-red border border-red/20"
                : "bg-purple-dim text-purple-bright border border-purple/20"
            }`}>
              {done ? (state.done_reason || "ENDED") : "LIVE"}
            </span>
          </div>
        </header>

        {/* ═══ MAIN GRID ═══ */}
        <div className="flex-1 grid grid-cols-12 gap-2.5 px-3 py-2 min-h-0 overflow-hidden">

          {/* ── LEFT: HP + Resistances ── */}
          <div className="col-span-5 flex flex-col gap-2.5 min-h-0">

            {/* Player Status */}
            <div className="glass-panel p-4 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-green/80">
                  SORCERER
                </span>
                <span className="text-[9px] text-muted/40 font-mono ml-auto">Player</span>
              </div>
              <HpBar current={playerHp} max={playerMax} color="green" label="HP" />
              <div className="flex gap-2 mt-3">
                <StatChip
                  label="Heal"
                  value={state.heal_cooldown === 0 ? "READY" : `${state.heal_cooldown}T`}
                  color={state.heal_cooldown === 0 ? "text-green" : "text-red"}
                />
                <StatChip
                  label="Domain"
                  value={state.adaptation_stack >= 1 ? "USED" : "READY"}
                  color={state.adaptation_stack >= 1 ? "text-muted/40" : "text-purple-bright"}
                />
                <StatChip
                  label="Status"
                  value={playerHp < 400 ? "CRIT" : playerHp < 800 ? "HURT" : "OK"}
                  color={playerHp < 400 ? "text-red" : playerHp < 800 ? "text-amber" : "text-green"}
                />
              </div>
            </div>

            {/* Boss Status */}
            <div className="glass-panel-accent p-4 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-red/80">
                  MAHORAGA
                </span>
                <span className="text-[9px] text-muted/40 font-mono ml-auto">Adaptive Boss</span>
              </div>
              <HpBar current={bossHp} max={bossMax} color="red" label="HP" />
              <div className="flex gap-2 mt-3">
                <StatChip
                  label="Wheel"
                  value={
                    <motion.span key={state.adaptation_stack} initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
                      {state.adaptation_stack}
                    </motion.span>
                  }
                  color="text-purple-bright"
                />
                <StatChip
                  label="Threat"
                  value={state.adaptation_stack >= 4 ? "MAX" : state.adaptation_stack >= 2 ? "HIGH" : "LOW"}
                  color={state.adaptation_stack >= 4 ? "text-red" : state.adaptation_stack >= 2 ? "text-amber" : "text-green"}
                />
                <StatChip
                  label="Cleave"
                  value={state.adaptation_stack >= 4 ? "ACTIVE" : "LOCKED"}
                  color={state.adaptation_stack >= 4 ? "text-red" : "text-muted/40"}
                />
              </div>
            </div>

            {/* Boss Resistances */}
            <div className="glass-panel p-4 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold tracking-wider uppercase text-muted/80">
                  BOSS RESISTANCES
                </span>
                <span className="text-[9px] text-muted/40 font-mono ml-auto">Adaptation</span>
              </div>
              <div className="space-y-2">
                <ResBar label="PHYSICAL" value={state.resistances.Physical} color="orange-400" flashing={flashRes === "Physical"} />
                <ResBar label="CE" value={state.resistances.CE} color="purple" flashing={flashRes === "CE"} />
                <ResBar label="TECHNIQUE" value={state.resistances.Technique} color="cyan" flashing={flashRes === "Technique"} />
              </div>
              <div className="mt-3 p-2 bg-surface/40 rounded-lg text-center">
                <span className="text-[9px] text-muted/50 font-mono">
                  {state.resistances.Physical + state.resistances.CE + state.resistances.Technique > 100
                    ? "⚠ HIGH TOTAL RESISTANCE — Consider Domain Expansion"
                    : state.resistances.Physical + state.resistances.CE + state.resistances.Technique > 0
                    ? "Boss is adapting. Vary your attacks!"
                    : "No resistances yet. Strike freely."}
                </span>
              </div>
            </div>
          </div>

          {/* ── CENTER: Wheel + Last Action ── */}
          <div className="col-span-3 flex flex-col gap-2.5 min-h-0">

            {/* Mahoraga Wheel */}
            <div className="glass-panel-accent p-4 flex-1 flex flex-col items-center justify-center min-h-0 relative overflow-hidden">
              <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted/40 mb-2">
                WHEEL OF ADAPTATION
              </div>
              <div className="relative flex-1 flex items-center justify-center w-full min-h-0">
                <AnimatePresence>
                  {adaptFlash && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                      <div className="w-[75%] aspect-square rounded-full border-2 border-purple/60 adapt-ring"
                        style={{ boxShadow: "0 0 35px rgba(168,85,247,0.35)" }} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.img
                  src="/mahoraga_wheel.svg"
                  alt="Mahoraga Wheel"
                  className="w-full max-w-[200px] aspect-square object-contain wheel-idle"
                  animate={{ rotate: wheelRot }}
                  transition={{ type: "spring", stiffness: 25, damping: 14, mass: 2.5 }}
                  draggable={false}
                />
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="font-mono text-[10px] text-muted/60">
                  Turns <span className="text-purple-bright font-bold">{state.adaptation_stack}</span>
                </div>
                <div className="w-px h-3 bg-outline-variant/20" />
                <div className="font-mono text-[10px] text-muted/60">
                  Rot <span className="text-purple-bright font-bold">{(wheelRot / 45).toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Last Action Summary */}
            <AnimatePresence mode="wait">
              {lastLog ? (
                <motion.div
                  key={`log-${state.turn_number}`}
                  className={`glass-panel p-4 shrink-0 border-l-2 ${
                    lastLog.correct_adaptation ? "border-l-purple" : "border-l-outline-variant/30"
                  }`}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold tracking-wider uppercase text-muted/60">
                      LAST TURN
                    </span>
                    {lastLog.correct_adaptation && (
                      <span className="text-[8px] font-bold tracking-wider uppercase text-purple-bright px-1.5 py-0.5 bg-purple/10 rounded">
                        ADAPTED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-text mb-1">
                    {lastLog.mahoraga_action}
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span className="text-green">+{lastLog.damage_dealt} dealt</span>
                    <span className="text-red">-{lastLog.damage_taken} taken</span>
                    <span className={`ml-auto font-bold ${lastLog.reward > 0 ? "text-green" : "text-red/60"}`}>
                      {lastLog.reward > 0 ? "+" : ""}{lastLog.reward}r
                    </span>
                  </div>
                  {lastLog.enemy_attack_type && lastLog.enemy_attack_type !== "NONE" && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[8px] text-muted/50 uppercase">Boss used:</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${catTheme(lastLog.enemy_attack_type).bg} ${catTheme(lastLog.enemy_attack_type).text} border ${catTheme(lastLog.enemy_attack_type).border}`}>
                        {lastLog.enemy_attack_type}
                      </span>
                      <span className="text-[9px] text-muted/40 font-mono">{lastLog.enemy_subtype}</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  className="glass-panel p-4 border-l-2 border-l-outline-variant/20 shrink-0"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                  <div className="text-[10px] text-muted/30 uppercase tracking-wider font-bold text-center py-2">
                    Awaiting combat...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT: Combat Log ── */}
          <div className="col-span-4 flex flex-col gap-2.5 min-h-0">
            <div className="glass-panel p-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-[11px] font-bold tracking-wider uppercase text-muted/80">
                  COMBAT LOG
                </span>
                <span className="font-mono text-[9px] text-muted/30">{logs.length} events</span>
              </div>
              <div ref={logRef} className="flex-1 overflow-y-auto bg-bg/50 rounded-lg p-2.5 ghost-border min-h-0">
                {logs.length === 0 ? (
                  <div className="font-mono text-[10px] text-muted/25 text-center py-10">
                    Choose an action to begin...
                  </div>
                ) : (
                  logs.map((l, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2.5 items-start py-2 border-b border-outline-variant/10 last:border-0"
                    >
                      <span className="font-mono text-[9px] text-muted/40 shrink-0 mt-0.5 w-5 text-right">
                        {l.turn}
                      </span>
                      <div className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: l.enemy_attack_type !== "NONE" ? catTheme(l.enemy_attack_type).hex : "#3d3560" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {l.correct_adaptation && (
                            <span className="text-[8px] font-bold text-purple-bright bg-purple/15 px-1 rounded">
                              WHEEL
                            </span>
                          )}
                          <span className={`text-[9px] font-bold tracking-wider uppercase ${l.correct_adaptation ? "text-purple-bright" : "text-muted/50"}`}>
                            {l.mahoraga_action}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] text-muted/50 mt-0.5">
                          {l.enemy_attack_type !== "NONE" && (
                            <><span className={catTheme(l.enemy_attack_type).text}>{l.enemy_subtype}</span><span className="text-muted/20"> → </span></>
                          )}
                          <span className="text-green/70">{l.damage_dealt}d</span>
                          <span className="text-muted/20"> · </span>
                          <span className="text-red/60">{l.damage_taken}t</span>
                        </div>
                      </div>
                      <span className={`font-mono text-[9px] font-bold shrink-0 ${l.reward > 0 ? "text-green/70" : "text-red/40"}`}>
                        {l.reward > 0 ? "+" : ""}{l.reward}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ BOTTOM ACTION BAR ═══ */}
        <div className="glass-panel-accent mx-3 mb-2 px-5 py-3 flex items-center gap-2 flex-wrap z-10 shrink-0">
          {/* Difficulty selector */}
          {["easy", "medium", "hard"].map((d) => (
            <motion.button
              key={d}
              whileTap={{ scale: 0.9 }}
              onClick={() => { setDifficulty(d); doReset(d); }}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase border cursor-pointer transition-all ${
                difficulty === d
                  ? d === "easy" ? "bg-green/15 text-green border-green/40"
                    : d === "medium" ? "bg-amber/15 text-amber border-amber/40"
                    : "bg-red/15 text-red border-red/40"
                  : "bg-surface/30 text-muted/40 border-outline-variant/15 hover:text-muted/70"
              }`}
            >
              {d === "medium" ? "MED" : d}
            </motion.button>
          ))}

          <div className="w-px h-6 bg-purple/15 mx-1" />

          {/* Attack Actions */}
          <ActionBtn icon="⚔️" label="Physical" onClick={() => doStep(0)} variant="attack" disabled={done || autoPlay} />
          <ActionBtn icon="💥" label="CE Blast" onClick={() => doStep(1)} variant="attack" disabled={done || autoPlay} />
          <ActionBtn icon="🌀" label="Technique" onClick={() => doStep(2)} variant="attack" disabled={done || autoPlay} />

          <div className="w-px h-6 bg-purple/15 mx-1" />

          {/* Special Actions */}
          <ActionBtn icon="🔮" label="Domain" onClick={() => doStep(3)} variant="domain" disabled={done || autoPlay} />
          <ActionBtn icon="💚" label="Heal" onClick={() => doStep(4)} variant="heal" disabled={done || autoPlay} />

          <div className="w-px h-6 bg-purple/15 mx-1" />

          {/* Auto-play + Reset */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setAutoPlay(!autoPlay)}
            disabled={done}
            className={`px-3.5 py-2 rounded-lg text-[10px] font-bold tracking-wider uppercase border cursor-pointer transition-all disabled:opacity-20 disabled:cursor-not-allowed ${
              autoPlay
                ? "bg-amber/15 text-amber border-amber/30 animate-pulse"
                : "bg-surface/50 text-muted/60 border-outline-variant/25 hover:text-purple-bright hover:border-purple/30"
            }`}
          >
            {autoPlay ? "⏸ Stop" : "▶ LLM Auto"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => doReset()}
            className="px-3 py-2 rounded-lg text-[10px] font-bold tracking-wider uppercase border cursor-pointer transition-all
              bg-surface/30 text-muted/40 border-outline-variant/15 hover:text-muted/70 hover:border-outline-variant/30"
          >
            Reset
          </motion.button>

          {/* Reward indicator */}
          {lastLog && (
            <motion.span
              key={state.turn_number}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-mono text-[11px] font-bold ml-auto ${lastLog.reward > 0 ? "text-green" : "text-red"}`}
            >
              {lastLog.reward > 0 ? "+" : ""}{lastLog.reward}
            </motion.span>
          )}
        </div>

        {/* ═══ DONE OVERLAY ═══ */}
        <AnimatePresence>
          {done && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 backdrop-blur-md"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                className="glass-panel-accent p-10 text-center max-w-md"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <div className={`text-4xl font-black tracking-tight uppercase mb-3 ${
                  bossHp <= 0 ? "text-green text-glow-purple" : "text-red"
                }`}>
                  {bossHp <= 0 ? "VICTORY" : "DEFEATED"}
                </div>
                <div className="text-sm text-muted mb-2">{state.done_reason}</div>
                <div className="font-mono text-[11px] text-muted/50 mb-6">
                  Player: {playerHp} HP · Boss: {bossHp} HP · Turn {state.turn_number}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => doReset()}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider cursor-pointer transition-all
                    bg-purple/20 text-purple-bright border border-purple/30 hover:bg-purple/30"
                >
                  Fight Again
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
