"""
Mahoraga Adaptation Engine — FastAPI Bridge
Wraps MahoragaBossEnv with REST endpoints for the React combat dashboard.
Includes LLM auto-play via trained Qwen 2.5 3B LoRA model.
"""
import sys
import os
import re

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

from env.mahoraga_boss_env import MahoragaBossEnv

# ── Action lookup ──
ACTION_NAMES = {
    0: "Physical Attack",
    1: "CE Attack",
    2: "CT Attack",
    3: "Domain Expansion",
    4: "Heal",
    5: "Binding Vow",
    None: "Wasted Turn",
}

app = FastAPI(title="Mahoraga Adaptation Engine API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global state ──
env: Optional[MahoragaBossEnv] = None
current_difficulty: str = "hard"

# ── LLM Model (lazy loaded) ──
llm_model = None
llm_tokenizer = None
llm_loaded = False
llm_error: Optional[str] = None


def load_llm():
    """Load Qwen 2.5 3B + LoRA for auto-play. Called once on first use."""
    global llm_model, llm_tokenizer, llm_loaded, llm_error

    if llm_loaded:
        return True
    if llm_error:
        return False

    model_path = os.path.join(os.path.dirname(__file__), "mahoraga_loral_final")

    if not os.path.exists(os.path.join(model_path, "adapter_config.json")):
        llm_error = f"LoRA weights not found at {model_path}"
        print(f"[LLM] ERROR: {llm_error}")
        return False

    try:
        print("[LLM] Loading Qwen 2.5 3B + LoRA (4-bit)... This may take 30-60s.")
        try:
            from unsloth import FastLanguageModel
            import torch

            llm_model, llm_tokenizer = FastLanguageModel.from_pretrained(
                model_name=model_path,
                max_seq_length=1024,
                dtype=None,
                load_in_4bit=True,
            )
            FastLanguageModel.for_inference(llm_model)
            print("[LLM] Model loaded via Unsloth.")
        except ImportError:
            print("[LLM] Unsloth not found, using transformers + peft...")
            import torch
            from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
            from peft import PeftModel

            base_model_name = "Qwen/Qwen2.5-3B-Instruct"
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
            )

            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                quantization_config=bnb_config,
                device_map="auto",
                trust_remote_code=True,
            )
            llm_model = PeftModel.from_pretrained(base_model, model_path)
            llm_tokenizer = AutoTokenizer.from_pretrained(model_path)
            llm_model.eval()
            print("[LLM] Model loaded via transformers + peft.")

        llm_loaded = True
        return True

    except Exception as e:
        llm_error = str(e)
        print(f"[LLM] Failed to load model: {llm_error}")
        return False


def build_prompt(state_dict):
    """Build instruction prompt from environment state."""
    return f"""You are a combat agent facing Mahoraga.

Current State:
- Your HP: {state_dict['player_hp'][0]}
- Mahoraga HP: {state_dict['boss_hp'][0]}
- Boss Resistances: Physical={state_dict['res_physical'][0]}, CE={state_dict['res_ce'][0]}, Technique={state_dict['res_ct'][0]}

Available Actions:
0 = Physical Attack
1 = CE Attack
2 = CT Attack
3 = Domain Expansion
4 = Heal
5 = Binding Vow

Choose the best action. Return ONLY a single integer (0-5)."""


def parse_action(text):
    """Extract integer action 0-5 from model output."""
    text = text.strip()
    if text in ['0', '1', '2', '3', '4', '5']:
        return int(text)
    match = re.search(r'[0-5]', text)
    if match:
        return int(match.group())
    return 0


def llm_choose_action(state_dict):
    """Use the trained LLM to pick an action given the current state."""
    import torch

    prompt = build_prompt(state_dict)
    messages = [
        {"role": "system", "content": "You are a combat AI. Respond with ONLY a single integer 0-5."},
        {"role": "user", "content": prompt}
    ]

    input_text = llm_tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = llm_tokenizer(input_text, return_tensors="pt").to(llm_model.device)

    with torch.no_grad():
        outputs = llm_model.generate(
            **inputs,
            max_new_tokens=8,
            temperature=0.7,
            do_sample=True,
            pad_token_id=llm_tokenizer.eos_token_id
        )

    response = llm_tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    action = parse_action(response)
    return action, response.strip()


# ── Response schemas ──
class DomainState(BaseModel):
    active: bool
    turns_left: int

class Cooldowns(BaseModel):
    heal: int
    turns_since_last_DE: int

class Resistances(BaseModel):
    physical: float
    ce: float
    ct: float

