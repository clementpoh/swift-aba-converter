import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/data", { recursive: true });
copyFileSync("data/routing.json.gz", "public/data/routing.json.gz");
copyFileSync("data/index.json", "public/data/index.json");
