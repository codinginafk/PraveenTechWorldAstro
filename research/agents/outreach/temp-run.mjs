import { runAutoSubmits } from "./auto-submit.mjs";
const r = await runAutoSubmits();
console.log(JSON.stringify(r, null, 2));
