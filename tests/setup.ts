import fs from "node:fs";

// Las pruebas leen el .env local (nunca el de produccion; ver tests/db.ts).
if (fs.existsSync(".env")) process.loadEnvFile(".env");
process.env.SESSION_SECRET ||= "secreto-de-pruebas-solo-local-0123456789";
