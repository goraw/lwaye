import { createApp } from "./app";
import { config, validateRuntimeConfig } from "./config";

validateRuntimeConfig();

const app = createApp();

app.listen(config.port, () => {
  console.log(`LwayLway API listening on http://localhost:${config.port}`);
});

