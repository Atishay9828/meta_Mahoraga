import math

class MahoragaBossLogic:
    def __init__(self):
        self.reset()

    def reset(self):
        # Player State
        self.player_hp = 1200
        self.max_player_hp = 1200
        self.crit_stack = 0
        self.last_action = None
        self.binding_vow_active = False
        
        # Heal cooldown
        self.heal_cooldown = 0
        
        # DE State
        self.DE_active = False
        self.DE_turns_left = 0
        self.turns_since_last_DE = 4
        self.player_damage_multiplier = 1.0
        self.disable_adaptation = False
        self.disable_healing = False

        # Boss State
        self.boss_hp = 2000
        self.max_boss_hp = 2000
        self.res_physical = 0
        self.res_ce = 0
        self.res_ct = 0

        # Adaptation hits tracking
        self.hits_physical = 0
        self.hits_ce = 0
        self.hits_ct = 0
        
        # Turn tracking
        self.current_turn = 0
        self.max_turns = 30

    @property
    def total_resistance(self):
        return self.res_physical + self.res_ce + self.res_ct

    def get_state(self):
        return {
            "player_hp": self.player_hp,
            "boss_hp": self.boss_hp,
            "res_physical": self.res_physical,
            "res_ce": self.res_ce,
            "res_ct": self.res_ct,
            "total_resistance": self.total_resistance,
            "DE_active": self.DE_active,
            "DE_turns_left": self.DE_turns_left,
            "turns_since_last_DE": self.turns_since_last_DE,
            "player_damage_multiplier": self.player_damage_multiplier,
            "disable_adaptation": self.disable_adaptation,
            "disable_healing": self.disable_healing,
            "heal_cooldown": self.heal_cooldown,
            "crit_stack": self.crit_stack,
            "last_action": self.last_action if self.last_action is not None else -1
        }

    def update_resistance(self, action_type):
        if self.disable_adaptation:
            return

        if action_type == 'PHYSICAL':
            self.hits_physical += 1
            if self.hits_physical >= 2:
                self.res_physical = min(100, self.res_physical + 25)
                self.hits_physical = 0
        elif action_type == 'CE':
            self.hits_ce += 1
            if self.hits_ce >= 2:
                self.res_ce = min(100, self.res_ce + 25)
                self.hits_ce = 0
        elif action_type == 'CT':
            self.hits_ct += 1
            if self.hits_ct >= 2:
                self.res_ct = min(100, self.res_ct + 25)
                self.hits_ct = 0

    def apply_damage(self, attack_category, base_damage):
        if attack_category == 'PHYSICAL':
            res = self.res_physical
        elif attack_category == 'CE':
            res = self.res_ce
        elif attack_category == 'CT':
            res = self.res_ct
        else:
            res = 0

        # Calculate base damage with resistance reduction
        damage = base_damage * (1 - res / 100.0)

        # Apply multipliers
        mult = self.player_damage_multiplier
        if self.binding_vow_active:
            mult *= 2.0
            self.binding_vow_active = False

        if self.crit_stack >= 3:
            mult *= 1.5
            self.crit_stack = 0
            
        final_damage = damage * mult
        self.boss_hp -= final_damage
        
        return final_damage

    def handle_DE(self):
        if self.turns_since_last_DE >= 4 and not self.DE_active:
            self.player_hp = min(self.max_player_hp, self.player_hp + 250)
            self.DE_active = True
            self.DE_turns_left = 3
            self.res_physical = 0
            self.res_ce = 0
            self.res_ct = 0
            self.disable_adaptation = True
            self.disable_healing = True
            self.player_damage_multiplier = 1.5
            return True
        return False

    def step(self, action):
        """
        Executes one turn flow.
        Actions:
        0 -> PHYSICAL_ATTACK (130)
        1 -> CE_ATTACK (160)
        2 -> CT_ATTACK (230)
        3 -> DOMAIN_EXPANSION
        4 -> HEAL (250 HP, cooldown 4)
        5 -> BINDING_VOW
        """
        # Track previous stats for rewards
        prev_boss_hp = self.boss_hp
        prev_player_hp = self.player_hp
        switched_attack = False
        repeated_attack = False
        good_de_usage = False
        
        # Decrement player heal cooldown
        if self.heal_cooldown > 0:
            self.heal_cooldown -= 1

        # 1. Apply Player Action
        is_attack = action in [0, 1, 2]
        
        if is_attack:
            if action == self.last_action:
                self.crit_stack += 1
                if self.crit_stack >= 3:
                    repeated_attack = True
            else:
                if self.last_action in [0, 1, 2]:
                    switched_attack = True
                self.crit_stack = 1
                
        # Handle action specifically
        if action == 0:  # PHYSICAL
            self.apply_damage('PHYSICAL', 130)
            self.update_resistance('PHYSICAL')
        elif action == 1:  # CE
            self.apply_damage('CE', 160)
            self.update_resistance('CE')
        elif action == 2:  # CT
            self.apply_damage('CT', 230)
            self.update_resistance('CT')
        elif action == 3:  # DE
            if self.total_resistance >= 100:
                good_de_usage = True
            self.handle_DE()
        elif action == 4:  # HEAL
            if self.heal_cooldown == 0:
                self.player_hp = min(self.max_player_hp, self.player_hp + 250)
                self.heal_cooldown = 4
        elif action == 5:  # BINDING VOW
            self.player_hp -= 150
            self.binding_vow_active = True

        self.last_action = action

        # 5. Mahoraga Attacks Player
        if self.total_resistance >= 200:
            boss_damage = 250
        else:
            max_res = max(self.res_physical, self.res_ce, self.res_ct)
            boss_damage = 100 * (1 + max_res / 100.0)
        
        if self.boss_hp > 0:  # Only attacks if still alive
            self.player_hp -= boss_damage

        # 6. Apply Boss Healing
        if not self.disable_healing and self.total_resistance >= 150 and self.boss_hp > 0:
            self.boss_hp = min(self.max_boss_hp, self.boss_hp + 60)

        # 7. Update DE Timers
        if self.DE_active:
            self.DE_turns_left -= 1
            if self.DE_turns_left <= 0:
                self.DE_active = False
                self.disable_adaptation = False
                self.disable_healing = False
                self.player_damage_multiplier = 1.0
                
                # Apply post-domain boost
                self.res_physical = min(100, self.res_physical + 15)
                self.res_ce = min(100, self.res_ce + 15)
                self.res_ct = min(100, self.res_ct + 15)
                
                self.turns_since_last_DE = 0
        else:
            self.turns_since_last_DE += 1

        self.current_turn += 1

        # Calculate metrics for rewards
        damage_dealt = max(0, prev_boss_hp - self.boss_hp)
        damage_taken = max(0, prev_player_hp - self.player_hp)

        info = {
            "damage_dealt": damage_dealt,
            "damage_taken": damage_taken,
            "switched_attack": switched_attack,
            "repeated_attack": repeated_attack,
            "good_de_usage": good_de_usage,
            "turn": self.current_turn
        }

        # 8. Check termination
        win = False
        loss = False
        done = False
        
        if self.boss_hp <= 0:
            win = True
            done = True
        elif self.player_hp <= 0:
            loss = True
            done = True
        elif self.current_turn >= self.max_turns:
            if self.player_hp > self.boss_hp:
                win = True
            else:
                loss = True
            done = True

        info["win"] = win
        info["loss"] = loss

        return self.get_state(), done, info
