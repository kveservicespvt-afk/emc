import "dotenv/config";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";

const app = createApp();

app.listen(config.port, "127.0.0.1", () => {
  logger.info(`EaseMyClean API listening on port ${config.port} [${config.nodeEnv}]`);
});
