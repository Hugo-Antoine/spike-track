/**
 * Script pour ajouter des vidéos à la base de données
 *
 * Usage: npx tsx scripts/add-videos.ts
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/server/db/schema.js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
config({ path: resolve(__dirname, "../.env") });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// 📹 Définissez vos vidéos ici
const videosToAdd = [
  {
    name: "Match Reims vs Amiens - Extrait 10s",
    cloudinaryPublicId: "reims-amiens-10s",
    totalFrames: 300,
    fps: 30,
    width: 1280,
    height: 720,
  },
];

async function addVideos() {
  console.log("🎬 Ajout des vidéos...\n");

  try {
    for (const video of videosToAdd) {
      const [inserted] = await db
        .insert(schema.videos)
        .values(video)
        .returning();

      console.log(`✅ Vidéo ajoutée : ${inserted!.name} (ID: ${inserted!.id})`);
      console.log(`   📁 Public ID: ${inserted!.cloudinaryPublicId}`);
      console.log(`   🎞️  Frames: ${inserted!.totalFrames}`);
      console.log();
    }

    console.log("🎉 Toutes les vidéos ont été ajoutées avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des vidéos :", error);
    process.exit(1);
  }
}

addVideos();
