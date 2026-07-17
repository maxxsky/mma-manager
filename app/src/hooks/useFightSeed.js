// Fight seed hook — deterministic RNG for reproducible fights
import { useEffect } from "react";
import { setRNG, resetRNG, mulberry32 } from "@ironfist/engine/rng.js";

export function useFightSeed(fighterId, bookedSeed) {
  useEffect(() => {
    const s = bookedSeed || Date.now();
    setRNG(mulberry32(s));
    return () => resetRNG();
  }, [fighterId, bookedSeed]);
}
