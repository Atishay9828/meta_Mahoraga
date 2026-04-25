import sys
import os
import random

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from env.mahoraga_boss_env import MahoragaBossEnv

def run_simulation():
    env = MahoragaBossEnv(render_mode="human")
    state, _ = env.reset()
    
    print("=== MAHORAGA BOSS FIGHT SIMULATION ===")
    env.render()
    
    # We will simulate a sequence of actions to show the mechanics
    # 0: PHYSICAL, 1: CE, 2: CT, 3: DE, 4: HEAL, 5: BINDING_VOW
    
    actions = [
        0, # PHYSICAL
        0, # PHYSICAL -> should increase phys res
        5, # BINDING VOW -> lose HP, 2x next damage
        0, # PHYSICAL -> with binding vow + crit stack 3 (1.5x)
        1, # CE
        1, # CE -> increase ce res
        2, # CT
        2, # CT -> increase ct res
        3, # DE -> heal, lock res, increase player mult
        0, # PHYSICAL during DE
        1, # CE during DE
        2, # CT during DE
    ]
    
    action_names = [
        "PHYSICAL_ATTACK", "CE_ATTACK", "CT_ATTACK",
        "DOMAIN_EXPANSION", "HEAL", "BINDING_VOW"
    ]
    
    for action in actions:
        print(f"\n--- Player Action: {action_names[action]} ---")
        state, reward, done, _, info = env.step(action)
        env.render()
        print(f"Reward: {reward:.2f}")
        print(f"Info: {info}")
        if done:
            print("\n*** SIMULATION ENDED (DONE) ***")
            break

if __name__ == "__main__":
    run_simulation()
