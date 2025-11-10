// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

import "leaflet/dist/leaflet.css";
import "./style.css";

import "./_leafletWorkaround.ts";

import luck from "./_luck.ts";

// the basic UI elemets

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

// the set game values
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

// creating the player marker
const player = leaflet.marker(LOUVRE_LATLNG);
player.addTo(map);

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
const invatory = document.createElement("div");
invatory.className = "panel";

function invatoryUpdate() {
  (invatory.querySelector("#hand") as HTMLElement).textContent = hand
    ? `Rank ${hand}`
    : "Empty";
  statusPanelDiv.textContent = hand
    ? `Holding Rank ${hand}. Clicki another token of Rank ${hand} withen ${COLLECT_RADIUS}m to merge.`
    : `Click a token within ${COLLECT_RADIUS}m to pick up`;
}
function currentRank(i: number, j: number): Rank {
  const rank = luck([i, j, "tier"].toString());
  if (rank < 0.75) return 1;
  if (rank < 0.95) return 2;
  return 3;
}

function tokenGem(tier: Rank) {
  const gemEmoji = tier === 1 ? "💎" : tier === 2 ? "💍" : "👑";
  return leaflet.divIcon({
    className: "",
    html: `<div style = "font-size:24px;" > ${gemEmoji} </div>`,
  });
}

function setGemTier(tok: Token, newRank: Rank) {
  tok.tier = newRank;
  tok.marker.setIcon(tokenGem(newRank));
  tok.marker.setTooltipContent("Tier ${newRank} token (click to interact)");
}

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
      invatoryUpdate();
      gem.marker.remove();
      gems = gems.filter((t) => t.id !== gem.id);
      return;
    }

    if (hand === gem.tier) {
      const newRank = (gem.tier + 1) as Rank;
      setGemTier(gem, Math.min(newRank, 3) as Rank);
      hand = null;
      invatoryUpdate();
    } else {
      statusPanelDiv.textContent =
        `Tiers must match to add toghter. Currintly holding Tier ${hand}, clicked Tier ${gem.tier}.`;
    }
  });
}

function spawnGems(i: number, j: number) {
  const lat = LOUVRE_LATLNG.lat + (i + 0.5) * TILE_DEGREES;
  const lng = LOUVRE_LATLNG.lng + (j + 0.5) * TILE_DEGREES;
  const latlng = leaflet.latLng(lat, lng);

  const tier = currentRank(i, j);
  const marker = leaflet.marker(latlng, { icon: tokenGem(tier) }).addTo(map);
  marker.bindTooltip(`Tier ${tier} token (click to interact)`);

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
