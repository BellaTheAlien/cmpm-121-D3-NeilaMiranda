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
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// the set game values
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// creating the map parameters
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
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
const player = leaflet.marker(CLASSROOM_LATLNG);
player.addTo(map);

// the rectangle cells to be created
function spawnCells(i: number, j: number) {
  const origin = CLASSROOM_LATLNG;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  const cellRect = leaflet.rectangle(bounds);
  cellRect.addTo(map);
}

// loopes though the map grid and addeds cells that are next to the player
// any that pass the luck check are created
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCells(i, j);
    }
  }
}
