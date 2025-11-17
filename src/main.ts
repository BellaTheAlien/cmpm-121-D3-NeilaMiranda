// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

import "leaflet/dist/leaflet.css";
import "./style.css";

import "./_leafletWorkaround.ts";

import luck from "./_luck.ts";

/*
 **  -- UI ELEMENTS --
 */

const inventoryPanelDiv = document.createElement("div");
inventoryPanelDiv.id = "inventoryPanel";
document.body.append(inventoryPanelDiv);

const navigationPanelDiv = document.createElement("div");
navigationPanelDiv.id = "navigationPanel";
navigationPanelDiv.textContent = "Navigation:";
document.body.append(navigationPanelDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

const winPanelDiv = document.createElement("div");
winPanelDiv.id = "winPanel";
document.body.append(winPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "mapDiv";
document.body.append(mapDiv);

// location
const LOUVRE_LATLNG = leaflet.latLng(
  48.86090399522021,
  2.3376225397014716,
);

/*
 **  -- SET GAME VALUES --
 */
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
const COLLECT_RADIUS = 60;

// creating the map parameters
const map = leaflet.map(mapDiv, {
  center: LOUVRE_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// adding the open street map tile on to the map page
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

/*
 **  -- PLAYER --
 */
const player = leaflet.marker(LOUVRE_LATLNG);
player.addTo(map);

// the radius UI - shows up in pink
const playerRadius = leaflet.circle(player.getLatLng(), {
  radius: COLLECT_RADIUS,
  color: "rgba(204, 17, 173, 1)",
  fillColor: "rgb(231, 135, 215)",
});
playerRadius.addTo(map);

/*
 **  -- RANKS and TOKENS --
 */

// creating the tokens and rank - from t4ylo
type Rank = 1 | 2 | 3;
let hand: Rank | null = null;

/*
 **  -- INVENTORY --
 */
const inventory = document.createElement("div");
inventory.id = "panel";
inventory.innerHTML = ` <h3>Inventory</h3>
<div class = "row"><span>Holding </span><span id = "hand" class = "badge">Empty</span></div>
`;
inventoryPanelDiv.append(inventory);

function inventoryUpdate() {
  (inventory.querySelector("#hand") as HTMLElement).textContent = hand
    ? `Rank ${hand}`
    : "Empty";
  statusPanelDiv.textContent = hand
    ? `Holding Rank ${hand}. Click another gem of Rank ${hand} withen ${COLLECT_RADIUS}m to merge.`
    : `Click a gem within ${COLLECT_RADIUS}m to pick up`;
}

/*
 **  -- GEMMS LOGIC --
  taken Insperation from t4ylo on git nad thier take of D3.a - the tokens emojies
 */

// sets the gems ranks
function currentRank(i: number, j: number): Rank {
  const rank = luck([i, j, "tier"].toString());
  if (rank < 0.75) return 1;
  if (rank < 0.95) return 2;
  return 3;
}

function tokenGem(tier: Rank) {
  const gemEmoji = tier === 1 ? "💎" : tier === 2 ? "💍" : "👑";
  return leaflet.divIcon({
    className: "gemText",
    html:
      `<div style="font-size: 24px; transform: translate(-50%, -50%);">${gemEmoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [-12, -12],
  });
}

/*
 **  -- MAP FOR THE TOKENS --
 */
// insperation from BeReyes1's D3 with making the cells maps

const tokenCells = new Map<string, L.Marker>();
const tokenStates = new Map<
  string,
  { hasGem: boolean; tier?: Rank | undefined }
>();

function getTokenKey(i: number, j: number): string {
  return `${i},${j}`;
}

/*
 **  -- GENERATE IN GEMMS --
 */

function generateTokens(i: number, j: number) {
  const key = getTokenKey(i, j);

  if (!tokenStates.has(key)) {
    // check if the cell can have a token
    const checkSpawn = luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY;
    tokenStates.set(key, {
      hasGem: checkSpawn,
      tier: checkSpawn ? currentRank(i, j) : undefined,
    });
  }

  return tokenStates.get(key)!;
}

function renderGems() {
  // remove any old gems
  Array.from(tokenCells.values()).forEach((marker) => marker.remove());
  tokenCells.clear();

  // did get help from Brace to understand the gems to spawn with the player
  const playerLatLng = player.getLatLng();
  const playerLat = Math.round(
    (playerLatLng.lat - LOUVRE_LATLNG.lat) / TILE_DEGREES - 0.5,
  );
  const playerLng = Math.round(
    (playerLatLng.lng - LOUVRE_LATLNG.lng) / TILE_DEGREES - 0.5,
  );

  for (
    let i = playerLat - NEIGHBORHOOD_SIZE;
    i < playerLat + NEIGHBORHOOD_SIZE;
    i++
  ) {
    for (
      let j = playerLng - NEIGHBORHOOD_SIZE;
      j < playerLng + NEIGHBORHOOD_SIZE;
      j++
    ) {
      const state = generateTokens(i, j);

      if (state.hasGem && state.tier) {
        spawnGems(i, j, state.tier);
      }
    }
  }
}

// When the user clicks around the map

map.on("click", (event: leaflet.LeafletMouseEvent) => {
  const clickLatLng = event.latlng;
  const distance = player.getLatLng().distanceTo(clickLatLng);

  if (distance > COLLECT_RADIUS) {
    alert(
      `Too far (${distance.toFixed(0)}m). Need around ${COLLECT_RADIUS}m.`,
    );
    return;
  }

  const x = Math.round(
    (clickLatLng.lat - LOUVRE_LATLNG.lat) / TILE_DEGREES - 0.5,
  );
  const y = Math.round(
    (clickLatLng.lng - LOUVRE_LATLNG.lng) / TILE_DEGREES - 0.5,
  );
  const state = generateTokens(x, y);

  // empty hand
  if (hand === null) {
    if (state.hasGem && state.tier) {
      hand = state.tier;
      state.hasGem = false;
    }
  } else {
    // when holding a gem
    if (state.hasGem && state.tier === hand) {
      // add the gems togther
      state.tier = Math.min(state.tier + 1, 3) as Rank;
      hand = null;

      if (state.tier === 3) {
        rank3GemsCount();
      }
    } else if (!state.hasGem) {
      // to place back the gem
      state.hasGem = true;
      state.tier = hand!;
      hand = null;
    } else {
      // check - if diffrent rank was clicked
      statusPanelDiv.textContent =
        `Ranks must match to add toghter. Currintly holding rank ${hand}, clicked rank ${state.tier}.`;
    }
  }
  inventoryUpdate();
  renderGems();
});

function spawnGems(i: number, j: number, r: Rank) {
  const lat = LOUVRE_LATLNG.lat + (i + 0.5) * TILE_DEGREES;
  const lng = LOUVRE_LATLNG.lng + (j + 0.5) * TILE_DEGREES;
  const latlng = leaflet.latLng(lat, lng);

  //const tier = currentRank(i, j);
  const marker = leaflet.marker(latlng, { icon: tokenGem(r) }).addTo(map);
  marker.bindTooltip(`Rank ${r} gem (click to interact)`);
  tokenCells.set(getTokenKey(i, j), marker);
}

let rank3GemTotal = 0;
function rank3GemsCount() {
  rank3GemTotal += 1;
  if (rank3GemTotal >= 5) {
    winPanelDiv.textContent =
      "You stole from the Louvre! That was easy, wasn't it? You win!";
    map.off("click");
  }
}

/*
 **  -- PLAYER MOVMENT --
 */

// creating the points
const points = [
  { id: "north-point", text: "North", dx: 0, dy: 1 },
  { id: "east-point", text: "East", dx: 1, dy: 0 },
  { id: "south-point", text: "South", dx: 0, dy: -1 },
  { id: "west-point", text: "West", dx: -1, dy: 0 },
];

// buttons added to the page
points.forEach((config) => {
  const button = document.createElement("button");
  button.id = config.id;
  button.textContent = config.text;
  button.className = "point-button";
  button.addEventListener("click", () => movePlayer(config.dx, config.dy));
  navigationPanelDiv.append(button);
});

// function taken insperation from BeReyes1's D3
// calculates where the player moved to
function movePlayer(dx: number, dy: number) {
  const current = player.getLatLng();
  const newPos = leaflet.latLng(
    current.lat + dy * TILE_DEGREES,
    current.lng + dx * TILE_DEGREES,
  );

  player.setLatLng(newPos);
  playerRadius.setLatLng(newPos);
  map.setView(player.getLatLng());

  renderGems();
}

// to spawn the gems when the game loads
renderGems();
