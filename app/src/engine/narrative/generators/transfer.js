// Transfer reason generator — why an established fighter is available to recruit
import { pick } from "../../rng.js";

const REASONS = [
  // Pattern 1: seeking better training facilities (ala Dustin Poirier)
  (fighter) => `Ingin akses training partner dan fasilitas yang lebih baik.`,
  // Pattern 2: leaving old camp due to lack of support (ala Rashad Evans)
  (fighter) => `Merasa tidak lagi jadi prioritas di camp lamanya.`,
];

/**
 * Generate a narrative reason why a fighter is considering a transfer.
 * @param {Object} fighter - The generated fighter
 * @returns {string} A one-sentence reason
 */
export function generateTransferReason(fighter) {
  return pick(REASONS)(fighter);
}
