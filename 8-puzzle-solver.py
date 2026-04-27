import pygame
import random
from collections import deque
import sys
import time

# --- Constants ---
WIDTH, HEIGHT = 600, 700
TILE_SIZE = 150
GRID_OFFSET = (WIDTH - TILE_SIZE * 3) // 2
GOAL_STATE = "123456780"

# Colors
BG_COLOR = (30, 30, 35)
TILE_COLOR = (50, 50, 60)
TEXT_COLOR = (240, 240, 245)
HIGHLIGHT_COLOR = (70, 130, 180)
BUTTON_COLOR = (40, 40, 50)
EMPTY_COLOR = (20, 20, 25)

# --- Puzzle Logic ---

def is_solvable(state):
    """Checks inversion count to determine solvability."""
    arr = [int(c) for c in state if c != '0']
    inversions = 0
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] > arr[j]:
                inversions += 1
    return inversions % 2 == 0

def get_neighbors(state):
    """Returns valid neighbor states."""
    neighbors = []
    empty_idx = state.find('0')
    r, c = divmod(empty_idx, 3)
    
    moves = [(-1, 0), (1, 0), (0, -1), (0, 1)] # Up, Down, Left, Right
    for dr, dc in moves:
        nr, nc = r + dr, c + dc
        if 0 <= nr < 3 and 0 <= nc < 3:
            n_idx = nr * 3 + nc
            new_state = list(state)
            new_state[empty_idx], new_state[n_idx] = new_state[n_idx], new_state[empty_idx]
            neighbors.append("".join(new_state))
    return neighbors

def solve_bfs(start_state):
    """BFS solver for 8-puzzle."""
    queue = deque([start_state])
    visited = {start_state: None}
    
    print(f"Starting BFS search from: {start_state}")
    
    while queue:
        current = queue.popleft()
        print(f"Visited: {current}") # Requirement 4: Print visited states to console
        
        if current == GOAL_STATE:
            path = []
            while current:
                path.append(current)
                current = visited[current]
            path.reverse()
            return path
        
        for neighbor in get_neighbors(current):
            if neighbor not in visited:
                visited[neighbor] = current
                queue.append(neighbor)
    return None

# --- GUI Components ---

class Game:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption("8-Puzzle BFS Solver")
        self.font = pygame.font.SysFont("Arial", 40)
        self.small_font = pygame.font.SysFont("Arial", 20)
        self.clock = pygame.time.Clock()
        self.state = self.generate_solvable()
        self.is_solving = False
        self.path = []
        self.path_idx = 0

    def generate_solvable(self):
        while True:
            nums = list("012345678")
            random.shuffle(nums)
            state = "".join(nums)
            if is_solvable(state) and state != GOAL_STATE:
                return state

    def draw_tile(self, char, index):
        if char == '0':
            return
        r, c = divmod(index, 3)
        rect = pygame.Rect(GRID_OFFSET + c * TILE_SIZE + 5, 
                           GRID_OFFSET + r * TILE_SIZE + 5, 
                           TILE_SIZE - 10, TILE_SIZE - 10)
        pygame.draw.rect(self.screen, TILE_COLOR, rect, border_radius=8)
        pygame.draw.rect(self.screen, HIGHLIGHT_COLOR, rect, 2, border_radius=8)
        
        text = self.font.render(char, True, TEXT_COLOR)
        text_rect = text.get_rect(center=rect.center)
        self.screen.blit(text, text_rect)

    def draw_button(self, text, rect, active=True):
        color = BUTTON_COLOR if active else (20, 20, 25)
        pygame.draw.rect(self.screen, color, rect, border_radius=5)
        pygame.draw.rect(self.screen, (100, 100, 110), rect, 1, border_radius=5)
        label = self.small_font.render(text, True, TEXT_COLOR if active else (80, 80, 85))
        self.screen.blit(label, label.get_rect(center=rect.center))

    def run(self):
        solve_btn = pygame.Rect(100, 600, 100, 40)
        reset_btn = pygame.Rect(400, 600, 100, 40)

        while True:
            self.screen.fill(BG_COLOR)
            
            # Draw Grid
            pygame.draw.rect(self.screen, EMPTY_COLOR, (GRID_OFFSET, GRID_OFFSET, TILE_SIZE*3, TILE_SIZE*3), border_radius=10)
            for i, char in enumerate(self.state):
                self.draw_tile(char, i)

            # Draw Buttons
            self.draw_button("SOLVE", solve_btn, not self.is_solving and self.state != GOAL_STATE)
            self.draw_button("RESET", reset_btn, not self.is_solving)

            # Status text
            status = "Ready"
            if self.is_solving: status = "Solving..."
            elif self.state == GOAL_STATE: status = "Solved!"
            status_label = self.small_font.render(f"Status: {status}", True, (150, 150, 160))
            self.screen.blit(status_label, (WIDTH // 2 - status_label.get_width() // 2, 550))

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                
                if event.type == pygame.MOUSEBUTTONDOWN and not self.is_solving:
                    if solve_btn.collidepoint(event.pos) and self.state != GOAL_STATE:
                        self.is_solving = True
                        self.path = solve_bfs(self.state)
                        if self.path:
                            # Requirement: Print final step-by-step coordinates
                            print("\n--- Solution Path Coordinates ---")
                            for i, s in enumerate(self.path):
                                empty_idx = s.find('0')
                                r, c = divmod(empty_idx, 3)
                                print(f"Step {i}: Empty tile at (row: {r}, col: {c}) -> State: {s}")
                            self.path_idx = 1
                        else:
                            print("No solution found.")
                            self.is_solving = False
                    
                    if reset_btn.collidepoint(event.pos):
                        self.state = self.generate_solvable()
                        self.path = []
                        self.is_solving = False

            # Animate path
            if self.is_solving and self.path:
                if self.path_idx < len(self.path):
                    self.state = self.path[self.path_idx]
                    self.path_idx += 1
                    time.sleep(0.3) # Simple animation delay
                else:
                    self.is_solving = False

            pygame.display.flip()
            self.clock.tick(60)

if __name__ == "__main__":
    game = Game()
    game.run()
