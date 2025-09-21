import express from "express";
import { createRequestHandler } from "@remix-run/express";

const app = express();
const PORT = process.env.PORT || 3000;

// Statische Dateien (public/)
app.use(express.static("public"));

// Remix SSR
app.all(
  "*",
  createRequestHandler({
    build: await import("./build/server/index.js"),
    mode: process.env.NODE_ENV,
  })
);

// 🚀 Hier wichtig: auf 0.0.0.0 lauschen (Fly erwartet das!)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ App running at http://0.0.0.0:${PORT}`);
});
