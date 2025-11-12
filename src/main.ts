// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

import "leaflet/dist/leaflet.css";
import "./style.css";

import "./_leafletWorkaround.ts";

import luck from "./_luck.ts";

/*
 **  -- UI ELEMENTS --
 */

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "constrolPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "mapDiv";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// temp location
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
type Token = {
  id: string;
  latlng: leaflet.LatLng;
  tier: Rank;
  marker: leaflet.Marker;
};

let gems: Token[] = [];
let hand: Rank | null = null;

// taken Insperation from t4ylo on git nad thier take of D3.a - the tokens emojies
/*
 **  -- INVENTORY --
 */
const inventory = document.createElement("div");
inventory.id = "panel";
inventory.innerHTML = ` <h3>Inventory</h3>
<div class = "row"><span>Holding </span><span id = "hand" class = "badge">Empty</span></div>
`;
controlPanelDiv.append(inventory);

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
    html: `<div> ${gemEmoji} </div>`,
  });
}

function setGemTier(tok: Token, newRank: Rank) {
  tok.tier = newRank;
  tok.marker.setIcon(tokenGem(newRank));
  tok.marker.setTooltipContent("Rank ${newRank} gem (click to interact)");
}

// what to do when gems are clicked
function gemClicked(gem: Token) {
  gem.marker.on("click", () => {
    const distance = player.getLatLng().distanceTo(gem.latlng);

    if (distance > COLLECT_RADIUS) {
      alert(
        `Too far (${distance.toFixed(0)}m). Need around ${COLLECT_RADIUS}m.`,
      );
      return;
    }

    if (hand === null) {
      hand = gem.tier;
      inventoryUpdate();
      gem.marker.remove();
      gems = gems.filter((t) => t.id !== gem.id);
      return;
    }

    if (hand === gem.tier) {
      const newRank = (gem.tier + 1) as Rank;
      setGemTier(gem, Math.min(newRank, 3) as Rank);
      hand = null;
      inventoryUpdate();
    } else {
      statusPanelDiv.textContent =
        `Ranks must match to add toghter. Currintly holding rank ${hand}, clicked rank ${gem.tier}.`;
    }
  });
}

// to place gems back onto the map
map.on("click", (event: leaflet.LeafletMouseEvent) => {
  if (hand === null) return;

  const clickLatLng = event.latlng;
  const distance = player.getLatLng().distanceTo(clickLatLng);

  if (distance > COLLECT_RADIUS) {
    alert(
      `Too far (${distance.toFixed(0)}m). Need around ${COLLECT_RADIUS}m.`,
    );
    return;
  }

  const cellId = getCellId(clickLatLng);
  const existingGem = gems.find((g) => g.id === cellId);

  if (existingGem) {
    alert("Can't place gem here - it's full");
    return;
  }

  const i = Math.round(
    (clickLatLng.lat - LOUVRE_LATLNG.lat) / TILE_DEGREES - 0.5,
  );
  const j = Math.round(
    (clickLatLng.lng - LOUVRE_LATLNG.lng) / TILE_DEGREES - 0.5,
  );

  const newGem: Token = {
    id: `${i}-${j}`,
    latlng: clickLatLng,
    tier: hand,
    marker: leaflet.marker(clickLatLng, { icon: tokenGem(hand) }).addTo(map),
  };
  newGem.marker.bindTooltip(`Rank ${hand} gem (click to interact)`);
  gems.push(newGem);
  gemClicked(newGem);

  hand = null;
  inventoryUpdate();
});

function getCellId(latLng: leaflet.LatLng): string {
  const i = Math.round((latLng.lat - LOUVRE_LATLNG.lat) / TILE_DEGREES - 0.5);
  const j = Math.round((latLng.lng - LOUVRE_LATLNG.lng) / TILE_DEGREES - 0.5);
  return `${i}-${j}`;
}

/*
 **  -- SPAWNS IN GEMMS --
 */

function spawnGems(i: number, j: number) {
  const lat = LOUVRE_LATLNG.lat + (i + 0.5) * TILE_DEGREES;
  const lng = LOUVRE_LATLNG.lng + (j + 0.5) * TILE_DEGREES;
  const latlng = leaflet.latLng(lat, lng);

  const tier = currentRank(i, j);
  const marker = leaflet.marker(latlng, { icon: tokenGem(tier) }).addTo(map);
  marker.bindTooltip(`Rank ${tier} gem (click to interact)`);

  const gem: Token = { id: "${i}-${j}", latlng, tier, marker };
  gems.push(gem);
  gemClicked(gem);
}

// loopes though the map grid and addeds cells that are next to the player
// any that pass the luck check are created
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnGems(i, j);
    }
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
  controlPanelDiv.append(button);
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
}
