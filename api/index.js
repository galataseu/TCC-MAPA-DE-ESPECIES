/**
 * Entrypoint serverless para a Vercel.
 *
 * O app Express continua o mesmo do ambiente local (app.js). A Vercel
 * direciona todas as requisições para cá via `vercel.json` (rewrites).
 * Arquivos estáticos em `public/` continuam servidos como estáticos.
 */
module.exports = require('../app');
