import { mpkRzeszowFleet } from "./mpkRzeszowFleet";
import { pksRzeszowFleet } from "./pksRzeszowFleet";

export const carrierFleets = [
  { carrier: "MPK Rzeszów", fleet: mpkRzeszowFleet },
  { carrier: "PKS Rzeszów", fleet: pksRzeszowFleet },
];

const normalize = (value: string) => value.toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");

export function searchVehicles(query: string) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return carrierFleets.map(({ carrier, fleet }) => ({
    carrier,
    total: Object.keys(fleet).length,
    vehicles: Object.entries(fleet)
      .map(([number, vehicle]) => ({ number, ...vehicle }))
      .filter(({ number, brand, model }) => {
        const text = normalize(`${carrier} ${number} #${number} ${brand} ${model}`);
        return terms.every((term) => text.includes(term));
      })
      .sort((a, b) => a.number.localeCompare(b.number, "pl", { numeric: true })),
  }));
}