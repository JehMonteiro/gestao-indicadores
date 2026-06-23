import { Generator, getConfig } from "@tanstack/router-generator";
const cfg = getConfig({}, process.cwd());
const g = new Generator({ config: cfg, root: process.cwd() });
await g.run();
console.log("ok");
