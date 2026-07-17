import "dotenv/config";
import { app } from "./app.js";
import { startResolveScheduler } from "./jobs/resolveScheduler.js";

const PORT = process.env.PORT || 3001;

// Start background jobs
startResolveScheduler();

app.listen(PORT, () => {
  console.log(`@ironfist/server listening on :${PORT}`);
});
