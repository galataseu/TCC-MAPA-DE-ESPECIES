/**
 * fix_marker_coords.js
 * 
 * Recalcula e corrige as coordenadas de TODOS os marcadores no banco,
 * usando o algoritmo determinístico getDistributedCoordinate baseado em
 * nome científico + bioma + estados do animal.
 * 
 * Uso:
 *   node scripts/fix_marker_coords.js            # Aplica correções
 *   node scripts/fix_marker_coords.js --dry-run  # Só mostra o que faria
 */

const { PrismaClient } = require('@prisma/client');
const { getDistributedCoordinate } = require('../utils/biomaPolygons');

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n🔧 Fix Marker Coordinates — ${isDryRun ? 'DRY RUN (sem salvar)' : 'MODO REAL'}\n`);

  // Busca todos os marcadores com info do animal e bioma
  const markers = await prisma.$queryRawUnsafe(`
    SELECT
      m.id          AS marker_id,
      m.animal_id,
      a.nome_cientifico,
      a.classe,
      ST_X(m.location::geometry) AS cur_lng,
      ST_Y(m.location::geometry) AS cur_lat,
      (
        SELECT string_agg(b.nome, ', ')
        FROM api_animal_biomas ab
        JOIN api_bioma b ON ab.bioma_id = b.id
        WHERE ab.animal_id = a.id
      ) AS biomas,
      a.obs
    FROM api_marcador m
    JOIN api_animal a ON m.animal_id = a.id
    WHERE a.deleted_at IS NULL
    ORDER BY m.id ASC
  `);

  console.log(`📊 Total de marcadores encontrados: ${markers.length}\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const marker of markers) {
    try {
      // Extrai estados da obs do animal (ex: "Ocorrência nos estados: PR, SC.")
      let estadosRaw = '';
      if (marker.obs) {
        const match = marker.obs.match(/estados:\s*([^.]+)/i);
        if (match) estadosRaw = match[1].trim();
      }

      const biomaRaw = marker.biomas || '';
      const coord = getDistributedCoordinate(
        marker.nome_cientifico || '',
        marker.classe || '',
        biomaRaw,
        estadosRaw
      );

      const newLat = coord.lat;
      const newLng = coord.lng;
      const curLat = Number(marker.cur_lat);
      const curLng = Number(marker.cur_lng);

      // Verifica se as coordenadas atuais são claramente inválidas ou iguais ao fallback
      const isInvalidCoord =
        !curLat || !curLng ||
        (Math.abs(curLat) < 0.001 && Math.abs(curLng) < 0.001) || // (0, 0)
        (Math.abs(curLat - curLat) !== 0); // NaN check

      // Verifica se está dentro da região Sul do Brasil esperada
      const isInSul = curLat >= -34 && curLat <= -22 && curLng >= -58 && curLng <= -47;

      const shouldUpdate = !isInSul || isInvalidCoord;

      console.log(
        `  [${marker.marker_id}] ${(marker.nome_cientifico || '').substring(0, 35).padEnd(35)} | ` +
        `atual: (${curLat.toFixed(4)}, ${curLng.toFixed(4)}) → ` +
        `novo: (${newLat}, ${newLng}) | ` +
        (shouldUpdate ? '✅ ATUALIZAR' : '⏭  OK (já no Sul)')
      );

      if (!isDryRun && shouldUpdate) {
        await prisma.$executeRaw`
          UPDATE public.api_marcador
          SET location = ST_SetSRID(ST_MakePoint(${newLng}, ${newLat}), 4326)
          WHERE id = ${marker.marker_id}
        `;
        updated++;
      } else if (shouldUpdate) {
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`  ❌ Erro no marcador ${marker.marker_id}:`, err.message);
      errors++;
    }
  }

  console.log(`\n📈 Resultado:`);
  console.log(`   ${isDryRun ? 'Seriam atualizados' : 'Atualizados'}:  ${updated}`);
  console.log(`   Já corretos:  ${skipped}`);
  console.log(`   Erros:        ${errors}`);
  console.log(`\n${isDryRun ? '⚠️  DRY RUN: nenhuma alteração foi feita no banco.' : '✅ Coordenadas corrigidas com sucesso!'}\n`);
}

main()
  .catch(err => {
    console.error('\n❌ Erro fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
