import pygame
import random
from collections import deque
import time

# --- Constants ---
WIDTH, HEIGHT = 600, 700
GRID_SIZE = 3
TILE_SIZE = WIDTH // GRID_SIZE
FPS = 60
WHITE = (248, 250, 252)
BLACK = (15, 23, 42)
GRAY = (71, 85, 105)
ACCENT = (59, 130, 246)
BG_COLOR = (241, 245, 249)
TEXT_COLOR = (30, 41, 59)

# Target State
GOAL_STATE = "123456780"

class PuzzleState:
    """Represents a state of the 8-puzzle."""
    def __init__(self, board, parent=None, move=""):
        self.board = board  # String representation: "123456780"
        self.parent = parent
        self.move = move

    def get_neighbors(self):
        neighbors = []
        zero_idx = self.board.index('0')
        row, col = zero_idx // 3, zero_idx % 3

        # (row_offset, col_offset, move_name)
        directions = [(-1, 0, "Up"), (1, 0, "Down"), (0, -1, "Left"), (0, 1, "Right")]

        for dr, dc, move_name in directions:
            nr, nc = row + dr, col + dc
            if 0 <= nr < 3 and 0 <= nc < 3:
                new_board = list(self.board)
                target_idx = nr * 3 + nc
                new_board[zero_idx], new_board[target_idx] = new_board[target_idx], new_board[zero_idx]
                neighbors.append(PuzzleState("".join(new_board), self, move_name))
        
        return neighbors

def get_inversion_count(board_str):
    """Calculates inversion count to check solvability."""
    # Remove '0' for inversion count calculation
    arr = [int(c) for c in board_str if c != '0']
    inversions = 0
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] > arr[j]:
                inversions += 1
    return inversions

def is_solvable(board_str):
    """An 8-puzzle is solvable if the inversion count is even."""
    count = get_inversion_count(board_str)
    return count % 2 == 0

def generate_random_solvable_state():
    """Generates a random solvable state."""
    while True:
        state = list("123456780")
        random.shuffle(state)
        state_str = "".join(state)
        if is_solvable(state_str) and state_str != GOAL_STATE:
            return state_str

def solve_bfs(start_state_str):
    """Solves the 8-puzzle using Breadth-First Search."""
    start_time = time.time()
    queue = deque([PuzzleState(start_state_str)])
    visited = {start_state_str}
    
    print(f"--- BFS Search Started ---")
    
    while queue:
        current_state = queue.popleft()
        
        # Log visited state to console (as per requirement #4)
        print(f"Visiting: {current_state.board}")

        if current_state.board == GOAL_STATE:
            end_time = time.time()
            path = []
            while current_state:
                path.append(current_state.board)
                current_state = current_state.parent
            
            # Print solution details
            print(f"--- Puzzle Solved! ---")
            print(f"Time Taken: {end_time - start_time:.4f} seconds")
            print(f"Total Steps: {len(path) - 1}")
            print(f"Solution Sequence: {' -> '.join(reversed(path))}")
            
            return list(reversed(path))

        for neighbor in current_state.get_neighbors():
            if neighbor.board not in visited:
                visited.add(neighbor.board)
                queue.append(neighbor)
    
    return None

class PuzzleGUI:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption("8-Puzzle BFS Solver")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("Inter", 48, bold=True)
        self.ui_font = pygame.font.SysFont("Inter", 24)
        
        self.current_board = generate_random_solvable_state()
        self.path = []
        self.solving = False
        self.animating = False
        self.animation_step = 0
        self.last_move_time = 0
        self.delay = 500 # ms between moves in animation

    def draw_grid(self, board_str):
        for i, char in enumerate(board_str):
            if char == '0':
                continue
            
            row, col = i // 3, i % 3
            rect = pygame.Rect(col * TILE_SIZE + 5, row * TILE_SIZE + 5, TILE_SIZE - 10, TILE_SIZE - 10)
            
            # Draw Tile
            pygame.draw.rect(self.screen, ACCENT, rect, border_radius=12)
            
            # Draw Number
            text = self.font.render(char, True, WHITE)
            text_rect = text.get_rect(center=rect.center)
            self.screen.blit(text, text_rect)

    def draw_button(self):
        btn_rect = pygame.Rect(WIDTH // 4, HEIGHT - 80, WIDTH // 2, 50)
        color = GRAY if self.animating else ACCENT
        pygame.draw.rect(self.screen, color, btn_rect, border_radius=8)
        
        text_str = "Solving..." if self.animating else "Solve"
        btn_text = self.ui_font.render(text_str, True, WHITE)
        btn_text_rect = btn_text.get_rect(center=btn_rect.center)
        self.screen.blit(btn_text, btn_text_rect)
        return btn_rect

    def run(self):
        running = True
        while running:
            self.screen.fill(BG_COLOR)
            
            # Event Handling
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                
                if event.type == pygame.MOUSEBUTTONDOWN:
                    btn_rect = self.draw_button()
                    if btn_rect.collidepoint(event.pos) and not self.animating:
                        self.path = solve_bfs(self.current_board)
                        if self.path:
                            self.animating = True
                            self.animation_step = 0
                            self.last_move_time = pygame.time.get_ticks()

            # Animation Logic
            if self.animating:
                now = pygame.time.get_ticks()
                if now - self.last_move_time > self.delay:
                    self.animation_step += 1
                    if self.animation_step < len(self.path):
                        self.current_board = self.path[self.animation_step]
                        self.last_move_time = now
                    else:
                        self.animating = False

            # Drawing
            self.draw_grid(self.current_board)
            self.draw_button()
            
            # Info text
            info = self.ui_font.render(f"State: {'Goal' if self.current_board == GOAL_STATE else 'Mixed'}", True, TEXT_COLOR)
            self.screen.blit(info, (20, HEIGHT - 120))

            pygame.display.flip()
            self.clock.tick(FPS)

        pygame.quit()

if __name__ == "__main__":
    gui = PuzzleGUI()
    gui.run()
