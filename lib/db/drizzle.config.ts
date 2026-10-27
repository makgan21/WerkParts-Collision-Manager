import { defineConfig } from "drizzle-kit";
import path from "path";

const databasePath = process.env.WERKPARTS_DB_PATH
  ?? path.resolve(__dirname, "../../artifacts/api-server/.data/werkparts-private.sqlite");

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "sqlite",
  dbCredentials: {
    url: databasePath,
  },
});
