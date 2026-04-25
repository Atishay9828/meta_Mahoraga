import numpy as np
import gymnasium as gym
from gymnasium import spaces
from env.mahoraga_boss import MahoragaBossLogic

class MahoragaBossEnv(gym.Env):
    """
    Gymnasium wrapper for Mahoraga Boss Fight.
    """
    metadata = {"render_modes": ["human"]}

    def __init__(self, render_mode=None):
        super().__init__()
        self.render_mode = render_mode
        self.logic = MahoragaBossLogic()
        
        # Actions: 0 to 5
        self.action_space = spaces.Discrete(6)
        
        # Observation space matching the state dict
        self.observation_space = spaces.Dict({
            "player_hp": spaces.Box(low=-np.inf, high=1200, shape=(1,), dtype=np.float32),
            "boss_hp": spaces.Box(low=-np.inf, high=2000, shape=(1,), dtype=np.float32),
            "res_physical": spaces.Box(low=0, high=100, shape=(1,), dtype=np.float32),
            "res_ce": spaces.Box(low=0, high=100, shape=(1,), dtype=np.float32),
            "res_ct": spaces.Box(low=0, high=100, shape=(1,), dtype=np.float32),
            "total_resistance": spaces.Box(low=0, high=300, shape=(1,), dtype=np.float32),
            "DE_active": spaces.Discrete(2),
            "DE_turns_left": spaces.Discrete(4),
            "turns_since_last_DE": spaces.Discrete(50),
            "player_damage_multiplier": spaces.Box(low=0.0, high=10.0, shape=(1,), dtype=np.float32),
            "disable_adaptation": spaces.Discrete(2),
            "disable_healing": spaces.Discrete(2),
            "heal_cooldown": spaces.Discrete(5),
            "crit_stack": spaces.Discrete(10),
            "last_action": spaces.Discrete(7) # 0-5 + 6 for None (mapped to -1 normally, but Discrete needs >=0)
        })

    def _format_state(self, state_dict):
        # Convert state_dict values to the types expected by spaces
        return {
            "player_hp": np.array([state_dict["player_hp"]], dtype=np.float32),
            "boss_hp": np.array([state_dict["boss_hp"]], dtype=np.float32),
            "res_physical": np.array([state_dict["res_physical"]], dtype=np.float32),
            "res_ce": np.array([state_dict["res_ce"]], dtype=np.float32),
            "res_ct": np.array([state_dict["res_ct"]], dtype=np.float32),
            "total_resistance": np.array([state_dict["total_resistance"]], dtype=np.float32),
            "DE_active": int(state_dict["DE_active"]),
            "DE_turns_left": int(state_dict["DE_turns_left"]),
            "turns_since_last_DE": min(49, int(state_dict["turns_since_last_DE"])),
            "player_damage_multiplier": np.array([state_dict["player_damage_multiplier"]], dtype=np.float32),
            "disable_adaptation": int(state_dict["disable_adaptation"]),
            "disable_healing": int(state_dict["disable_healing"]),
            "heal_cooldown": int(state_dict["heal_cooldown"]),
            "crit_stack": min(9, int(state_dict["crit_stack"])),
            # Gym discrete needs positive integers, map -1 to 6
            "last_action": 6 if state_dict["last_action"] == -1 else int(state_dict["last_action"])
        }

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.logic.reset()
        state = self.logic.get_state()
        return self._format_state(state), {}

    def step(self, action):
        state_dict, done, info = self.logic.step(action)
        
        # Calculate Reward
        reward = 0.0
        
        # Core
        reward += info["damage_dealt"] / 80.0
        reward -= info["damage_taken"] / 100.0
        
        # Tactical
        if info["switched_attack"]:
            reward += 0.5
        if info["repeated_attack"]:
            reward -= 0.8
        if info["good_de_usage"]:
            reward += 2.0
            
        # Terminal
        if info["win"]:
            reward += 12.0
        if info["loss"]:
            reward -= 10.0

        # Include reward in info for debugging
        info["step_reward"] = reward

        return self._format_state(state_dict), reward, done, False, info

    def render(self):
        if self.render_mode == "human":
            state = self.logic.get_state()
            print(f"Turn: {self.logic.current_turn}")
            print(f"Player HP: {state['player_hp']:.1f} | Boss HP: {state['boss_hp']:.1f}")
            print(f"Resistances - P: {state['res_physical']} | CE: {state['res_ce']} | CT: {state['res_ct']}")
            print(f"Total Res: {state['total_resistance']}")
            print(f"DE Active: {state['DE_active']} (Turns left: {state['DE_turns_left']})")
            print("-" * 40)