class CombatState(BaseModel):
    player_hp: float
    boss_hp: float
    resistances: Resistances
    domain: DomainState
    cooldowns: Cooldowns
    crit_stack: int
    log: str
    done: bool
    turn_number: int
    max_turns: int
    difficulty: str = "hard"
    llm_raw: Optional[str] = None


class StepRequest(BaseModel):
    action: int  # 0-5


class ResetRequest(BaseModel):
    difficulty: str = "hard"


# ── Endpoints ──

@app.post("/api/reset", response_model=CombatState)
def reset(req: ResetRequest = ResetRequest()):
    """Reset the environment to initial state with specified difficulty."""
    global env, current_difficulty
    current_difficulty = req.difficulty
    env = MahoragaBossEnv()
    state, _ = env.reset()

    return CombatState(
        player_hp=float(state["player_hp"][0]),
        boss_hp=float(state["boss_hp"][0]),
        resistances=Resistances(physical=0, ce=0, ct=0),
        domain=DomainState(active=False, turns_left=0),
        cooldowns=Cooldowns(heal=0, turns_since_last_DE=4),
        crit_stack=0,
        log="Combat initialized. Engage Mahoraga.",
        done=False,
        turn_number=0,
        max_turns=30,
        difficulty=current_difficulty,
    )


def _do_step(action, llm_raw=None):
    """Execute one turn of combat."""
    global env
    if env is None:
        env = MahoragaBossEnv()
        env.reset()

    state, reward, done, _, info = env.step(action)
    action_name = ACTION_NAMES.get(action, "Unknown Action")
    
    # Constructing a dynamic log message
    log_msg = f"Player used {action_name}. Dealt {info['damage_dealt']:.0f} DMG. Mahoraga dealt {info['damage_taken']:.0f} DMG."
    if info.get("win"):
        log_msg = "Mahoraga has been defeated! You win."
    elif info.get("loss"):
        log_msg = "Player has fallen. You lose."

    return CombatState(
        player_hp=float(state["player_hp"][0]),
        boss_hp=float(state["boss_hp"][0]),
        resistances=Resistances(
            physical=float(state["res_physical"][0]),
            ce=float(state["res_ce"][0]),
            ct=float(state["res_ct"][0]),
        ),
        domain=DomainState(
            active=bool(state["DE_active"]),
            turns_left=int(state["DE_turns_left"])
        ),
        cooldowns=Cooldowns(
            heal=int(state["heal_cooldown"]),
            turns_since_last_DE=int(state["turns_since_last_DE"])
        ),
        crit_stack=int(state["crit_stack"]),
        log=log_msg,
        done=done,
        turn_number=int(info["turn"]),
        max_turns=30,
        difficulty=current_difficulty,
        llm_raw=llm_raw,
    )


@app.post("/api/step", response_model=CombatState)
def step(req: StepRequest):
    """Execute one manual turn of combat."""
    return _do_step(req.action)


@app.post("/api/auto-step", response_model=CombatState)
def auto_step():
    """Execute one turn using the trained LLM to choose the action."""
    global env
    if env is None:
        env = MahoragaBossEnv()
        env.reset()

    if not llm_loaded and not load_llm():
        # Fallback to rule-based agent
        action = _smart_agent_action()
        return _do_step(action, llm_raw="[FALLBACK] rule-based")

    # The wrapper's state is returned directly
    state, _ = env.logic.get_state() if hasattr(env, 'logic') else (env._format_state(env.logic.get_state()), None)
    if isinstance(state, tuple):
        state = state[0]
        
    action, raw_output = llm_choose_action(env.logic.get_state())
    return _do_step(action, llm_raw=raw_output)


@app.get("/api/model-status")
def model_status():
    """Check if the LLM model is loaded."""
    return {
        "loaded": llm_loaded,
        "error": llm_error,
        "model_path": os.path.join(os.path.dirname(__file__), "mahoraga_loral_final"),
    }


def _smart_agent_action():
    """Rule-based fallback agent mimicking the trained LLM's strategy."""
    if env is None:
        return 0

    state = env.logic.get_state()
    player_hp = state["player_hp"]

    if player_hp < 400 and state["heal_cooldown"] == 0:
        return 4
        
    if state["turns_since_last_DE"] >= 4 and player_hp < 800:
        return 3
        
    # Attack with lowest resistance
    res = {
        0: state["res_physical"],
        1: state["res_ce"],
        2: state["res_ct"]
    }
    weakest = min(res, key=res.get)
    return weakest


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
