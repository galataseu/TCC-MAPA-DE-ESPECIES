/**
 * APAGA TODOS os animais cadastrados (hard delete) + registros relacionados.
 *
 * Uso: node scripts/delete_all_animals.js
 *
 * ATENÇÃO: irreversível. Apaga na ordem das FKs:
 *   api_favorito -> api_marcador -> api_animalimagem -> api_animal_biomas -> api_animal
 * Usa o DATABASE_URL do .env (pode ser o banco de PRODUÇÃO/Supabase!).
 */
require('dotenv').config();
const prisma = require('../services/db');

(async () => {
  console.log('Contagem antes:');
  const before = {
    animais: await prisma.api_animal.count(),
    marcadores: await prisma.api_marcador.count(),
    imagens: await prisma.api_animalimagem.count(),
    biomas: await prisma.api_animal_biomas.count(),
    favoritos: await prisma.api_favorito.count(),
  };
  console.log(before);

  await prisma.$transaction([
    prisma.api_favorito.deleteMany({}),
    prisma.api_marcador.deleteMany({}),
    prisma.api_animalimagem.deleteMany({}),
    prisma.api_animal_biomas.deleteMany({}),
    prisma.api_animal.deleteMany({}),
  ]);

  console.log('Contagem depois:');
  console.log({
    animais: await prisma.api_animal.count(),
    marcadores: await prisma.api_marcador.count(),
    imagens: await prisma.api_animalimagem.count(),
  });
  console.log('CONCLUÍDO: todos os animais foram apagados.');
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('ERRO:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
