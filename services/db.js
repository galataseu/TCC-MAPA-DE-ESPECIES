/**
 * Cliente Prisma compartilhado (singleton).
 *
 * Por que isso existe: na Vercel cada rota vira uma função serverless que pode
 * ser reutilizada entre invocações (warm). Criar `new PrismaClient()` em cada
 * arquivo de rota estoura o pool de conexões do Postgres/Supabase e derruba
 * a importação do CSV só em produção. Aqui reusamos a mesma instância.
 */
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__tccPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__tccPrisma = prisma;
} else if (!globalForPrisma.__tccPrisma) {
  // Em serverless (Vercel) o módulo pode ser reavaliado; guarda mesmo em prod.
  globalForPrisma.__tccPrisma = prisma;
}

module.exports = prisma;
