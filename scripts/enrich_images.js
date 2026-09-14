/**
 * scripts/enrich_images.js
 * 
 * Enriquece espécies cadastradas no banco com de 1 a 3 fotos públicas da Wikipédia/Wikimedia
 * e atualiza o marcador no mapa para exibir a foto representativa da espécie como ícone.
 * 
 * Uso:
 *   node scripts/enrich_images.js [--limit 50] [--batch 10]
 *   npm run enrich:images
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { fetchWikipediaImages } = require('../services/salveImporter');

function cleanString(str, maxLen = 250) {
  if (!str) return '';
  return String(str).trim().substring(0, maxLen);
}

async function main() {
  const args = process.argv.slice(2);
  let limit = 100;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
  }

  console.log(`\n🔍 Buscando espécies elegíveis para enriquecimento de imagens (limite: ${limit})...`);

  // 1. Atualização rápida em lote: atualiza ícones de todos os marcadores existentes
  // para apontar para a foto existente do animal (ordem = 1)
  console.log('🖼️  Sincronizando ícones de marcadores no mapa com fotos de espécies existentes...');
  const updatedIcons = await prisma.$executeRawUnsafe(`
    UPDATE api_marcador m
    SET icone = sub.imagem
    FROM (
      SELECT animal_id, imagem, ROW_NUMBER() OVER (PARTITION BY animal_id ORDER BY ordem ASC, id ASC) as rn
      FROM api_animalimagem
      WHERE imagem NOT LIKE '%logotipo%' AND imagem NOT LIKE '%falta_imagem%' AND imagem NOT LIKE '%Falta_imagem%'
    ) sub
    WHERE m.animal_id = sub.animal_id AND sub.rn = 1 AND (m.icone IS NULL OR m.icone LIKE '%logotipo%');
  `);
  console.log(`✅ ${updatedIcons} marcadores atualizados com ícone fotográfico no mapa.`);

  // 2. Busca espécies que possuem menos de 3 imagens no banco (prioriza as que já têm 1 imagem para enriquecer logo)
  const animals = await prisma.$queryRawUnsafe(`
    SELECT a.id, a.nome_comum, a.nome_cientifico, count(ai.id) as img_count
    FROM api_animal a
    LEFT JOIN api_animalimagem ai ON a.id = ai.animal_id
    WHERE a.deleted_at IS NULL
    GROUP BY a.id, a.nome_comum, a.nome_cientifico
    HAVING count(ai.id) < 3
    ORDER BY count(ai.id) DESC, a.id ASC
    LIMIT ${limit};
  `);

  console.log(`📋 Encontradas ${animals.length} espécies com menos de 3 fotos cadastradas.`);
  if (animals.length === 0) {
    console.log('✨ Todas as espécies já possuem imagens enriquecidas.');
    await prisma.$disconnect();
    return;
  }

  let enrichedCount = 0;
  let totalAdded = 0;

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    const scientificName = a.nome_cientifico;
    const animalId = a.id;
    const currentCount = Number(a.img_count || 0);

    try {
      const photos = await fetchWikipediaImages(scientificName);
      if (photos && photos.length > 0) {
        // Busca imagens atuais
        const existingImgs = await prisma.api_animalimagem.findMany({
          where: { animal_id: animalId }
        });
        const existingUrls = new Set(existingImgs.map(e => e.imagem));

        let currentOrdem = existingImgs.length;
        let leadPhotoUrl = existingImgs.length > 0 ? existingImgs[0].imagem : null;
        let addedForThisAnimal = 0;

        for (const p of photos) {
          if (existingUrls.size >= 3) break;
          const safeUrl = cleanString(p.url, 490);
          if (safeUrl && !existingUrls.has(safeUrl)) {
            currentOrdem++;
            const safeCaption = cleanString(`${a.nome_comum} (${p.source})`, 240);
            await prisma.api_animalimagem.create({
              data: {
                animal_id: animalId,
                imagem: safeUrl,
                legenda: safeCaption,
                ordem: currentOrdem
              }
            });
            existingUrls.add(safeUrl);
            addedForThisAnimal++;
            totalAdded++;
            if (!leadPhotoUrl) leadPhotoUrl = safeUrl;
          }
        }

        // Atualiza ícone do marcador se necessário
        if (leadPhotoUrl && !leadPhotoUrl.includes('logotipo') && !leadPhotoUrl.includes('falta_imagem')) {
          await prisma.$executeRaw`
            UPDATE public.api_marcador
            SET icone = ${leadPhotoUrl}
            WHERE animal_id = ${animalId};
          `;
        }

        if (addedForThisAnimal > 0) {
          enrichedCount++;
          console.log(`[${i + 1}/${animals.length}] +${addedForThisAnimal} foto(s) para "${a.nome_comum}" (${scientificName}) -> Total: ${existingUrls.size} fotos`);
        }
      }

      // Pequena pausa (80ms) para não sobrecarregar as APIs de Wikimedia
      await new Promise(r => setTimeout(r, 80));
    } catch (err) {
      console.warn(`Erro ao enriquecer ${scientificName}:`, err.message);
    }
  }

  console.log(`\n🎉 Concluído! ${enrichedCount} espécies enriquecidas com ${totalAdded} novas imagens.`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
