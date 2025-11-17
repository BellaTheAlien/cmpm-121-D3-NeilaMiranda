# D3: Map Game(temp name)

# Game Design Vision

finding clues at diffrent map blocks

# Technologies

- TypeScript for most of the game code
- all CSS in common 'style,css' file
- Deno and Vite for building
- GItHub Actions + Git Pages for deployment

# Assignments

## D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?
Key gameplay challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

### Steps - D3.a

- [x] create the PLAN.md
- [x] move given code from main.ts to reference
- [x] delete everything from main.ts
- [x] place the player onto the map
- [x] draw rectangles for the cells on the map
- [x] allow the player to collect tokens
- [x] add a clue/tool for players to find - ranks to the tokens
- [x] create an invatory UI for the player's items
- [x] the player can carry items to diffrent cells

### Steps - D3.b

- [x] create player movement
- [x] player radius UI
- [x] can drop current token
- [x] vitory by creating the 3rd rank token

### Steps - D3.c

- [x] add some Flyweight pattern, creating maps for the cells
- [x] refacture the cells/token gemeration
- [x] add the Memento pattern to restore tokens that where taken off screen
- [x] add back the win condition
- [x] when the game loads add the gems

### Steps - D3.d

- [] fix the cells and token click - the emoji and cells aren't lined up
- [x] add real time tracker from the users phone/location
- [x] add a way to track the users progress, where the user progress is saved even when they close the page
