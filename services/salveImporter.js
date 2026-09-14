const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getBiomaGeometry, getDistributedCoordinate } = require('../utils/biomaPolygons');

/**
 * Parser de CSV tolerante a aspas, delimitadores (; ou ,) e quebras de linha CRLF
 * @param {string} text 
 * @returns {{ delimiter: string, headers: string[], rows: object[] }}
 */
function parseCSV(text) {
  if (!text || typeof text !== 'string') {
    return { delimiter: ';', headers: [], rows: [] };
  }

  // Detecta delimitador na primeira linha
  const firstLine = text.slice(0, 2000).split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  let delimiter = ';';
  if (commaCount > semiCount && commaCount > tabCount) delimiter = ',';
  if (tabCount > semiCount && tabCount > commaCount) delimiter = '\t';

  const rawRows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // ignora aspas escapadas
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(f => f.length > 0)) rawRows.push(currentRow);
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(f => f.length > 0)) rawRows.push(currentRow);
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) rawRows.push(currentRow);
  }

  if (rawRows.length === 0) {
    return { delimiter, headers: [], rows: [] };
  }

  // Normaliza cabeçalhos
  const rawHeaders = rawRows[0];
  const headers = rawHeaders.map(h => 
    h.toLowerCase()
     .normalize('NFD')
     .replace(/[\u0300-\u036f]/g, '') // remove acentos
     .replace(/[^a-z0-9_]/g, '_')
     .replace(/^_+|_+$/g, '')
  );

  const rows = [];
  for (let r = 1; r < rawRows.length; r++) {
    const rowObj = {};
    const cells = rawRows[r];
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col_${c}`;
      rowObj[key] = cells[c] !== undefined ? cells[c] : '';
    }
    rows.push(rowObj);
  }

  return { delimiter, headers, rows };
}

/**
 * Sanitiza e trunca strings para garantir integridade com o banco de dados
 */
function cleanString(val, maxLen) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s.length === 0) return null;
  return s.length > maxLen ? s.substring(0, maxLen).trim() : s;
}

/**
 * Consulta a API da Wikipédia (PT ou EN) para obter de 1 a 3 imagens públicas da espécie
 * Tenta endpoint media-list primeiro para múltiplas imagens, com fallback em summary
 * @param {string} scientificName 
 * @returns {Promise<Array<{ url: string, title: string, source: string, isLead: boolean }>>}
 */
async function fetchWikipediaImages(scientificName) {
  if (!scientificName || typeof scientificName !== 'string') return [];
  const cleanName = scientificName.trim().replace(/\s+/g, '_');
  const userAgent = 'TCC-Mapa-Especies-Sul/1.0 (contato@escola.edu.br; educational use)';
  const timeoutMs = 2500;

  const tryWiki = async (lang) => {
    // 1. Tenta media-list para obter múltiplas imagens
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const mediaRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(cleanName)}`, {
        headers: { 'User-Agent': userAgent },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        if (mediaData.items && Array.isArray(mediaData.items)) {
          const validPhotos = [];

          for (const item of mediaData.items) {
            if (item.type !== 'image') continue;
            const titleLower = (item.title || '').toLowerCase();

            // Filtros para ignorar ícones, mapas, gráficos, placeholders e status IUCN
            if (
              titleLower.endsWith('.svg') ||
              titleLower.includes('.svg') ||
              titleLower.includes('status_') ||
              titleLower.includes('iucn') ||
              titleLower.includes('map') ||
              titleLower.includes('distribut') ||
              titleLower.includes('range') ||
              titleLower.includes('falta_imagem') ||
              titleLower.includes('sound') ||
              titleLower.includes('audio') ||
              titleLower.includes('icon') ||
              titleLower.includes('symbol') ||
              titleLower.includes('graph') ||
              titleLower.includes('flag') ||
              titleLower.includes('logo') ||
              titleLower.includes('diagram') ||
              titleLower.includes('cladogram') ||
              titleLower.includes('taxobox')
            ) {
              continue;
            }

            if (item.srcset && item.srcset.length > 0) {
              let chosenSrc = item.srcset[0].src;
              for (const sc of item.srcset) {
                if (sc.src && (sc.scale === '1x' || sc.src.includes('500px') || sc.src.includes('600px') || sc.src.includes('400px'))) {
                  chosenSrc = sc.src;
                  break;
                }
              }
              if (chosenSrc.startsWith('//')) chosenSrc = 'https:' + chosenSrc;

              if (chosenSrc.length <= 490) {
                const cleanCaption = (item.title || '')
                  .replace(/^(Ficheiro|File):/i, '')
                  .replace(/\.[^/.]+$/, '')
                  .replace(/_/g, ' ');

                validPhotos.push({
                  url: chosenSrc,
                  title: cleanCaption || scientificName,
                  source: `Wikipédia (${lang})`,
                  isLead: !!item.leadImage
                });
              }
            }

            if (validPhotos.length >= 3) break;
          }

          if (validPhotos.length > 0) {
            validPhotos.sort((a, b) => (b.isLead ? 1 : 0) - (a.isLead ? 1 : 0));
            return validPhotos.slice(0, 3);
          }
        }
      }
    } catch (e) {
      // Ignora timeout/abort
    }

    // 2. Fallback: Tenta /summary se media-list não achou fotos
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const sumRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`, {
        headers: { 'User-Agent': userAgent },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        const src = (sumData.thumbnail && sumData.thumbnail.source) || (sumData.originalimage && sumData.originalimage.source);
        if (src && src.length <= 490 && !src.toLowerCase().includes('.svg') && !src.toLowerCase().includes('falta_imagem')) {
          return [{
            url: src,
            title: sumData.title || scientificName,
            source: `Wikipédia (${lang})`,
            isLead: true
          }];
        }
      }
    } catch (e) {
      // Ignora timeout/abort
    }

    return null;
  };

  // 1. Tenta pt primeiro
  const ptPhotos = await tryWiki('pt');
  if (ptPhotos && ptPhotos.length > 0) return ptPhotos;

  // 2. Fallback em en
  const enPhotos = await tryWiki('en');
  if (enPhotos && enPhotos.length > 0) return enPhotos;

  return [];
}

/**
 * Função de conveniência para obter apenas 1 imagem (compatibilidade)
 */
async function fetchWikipediaImage(scientificName) {
  const list = await fetchWikipediaImages(scientificName);
  return list.length > 0 ? list[0] : null;
}

/**
 * Normaliza o valor de uma coluna buscando por possíveis sinônimos no CSV do SALVE
 */
function findValue(row, possibleKeys) {
  for (const k of possibleKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim().length > 0) {
      return String(row[k]).trim();
    }
  }
  return '';
}

/**
 * Processa a importação das linhas do CSV de Fichas do SALVE
 * @param {string} csvContent 
 * @param {object} options { autoImages: boolean, maxRows: number }
 * @param {function} onProgress Callback chamado a cada espécie processada com { current, total, percent, species }
 */
async function importSalveCSV(csvContent, options = { autoImages: true, maxRows: 5000 }, onProgress = null) {
  const { headers, rows } = parseCSV(csvContent);

  if (rows.length === 0) {
    throw new Error('O arquivo CSV está vazio ou o formato não pôde ser interpretado.');
  }

  // Carrega categorias de extinção do banco para lookup
  const niveisDB = await prisma.api_nivelextincao.findMany();
  const nivelMap = new Map();
  let defaultNivelId = niveisDB.length > 0 ? niveisDB[0].id : 1n;

  for (const n of niveisDB) {
    if (n.sigla) nivelMap.set(n.sigla.toUpperCase(), n.id);
    if (n.nome) nivelMap.set(n.nome.toUpperCase(), n.id);
    if (n.sigla && (n.sigla.toUpperCase() === 'DD' || n.sigla.toUpperCase() === 'LC')) {
      defaultNivelId = n.id;
    }
  }

  // Carrega biomas do banco para associação
  const biomasDB = await prisma.api_bioma.findMany();
  const biomaMap = new Map();
  for (const b of biomasDB) {
    biomaMap.set(b.nome.toLowerCase(), b.id);
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  const maxToProcess = Math.min(rows.length, options.maxRows || 5000);
  const now = new Date();

  // Processa linha por linha com controle de taxa e tolerância a falhas
  for (let i = 0; i < maxToProcess; i++) {
    const r = rows[i];

    // 1. Identificar campos principais
    const scientificName = findValue(r, ['especie', 'nome_cientifico', 'scientific_name', 'taxon', 'nome_valido']);
    if (!scientificName || scientificName.length < 3) {
      skippedCount++;
      if (typeof onProgress === 'function') {
        onProgress({
          current: i + 1,
          total: maxToProcess,
          percent: Math.min(100, Math.round(((i + 1) / maxToProcess) * 100)),
          species: 'Linha em branco/ignorada'
        });
      }
      continue;
    }

    let commonName = findValue(r, ['nome_comum', 'nome_popular', 'vernacular_name', 'nome']);
    if (!commonName) {
      commonName = scientificName; // Fallback para não violar restrição NOT NULL
    }

    const classe = findValue(r, ['classe', 'class']) || 'Não informada';
    const familia = findValue(r, ['familia', 'family']) || null;
    const categoriaRaw = findValue(r, ['categoria', 'nivel_extincao', 'grau_ameaca', 'status', 'iucn']).toUpperCase();
    const biomaRaw = findValue(r, ['bioma', 'biomas', 'ecossistema']);
    const justificativa = findValue(r, ['justificativa', 'descricao', 'habitos', 'historico_avaliacao', 'observacoes']);
    const estadosRaw = findValue(r, ['estado', 'estados', 'uf']);

    // Mapeia nível de extinção
    let nivelId = defaultNivelId;
    if (categoriaRaw) {
      // Procura sigla exata (ex: "CR", "EN", "VU", "NT", "LC")
      for (const [key, id] of nivelMap.entries()) {
        if (categoriaRaw === key || categoriaRaw.includes(key)) {
          nivelId = id;
          break;
        }
      }
    }

    // 2. Mapear informações de bioma e ocorrência
    const biomaGeo = getBiomaGeometry(biomaRaw || 'Mata Atlântica');
    let obsContent = justificativa || `Espécie documentada no bioma ${biomaGeo.label}.`;
    if (estadosRaw) {
      obsContent += `\nOcorrência nos estados: ${estadosRaw}.`;
    }

    // Sanitização contra estouro de colunas do banco
    const safeCommonName = cleanString(commonName, 240) || cleanString(scientificName, 240);
    const safeScientificName = cleanString(scientificName, 140);
    const safeClasse = cleanString(classe, 90) || 'Não informada';
    const safeFamilia = cleanString(familia, 90);

    try {
      // 3. Verifica se o animal já existe
      const existing = await prisma.api_animal.findFirst({
        where: { nome_cientifico: safeScientificName }
      });

      let animalId;
      if (existing) {
        // Atualiza campos
        await prisma.api_animal.update({
          where: { id: existing.id },
          data: {
            nome_comum: existing.nome_comum || safeCommonName,
            classe: existing.classe || safeClasse,
            familia: existing.familia || safeFamilia,
            habitos: existing.habitos || justificativa || null,
            obs: obsContent,
            nivel_extincao_id: nivelId,
            updated_at: now
          }
        });
        animalId = existing.id;
        updatedCount++;
      } else {
        // Cria novo registro
        const created = await prisma.api_animal.create({
          data: {
            nome_comum: safeCommonName,
            nome_cientifico: safeScientificName,
            classe: safeClasse,
            familia: safeFamilia,
            habitos: justificativa || null,
            obs: obsContent,
            nivel_extincao_id: nivelId,
            created_at: now,
            updated_at: now
          }
        });
        animalId = created.id;
        insertedCount++;
      }

      // 4. Atribui coordenada geográfica realista e distribuída no bioma/estado
      const distCoord = getDistributedCoordinate(safeScientificName, safeClasse, biomaRaw, estadosRaw);
      const cLat = distCoord.lat;
      const cLng = distCoord.lng;

      const markerExists = await prisma.api_marcador.findFirst({
        where: { animal_id: animalId }
      });

      if (!markerExists) {
        await prisma.$executeRaw`
          INSERT INTO public.api_marcador (animal_id, location, icone, created_at)
          VALUES (${animalId}, ST_SetSRID(ST_MakePoint(${cLng}, ${cLat}), 4326), '/assets/img/logotipo.png', ${now});
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE public.api_marcador
          SET location = ST_SetSRID(ST_MakePoint(${cLng}, ${cLat}), 4326)
          WHERE id = ${markerExists.id};
        `;
      }

      // 5. Vincula biomas na tabela associativa api_animal_biomas
      if (biomaRaw) {
        const biomaTokens = biomaRaw.toLowerCase();
        for (const [nomeBioma, bId] of biomaMap.entries()) {
          if (biomaTokens.includes(nomeBioma)) {
            const relExists = await prisma.api_animal_biomas.findFirst({
              where: { animal_id: animalId, bioma_id: bId }
            });
            if (!relExists) {
              await prisma.api_animal_biomas.create({
                data: { animal_id: animalId, bioma_id: bId }
              });
            }
          }
        }
      }

      // 6. Busca de Imagens Automáticas na Wikipédia (de preferência de 1 a 3 fotos)
      if (options.autoImages) {
        const existingImgs = await prisma.api_animalimagem.findMany({
          where: { animal_id: animalId },
          orderBy: { ordem: 'asc' }
        });

        let leadIconUrl = existingImgs.length > 0 ? existingImgs[0].imagem : null;

        if (existingImgs.length === 0) {
          const wikiImages = await fetchWikipediaImages(scientificName);
          if (wikiImages && wikiImages.length > 0) {
            const toSave = wikiImages.slice(0, 3);
            for (let idx = 0; idx < toSave.length; idx++) {
              const imgData = toSave[idx];
              const safeImgUrl = cleanString(imgData.url, 490);
              const safeLegenda = cleanString(`${safeCommonName} (${imgData.source})`, 240);
              if (safeImgUrl) {
                await prisma.api_animalimagem.create({
                  data: {
                    animal_id: animalId,
                    imagem: safeImgUrl,
                    legenda: safeLegenda,
                    ordem: idx + 1
                  }
                });
                if (idx === 0) leadIconUrl = safeImgUrl;
              }
            }
          }
        }

        // Atualiza o ícone do marcador com a foto representativa do animal
        if (leadIconUrl && !leadIconUrl.includes('logotipo.png') && !leadIconUrl.includes('falta_imagem')) {
          await prisma.$executeRaw`
            UPDATE public.api_marcador
            SET icone = ${leadIconUrl}
            WHERE animal_id = ${animalId};
          `;
        }
      }

      if (typeof onProgress === 'function') {
        const percent = Math.min(100, Math.round(((i + 1) / maxToProcess) * 100));
        onProgress({
          current: i + 1,
          total: maxToProcess,
          percent,
          species: safeScientificName
        });
      }
    } catch (err) {
      console.error(`Erro ao importar espécie "${scientificName}":`, err.message);
      errors.push({
        row: i + 2,
        species: scientificName,
        error: err.message
      });
      if (typeof onProgress === 'function') {
        const percent = Math.min(100, Math.round(((i + 1) / maxToProcess) * 100));
        onProgress({
          current: i + 1,
          total: maxToProcess,
          percent,
          species: scientificName
        });
      }
    }
  }

  return {
    success: true,
    totalParsed: rows.length,
    processed: maxToProcess,
    inserted: insertedCount,
    updated: updatedCount,
    skipped: skippedCount,
    errors: errors.slice(0, 50) // Limita tamanho do relatório de erros
  };
}

module.exports = {
  parseCSV,
  fetchWikipediaImage,
  fetchWikipediaImages,
  importSalveCSV
};
