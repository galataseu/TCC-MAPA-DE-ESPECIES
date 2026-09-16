const express = require('express');
const router = express.Router();
const multer = require('multer');
const prisma = require('../services/db');
const { sendStatusChangeEmail } = require('../services/mailer');
const { getBiomaGeometry } = require('../utils/biomaPolygons');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dispara e-mails de alerta quando o status de conservação muda.
// Roda em background (não bloqueia a resposta): só envia se o status
// mudou de fato, e só para assinaturas ativas daquele animal.
async function dispatchStatusChange(animalId, oldNivelId, newNivelId) {
  try {
    if (!oldNivelId || !newNivelId || String(oldNivelId) === String(newNivelId)) return;
    const [animal, oldNivel, newNivel] = await Promise.all([
      prisma.api_animal.findUnique({ where: { id: BigInt(animalId) }, select: { nome_comum: true } }),
      prisma.api_nivelextincao.findUnique({ where: { id: BigInt(oldNivelId) } }),
      prisma.api_nivelextincao.findUnique({ where: { id: BigInt(newNivelId) } })
    ]);
    if (!animal || !oldNivel || !newNivel) return;
    const subs = await prisma.api_alerta_status.findMany({
      where: { animal_id: BigInt(animalId), ativo: true },
      select: { email: true }
    });
    for (const s of subs) {
      try {
        await sendStatusChangeEmail(s.email, { animalNome: animal.nome_comum, oldNivel, newNivel });
      } catch (e) {
        console.error('[alerta-status] falha ao enviar para', s.email, e.message);
      }
    }
  } catch (e) {
    console.error('[alerta-status] erro no disparo:', e.message);
  }
}

// Uploads 100% em memória (memoryStorage): nada é gravado em disco.
// Por quê: o app roda na Vercel/Render, onde o disco é efêmero — arquivos
// salvos em /media evaporavam e os ícones/fotos "sumiam" (404 no banco).
// Fotos e ícones vão para o banco como data URL (colunas TEXT), que o
// frontend já sabe exibir em todos os lugares (cards, modal, marcadores).
// URLs remotas (http) continuam guardadas como estão.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // area_polygon_json de biomas precisos chega a centenas de KB por campo
    fieldSize: 20 * 1024 * 1024,
    // 6 MB por foto (o base64 infla ~33%)
    fileSize: 6 * 1024 * 1024,
    files: 11
  }
});

// Traduz erros do multer para JSON amigável (senão cai no 500 em HTML).
function uploadFieldsSafe(req, res, next) {
  uploadFields(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, error: 'Imagem muito grande (máx. 6 MB por foto). Comprima a imagem e tente de novo.', message: 'Imagem muito grande (máx. 6 MB por foto). Comprima a imagem e tente de novo.' });
      if (err.code === 'LIMIT_FIELD_VALUE') return res.status(413).json({ success: false, error: 'Dados grandes demais para o servidor. Tente com menos fotos por vez.', message: 'Dados grandes demais para o servidor. Tente com menos fotos por vez.' });
      return res.status(400).json({ success: false, error: 'Falha no upload: ' + (err.message || err.code), message: 'Falha no upload: ' + (err.message || err.code) });
    }
    next();
  });
}

const serialize = (obj) => JSON.parse(JSON.stringify(obj, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
));

function formatPrismaError(err) {
  if (!err) return 'Erro desconhecido no servidor.';
  if (err.code === 'P2002') {
    const target = err.meta && err.meta.target ? ` (${Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target})` : '';
    return `Já existe um registro com estes dados únicos${target}. Verifique o nome científico ou outros campos únicos.`;
  }
  if (err.code === 'P2003') {
    return 'Erro de integridade referencial: um dos identificadores informados não foi encontrado.';
  }
  return err.message || 'Erro ao processar a requisição no banco de dados.';
}

// Converte arquivo enviado (memória) em data URL pronta p/ guardar no banco.
// Retorna null se não for imagem.
function fileToDataUrl(file) {
  if (!file || !file.buffer || file.buffer.length === 0) return null;
  const mime = file.mimetype || 'image/png';
  if (!mime.startsWith('image/')) return null;
  return `data:${mime};base64,${file.buffer.toString('base64')}`;
}

// Valida o crop do ícone (base64 vindo do canvas) e devolve a data URL
// pronta p/ o banco. Limite de ~1,5M chars (~1,1 MB) contra payload absurdo.
function cleanIconDataUrl(dataString) {
  if (!dataString || typeof dataString !== 'string' || !dataString.startsWith('data:image')) {
    return null;
  }
  if (!/^data:image\/[A-Za-z0-9+.-]+;base64,/.test(dataString.slice(0, 60)) || dataString.length > 1500000) {
    return null;
  }
  return dataString;
}

// GET /api/v1/niveis-extincao/
router.get('/niveis-extincao/', async (req, res) => {
  try {
    const niveis = await prisma.api_nivelextincao.findMany({
      orderBy: { id: 'asc' }
    });
    res.json({ success: true, data: serialize(niveis) });
  } catch (err) {
    console.error('Error fetching niveis-extincao:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/biomas/
router.get('/biomas/', async (req, res) => {
  try {
    const biomas = await prisma.api_bioma.findMany({
      orderBy: { id: 'asc' }
    });
    res.json({ success: true, data: serialize(biomas) });
  } catch (err) {
    console.error('Error fetching biomas:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/biomas-areas/
// Áreas de referência dos biomas (polígonos simplificados [lat,lng]) para
// preencher a zona de ocorrência no cadastro sem desenhar manualmente.
router.get('/biomas-areas/', async (req, res) => {
  try {
    const defs = [
      { key: 'mata_atlantica', nome: 'Mata Atlântica', query: 'mata atlantica' },
      { key: 'pampa', nome: 'Pampa', query: 'pampa' },
      { key: 'cerrado', nome: 'Cerrado', query: 'cerrado' }
    ];
    const data = defs.map(d => {
      const geo = getBiomaGeometry(d.query);
      return {
        key: d.key,
        nome: d.nome,
        color: geo.color,
        centroid: geo.centroid,
        polygons: geo.polygons
      };
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching biomas-areas:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/regioes/
router.get('/regioes/', async (req, res) => {
  try {
    const regioes = await prisma.api_regiao.findMany({
      orderBy: { id: 'asc' }
    });
    res.json({ success: true, data: serialize(regioes) });
  } catch (err) {
    console.error('Error fetching regioes:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/animais/
router.get('/animais/', async (req, res) => {
  try {
    const animais = await prisma.api_animal.findMany({
      where: { deleted_at: null },
      include: {
        api_nivelextincao: true,
        api_niveldestruicao: true,
        api_animal_biomas: {
          include: { api_bioma: true }
        },
        api_animalimagem: true,
        api_marcador: true
      },
      orderBy: { nome_comum: 'asc' }
    });
    res.json({ success: true, data: serialize(animais) });
  } catch (err) {
    console.error('Error fetching animais:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const uploadFields = upload.fields([
  { name: 'animal_imagem', maxCount: 10 },
  { name: 'animal_icone', maxCount: 1 }
]);

// POST /api/v1/animais/
router.post('/animais/', uploadFieldsSafe, async (req, res) => {
  try {
    const b = req.body;
    const now = new Date();

    const nivelExtincaoId = b.nivel_extincao_id ? BigInt(b.nivel_extincao_id) : 1n;
    
    // 1. Capturar arquivo ou URL da imagem principal (data URL p/ uploads)
    let imgPath = null;
    if (req.files && req.files['animal_imagem'] && req.files['animal_imagem'].length > 0) {
      imgPath = fileToDataUrl(req.files['animal_imagem'][0]);
    } else if (b.imagem_url && b.imagem_url.trim().length > 0) {
      imgPath = b.imagem_url.trim();
    } else if (b.imagem) {
      imgPath = b.imagem;
    }

    // 2. Capturar arquivo ou base64 do ícone (data URL p/ uploads/crop)
    let iconPath = null;
    if (b.icone_base64 && typeof b.icone_base64 === 'string' && b.icone_base64.startsWith('data:image')) {
      iconPath = cleanIconDataUrl(b.icone_base64);
    } else if (req.files && req.files['animal_icone'] && req.files['animal_icone'].length > 0) {
      iconPath = fileToDataUrl(req.files['animal_icone'][0]);
    } else if (b.icone) {
      iconPath = b.icone;
    }

    // Fallback: se não enviou ícone próprio, usa a primeira imagem como ícone do marcador
    if (!iconPath && imgPath) iconPath = imgPath;

    let obsText = b.obs || '';
    if (b.area_polygon_json && typeof b.area_polygon_json === 'string' && b.area_polygon_json.trim().length > 0) {
      obsText = `${obsText} [[POLYGON_DATA]]${b.area_polygon_json.trim()}`;
    }

    const animal = await prisma.api_animal.create({
      data: {
        nome_comum: b.nome_comum || 'Novo Animal',
        nome_cientifico: b.nome_cientifico || `Espécie ${Date.now()}`,
        classe: b.classe || null,
        familia: b.familia || null,
        peso: b.peso ? parseFloat(b.peso) : null,
        altura: b.altura ? parseFloat(b.altura) : null,
        dieta: b.dieta || null,
        habitos: b.habitos || null,
        obs: obsText || null,
        nivel_extincao_id: nivelExtincaoId,
        created_at: now,
        updated_at: now
      }
    });

    // 3. Salvar imagens enviadas na tabela api_animalimagem
    if (req.files && req.files['animal_imagem'] && req.files['animal_imagem'].length > 0) {
      const imgCreates = [];
      for (let i = 0; i < req.files['animal_imagem'].length; i++) {
        const dataUrl = fileToDataUrl(req.files['animal_imagem'][i]);
        if (!dataUrl) continue;
        imgCreates.push(prisma.api_animalimagem.create({
          data: {
            animal_id: animal.id,
            imagem: dataUrl,
            legenda: b.nome_comum || '',
            ordem: i + 1
          }
        }));
      }
      await Promise.all(imgCreates);
    } else if (imgPath) {
      await prisma.api_animalimagem.create({
        data: {
          animal_id: animal.id,
          imagem: imgPath,
          legenda: b.nome_comum || '',
          ordem: 1
        }
      });
    }

    // 4. Mapear biomas selecionados
    if (b.biomas_ids) {
      const biomasArr = Array.isArray(b.biomas_ids) ? b.biomas_ids : [b.biomas_ids];
      await Promise.all(biomasArr.filter(Boolean).map(biomaId =>
        prisma.api_animal_biomas.create({
          data: {
            animal_id: animal.id,
            bioma_id: BigInt(biomaId)
          }
        })
      ));
    }

    // 5. Criar Marcador(es) Geográfico(s) no PostGIS
    let coordsList = [];
    if (b.coordenadas_json) {
      try {
        coordsList = JSON.parse(b.coordenadas_json);
      } catch (e) {
        console.error("Error parsing coordenadas_json:", e);
      }
    }
    if (!Array.isArray(coordsList) || coordsList.length === 0) {
      let lat = parseFloat(b.lat);
      let lng = parseFloat(b.lng);
      if (isNaN(lat) || isNaN(lng)) {
        lat = -27.59;
        lng = -48.54;
      }
      coordsList = [{ lat, lng }];
    }

    const iconVal = iconPath || imgPath || '/assets/img/logotipo.png';
    for (const c of coordsList) {
      let cLat = parseFloat(c.lat);
      let cLng = parseFloat(c.lng);
      if (!isNaN(cLat) && !isNaN(cLng)) {
        await prisma.$executeRaw`
          INSERT INTO public.api_marcador (animal_id, location, icone, created_at)
          VALUES (${animal.id}, ST_SetSRID(ST_MakePoint(${cLng}, ${cLat}), 4326), ${iconVal}, NOW());
        `;
      }
    }

    res.status(201).json({ success: true, data: serialize(animal) });
  } catch (err) {
    console.error('Error creating animal:', err);
    const friendlyError = formatPrismaError(err);
    res.status(500).json({ success: false, error: friendlyError, message: friendlyError });
  }
});

// PATCH /api/v1/animais/:id/ (Edição)
router.patch('/animais/:id/', uploadFieldsSafe, async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const b = req.body;
    const now = new Date();

    // Status atual (para detectar mudança e disparar alertas por e-mail).
    let oldNivelId = null;
    try {
      const before = await prisma.api_animal.findUnique({ where: { id }, select: { nivel_extincao_id: true } });
      if (before && before.nivel_extincao_id != null) oldNivelId = String(before.nivel_extincao_id);
    } catch (e) {}

    let imgPath = null;
    if (req.files && req.files['animal_imagem'] && req.files['animal_imagem'].length > 0) {
      imgPath = fileToDataUrl(req.files['animal_imagem'][0]);
    } else if (b.imagem_url && b.imagem_url.trim().length > 0) {
      imgPath = b.imagem_url.trim();
    }

    let iconPath = null;
    if (b.icone_base64 && typeof b.icone_base64 === 'string' && b.icone_base64.startsWith('data:image')) {
      iconPath = cleanIconDataUrl(b.icone_base64);
    } else if (req.files && req.files['animal_icone'] && req.files['animal_icone'].length > 0) {
      iconPath = fileToDataUrl(req.files['animal_icone'][0]);
    } else if (b.icone) {
      iconPath = b.icone;
    }

    if (!iconPath && imgPath) iconPath = imgPath;

    const updateData = { updated_at: now };
    if (b.nome_comum) updateData.nome_comum = b.nome_comum;
    if (b.nome_cientifico) updateData.nome_cientifico = b.nome_cientifico;
    if (b.classe) updateData.classe = b.classe;
    if (b.familia) updateData.familia = b.familia;
    if (b.peso !== undefined && b.peso !== '') updateData.peso = parseFloat(b.peso);
    if (b.altura !== undefined && b.altura !== '') updateData.altura = parseFloat(b.altura);
    if (b.dieta) updateData.dieta = b.dieta;
    if (b.habitos) updateData.habitos = b.habitos;
    if (b.obs !== undefined || b.area_polygon_json !== undefined) {
      // Quando o form não envia mais `obs` (campo único Descrição/Curiosidade),
      // preserva o texto existente em vez de apagar — só troca o polígono.
      let obsBase = null;
      if (b.obs !== undefined) {
        obsBase = b.obs || '';
        if (typeof obsBase === 'string' && obsBase.includes('[[POLYGON_DATA]]')) {
          obsBase = obsBase.split('[[POLYGON_DATA]]')[0].trim();
        }
      } else {
        try {
          const current = await prisma.api_animal.findUnique({ where: { id }, select: { obs: true } });
          const curObs = current && current.obs ? current.obs : '';
          obsBase = typeof curObs === 'string' && curObs.includes('[[POLYGON_DATA]]')
            ? curObs.split('[[POLYGON_DATA]]')[0].trim()
            : (curObs || '');
        } catch (e) {
          obsBase = '';
        }
      }
      if (b.area_polygon_json !== undefined) {
        if (b.area_polygon_json && typeof b.area_polygon_json === 'string' && b.area_polygon_json.trim().length > 0) {
          obsBase = `${obsBase} [[POLYGON_DATA]]${b.area_polygon_json.trim()}`.trim();
        }
        // area_polygon_json === '' significa "Limpar área": mantém só o texto.
      } else if (b.obs !== undefined && typeof b.obs === 'string' && b.obs.includes('[[POLYGON_DATA]]')) {
        obsBase = b.obs;
      }
      updateData.obs = (obsBase && obsBase.trim().length > 0) ? obsBase.trim() : null;
    }
    if (b.nivel_extincao_id) updateData.nivel_extincao_id = BigInt(b.nivel_extincao_id);

    const animal = await prisma.api_animal.update({
      where: { id: id },
      data: updateData
    });

    if (req.files && req.files['animal_imagem'] && req.files['animal_imagem'].length > 0) {
      await prisma.api_animalimagem.deleteMany({ where: { animal_id: id } });
      const imgCreates = [];
      for (let i = 0; i < req.files['animal_imagem'].length; i++) {
        const dataUrl = fileToDataUrl(req.files['animal_imagem'][i]);
        if (!dataUrl) continue;
        imgCreates.push(prisma.api_animalimagem.create({
          data: {
            animal_id: id,
            imagem: dataUrl,
            legenda: animal.nome_comum || '',
            ordem: i + 1
          }
        }));
      }
      await Promise.all(imgCreates);
    } else if (imgPath) {
      await prisma.api_animalimagem.deleteMany({ where: { animal_id: id } });
      await prisma.api_animalimagem.create({
        data: {
          animal_id: id,
          imagem: imgPath,
          legenda: animal.nome_comum || '',
          ordem: 1
        }
      });
    }

    if (b.biomas_ids) {
      await prisma.api_animal_biomas.deleteMany({ where: { animal_id: id } });
      const biomasArr = Array.isArray(b.biomas_ids) ? b.biomas_ids : [b.biomas_ids];
      await Promise.all(biomasArr.filter(Boolean).map(biomaId =>
        prisma.api_animal_biomas.create({
          data: {
            animal_id: id,
            bioma_id: BigInt(biomaId)
          }
        })
      ));
    }

    // Atualizar posição(ões) e ícone dos marcadores no PostGIS
    let coordsList = [];
    if (b.coordenadas_json) {
      try {
        coordsList = JSON.parse(b.coordenadas_json);
      } catch (e) {
        console.error("Error parsing coordenadas_json:", e);
      }
    }

    // Preservar o ícone atual quando a edição não envia um novo: sem isso
    // o marcador era recriado com a logotipo e o ícone "sumia" a cada edição.
    let existingIcon = null;
    try {
      const existingForIcon = await prisma.api_marcador.findFirst({
        where: { animal_id: id },
        select: { icone: true }
      });
      if (existingForIcon && existingForIcon.icone) existingIcon = existingForIcon.icone;
    } catch (e) {}

    const iconVal = iconPath || imgPath || existingIcon || '/assets/img/logotipo.png';

    if (Array.isArray(coordsList) && coordsList.length > 0) {
      await prisma.api_marcador.deleteMany({ where: { animal_id: id } });
      for (const c of coordsList) {
        let cLat = parseFloat(c.lat);
        let cLng = parseFloat(c.lng);
        if (!isNaN(cLat) && !isNaN(cLng)) {
          await prisma.$executeRaw`
            INSERT INTO public.api_marcador (animal_id, location, icone, created_at)
            VALUES (${id}, ST_SetSRID(ST_MakePoint(${cLng}, ${cLat}), 4326), ${iconVal}, NOW());
          `;
        }
      }
    } else {
      const lat = parseFloat(b.lat);
      const lng = parseFloat(b.lng);
      const hasCoords = !isNaN(lat) && !isNaN(lng);

      const existingMarker = await prisma.api_marcador.findFirst({ where: { animal_id: id } });
      if (existingMarker) {
        if (hasCoords && iconPath) {
          await prisma.$executeRaw`
            UPDATE public.api_marcador 
            SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), icone = ${iconPath} 
            WHERE animal_id = ${id};
          `;
        } else if (hasCoords) {
          await prisma.$executeRaw`
            UPDATE public.api_marcador 
            SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326) 
            WHERE animal_id = ${id};
          `;
        } else if (iconPath) {
          await prisma.$executeRaw`
            UPDATE public.api_marcador 
            SET icone = ${iconPath} 
            WHERE animal_id = ${id};
          `;
        }
      } else if (hasCoords || iconPath) {
        const coordLat = hasCoords ? lat : -27.59;
        const coordLng = hasCoords ? lng : -48.54;
        await prisma.$executeRaw`
          INSERT INTO public.api_marcador (animal_id, location, icone, created_at)
          VALUES (${id}, ST_SetSRID(ST_MakePoint(${coordLng}, ${coordLat}), 4326), ${iconVal}, NOW());
        `;
      }
    }

    res.json({ success: true, data: serialize(animal) });

    // Pós-resposta: se o status de conservação mudou, avisa os assinantes.
    if (b.nivel_extincao_id) {
      dispatchStatusChange(id, oldNivelId, String(b.nivel_extincao_id));
    }
  } catch (err) {
    console.error('Error updating animal:', err);
    const friendlyError = formatPrismaError(err);
    res.status(500).json({ success: false, error: friendlyError, message: friendlyError });
  }
});

// DELETE /api/v1/animais/:id/ (Exclusão de Animal)
router.delete('/animais/:id/', async (req, res) => {
  try {
    const id = BigInt(req.params.id);

    // Excluir marcadores do animal
    await prisma.api_marcador.deleteMany({
      where: { animal_id: id }
    });

    // Excluir biomas do animal
    await prisma.api_animal_biomas.deleteMany({
      where: { animal_id: id }
    });

    // Excluir imagens do animal
    await prisma.api_animalimagem.deleteMany({
      where: { animal_id: id }
    });

    // Soft delete do registro do animal
    await prisma.api_animal.update({
      where: { id: id },
      data: { deleted_at: new Date() }
    });

    // Interrompe alertas de status pendentes do animal excluído
    try {
      await prisma.api_alerta_status.updateMany({
        where: { animal_id: id },
        data: { ativo: false, updated_at: new Date() }
      });
    } catch (e) {}

    res.json({ success: true, message: 'Animal excluído com sucesso!' });
  } catch (err) {
    console.error('Error deleting animal:', err);
    const friendlyError = formatPrismaError(err);
    res.status(500).json({ success: false, error: friendlyError, message: friendlyError });
  }
});

// DELETE /api/v1/ongs/:id/ (Exclusão de ONG)
router.delete('/ongs/:id/', async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    await prisma.api_ong.delete({
      where: { id: id }
    });
    res.json({ success: true, message: 'Instituição excluída com sucesso!' });
  } catch (err) {
    console.error('Error deleting ONG:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/zonas-preservacao/:id/ (Exclusão de Zona de Preservação)
router.delete('/zonas-preservacao/:id/', async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    await prisma.api_zonapreservacao.delete({
      where: { id: id }
    });
    res.json({ success: true, message: 'Zona de Preservação excluída com sucesso!' });
  } catch (err) {
    console.error('Error deleting zona de preservacao:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ONGs e Zonas de Preservação — listagem GeoJSON + criação (Prisma + PostGIS).
// Usados pelo mapa principal: toggles de camadas do menu flutuante, labels
// das zonas sobre os polígonos e modais de cadastro no padrão da tela de
// animais. Mantêm as mesmas validações dos formulários (nome obrigatório).
// ============================================================================

// Delimitador para guardar a cor de exibição da zona dentro de `descricao`
// (o modelo api_zonapreservacao não tem coluna de cor). Mesmo padrão do
// [[POLYGON_DATA]] usado em api_animal.obs.
const ZONA_STYLE_DELIM = '[[ZONA_STYLE]]';
const ZONA_DEFAULT_COLOR = '#287f5e';

function splitZonaStyle(descricao) {
  if (!descricao || typeof descricao !== 'string' || !descricao.includes(ZONA_STYLE_DELIM)) {
    return { text: descricao || null, color: ZONA_DEFAULT_COLOR };
  }
  const parts = descricao.split(ZONA_STYLE_DELIM);
  let color = ZONA_DEFAULT_COLOR;
  try {
    const parsed = JSON.parse((parts[1] || '').trim());
    if (parsed && /^#[0-9a-fA-F]{6}$/.test(parsed.color || '')) color = parsed.color;
  } catch (e) {}
  const text = (parts[0] || '').trim();
  return { text: text.length > 0 ? text : null, color };
}

// Constrói WKT MULTIPOLYGON a partir de anéis no formato Leaflet [[lat,lng]].
// Só interpola números validados (parseFloat + isNaN), nunca texto cru.
function buildMultiPolygonWKT(rings) {
  const polys = [];
  for (const ring of rings || []) {
    if (!Array.isArray(ring)) continue;
    const pts = [];
    for (const pt of ring) {
      if (!Array.isArray(pt)) continue;
      const lat = parseFloat(pt[0]);
      const lng = parseFloat(pt[1]);
      if (isNaN(lat) || isNaN(lng)) continue;
      pts.push([lng, lat]);
    }
    if (pts.length < 3) continue;
    const f = pts[0];
    const l = pts[pts.length - 1];
    if (f[0] !== l[0] || f[1] !== l[1]) pts.push([f[0], f[1]]);
    polys.push('((' + pts.map(p => p[0] + ' ' + p[1]).join(',') + '))');
  }
  if (polys.length === 0) return null;
  return 'MULTIPOLYGON(' + polys.join(',') + ')';
}

// Extrai anéis válidos do payload area_polygon_json (aceita {polygons} ou array).
function parseZonaRings(payload) {
  let raw = payload;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (e) { return []; }
  }
  let rings = null;
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.polygons) {
    rings = raw.polygons;
  } else if (Array.isArray(raw)) {
    rings = raw;
  }
  if (!rings) return [];
  const norm = (Array.isArray(rings[0]) && Array.isArray(rings[0][0])) ? rings : [rings];
  return norm.filter(r => Array.isArray(r) && r.length >= 3);
}

const normStr = (v) => (v === undefined || v === null || String(v).trim() === '') ? null : String(v);

// GET /api/v1/ongs/ (lista ONGs como GeoJSON para a camada do mapa)
router.get('/ongs/', async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT id, nome, descricao, email, telefone, site, endereco,
             ST_AsGeoJSON(location) AS geom
      FROM api_ong
      WHERE deleted_at IS NULL
      ORDER BY nome ASC
      LIMIT 2000
    `;
    const features = [];
    for (const r of rows) {
      let geometry = null;
      try { geometry = JSON.parse(r.geom); } catch (e) {}
      if (!geometry) continue;
      features.push({
        type: 'Feature',
        geometry,
        properties: {
          id: r.id.toString(),
          nome: r.nome,
          descricao: r.descricao,
          email: r.email,
          telefone: r.telefone,
          site: r.site,
          endereco: r.endereco
        }
      });
    }
    res.json({ success: true, data: serialize({ type: 'FeatureCollection', features }) });
  } catch (err) {
    console.error('Error fetching ongs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/ongs/ (cria ONG — mesmas validações do formulário: nome + ponto)
router.post('/ongs/', async (req, res) => {
  try {
    const b = req.body || {};
    const nome = (b.nome || '').trim();
    const lat = parseFloat(b.lat);
    const lng = parseFloat(b.lng);
    if (!nome) return res.status(400).json({ success: false, error: 'Nome da Instituição é obrigatório.' });
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ success: false, error: 'Coordenadas inválidas.' });
    const rows = await prisma.$queryRaw`
      INSERT INTO api_ong (nome, descricao, email, telefone, site, endereco, location, created_at, updated_at)
      VALUES (${nome}, ${normStr(b.descricao)}, ${normStr(b.email)}, ${normStr(b.telefone)}, ${normStr(b.site)}, ${normStr(b.endereco)},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), NOW(), NOW())
      RETURNING id
    `;
    res.status(201).json({ success: true, data: serialize({ id: rows[0].id }), message: 'Instituição cadastrada com sucesso!' });
  } catch (err) {
    console.error('Error creating ong:', err);
    res.status(500).json({ success: false, error: formatPrismaError(err) });
  }
});

// GET /api/v1/zonas-preservacao/ (lista zonas como GeoJSON para a camada do mapa)
router.get('/zonas-preservacao/', async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT id, nome, descricao, categoria,
             ST_AsGeoJSON(area) AS geom
      FROM api_zonapreservacao
      WHERE deleted_at IS NULL
      ORDER BY nome ASC
      LIMIT 2000
    `;
    const features = [];
    for (const r of rows) {
      let geometry = null;
      try { geometry = JSON.parse(r.geom); } catch (e) {}
      if (!geometry) continue;
      const style = splitZonaStyle(r.descricao);
      features.push({
        type: 'Feature',
        geometry,
        properties: {
          id: r.id.toString(),
          nome: r.nome,
          descricao: style.text,
          categoria: r.categoria,
          color: style.color
        }
      });
    }
    res.json({ success: true, data: serialize({ type: 'FeatureCollection', features }) });
  } catch (err) {
    console.error('Error fetching zonas:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/zonas-preservacao/ (cria zona — polígono OBRIGATÓRIO,
// desenhado no modal igual às áreas dos animais: mín. 3 pontos)
router.post('/zonas-preservacao/', async (req, res) => {
  try {
    const b = req.body || {};
    const nome = (b.nome || '').trim();
    const lat = parseFloat(b.lat);
    const lng = parseFloat(b.lng);
    if (!nome) return res.status(400).json({ success: false, error: 'Nome da área é obrigatório.' });
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ success: false, error: 'Coordenadas inválidas.' });

    const rings = parseZonaRings(b.area_polygon_json);
    if (rings.length === 0) {
      return res.status(400).json({ success: false, error: 'Desenhe a área no mapa antes de salvar (mínimo 3 pontos).' });
    }
    const wkt = buildMultiPolygonWKT(rings);
    if (!wkt) return res.status(400).json({ success: false, error: 'Polígono inválido. Desenhe ao menos 3 pontos.' });

    let descricao = normStr(b.descricao);
    if (b.color && /^#[0-9a-fA-F]{6}$/.test(String(b.color))) {
      const payload = ZONA_STYLE_DELIM + JSON.stringify({ color: String(b.color) });
      descricao = (descricao ? descricao + ' ' : '') + payload;
    }

    const rows = await prisma.$queryRaw`
      INSERT INTO api_zonapreservacao (nome, descricao, categoria, area, created_at, updated_at)
      VALUES (${nome}, ${descricao}, ${normStr(b.categoria)}, ST_GeomFromText(${wkt}, 4326), NOW(), NOW())
      RETURNING id
    `;
    res.status(201).json({ success: true, data: serialize({ id: rows[0].id }), message: 'Área de preservação criada com sucesso!' });
  } catch (err) {
    console.error('Error creating zona:', err);
    res.status(500).json({ success: false, error: formatPrismaError(err) });
  }
});

// PUT /api/v1/zonas-preservacao/:id/ (atualiza zona — polígono continua obrigatório)
router.put('/zonas-preservacao/:id/', async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const b = req.body || {};
    const nome = (b.nome || '').trim();
    if (!nome) return res.status(400).json({ success: false, error: 'Nome da área é obrigatório.' });
    const rings = parseZonaRings(b.area_polygon_json);
    if (rings.length === 0) {
      return res.status(400).json({ success: false, error: 'Desenhe a área no mapa antes de salvar (mínimo 3 pontos).' });
    }
    const wkt = buildMultiPolygonWKT(rings);
    if (!wkt) return res.status(400).json({ success: false, error: 'Polígono inválido. Desenhe ao menos 3 pontos.' });
    let descricao = normStr(b.descricao);
    // Remove eventual delimitador antigo e grava a cor atual (igual ao POST).
    if (descricao && descricao.includes(ZONA_STYLE_DELIM)) {
      descricao = splitZonaStyle(descricao).text;
    }
    if (b.color && /^#[0-9a-fA-F]{6}$/.test(String(b.color))) {
      const payload = ZONA_STYLE_DELIM + JSON.stringify({ color: String(b.color) });
      descricao = (descricao ? descricao + ' ' : '') + payload;
    }
    await prisma.$queryRaw`
      UPDATE api_zonapreservacao
      SET nome = ${nome}, descricao = ${descricao}, categoria = ${normStr(b.categoria)},
          area = ST_GeomFromText(${wkt}, 4326), updated_at = NOW()
      WHERE id = ${id}
    `;
    res.json({ success: true, message: 'Área de preservação atualizada com sucesso!' });
  } catch (err) {
    console.error('Error updating zona:', err);
    res.status(500).json({ success: false, error: formatPrismaError(err) });
  }
});

// PUT /api/v1/ongs/:id/ (atualiza ONG)
router.put('/ongs/:id/', async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const b = req.body || {};
    const nome = (b.nome || '').trim();
    if (!nome) return res.status(400).json({ success: false, error: 'Nome da Instituição é obrigatório.' });
    const lat = parseFloat(b.lat);
    const lng = parseFloat(b.lng);
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ success: false, error: 'Coordenadas inválidas.' });
    await prisma.$queryRaw`
      UPDATE api_ong
      SET nome = ${nome}, descricao = ${normStr(b.descricao)}, email = ${normStr(b.email)},
          telefone = ${normStr(b.telefone)}, site = ${normStr(b.site)}, endereco = ${normStr(b.endereco)},
          location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), updated_at = NOW()
      WHERE id = ${id}
    `;
    res.json({ success: true, message: 'Instituição atualizada com sucesso!' });
  } catch (err) {
    console.error('Error updating ONG:', err);
    res.status(500).json({ success: false, error: formatPrismaError(err) });
  }
});

// POST /api/v1/notificacoes/ (ativa/atualiza assinatura de alerta de status)
// Body: { animal_id, email, ativo=true }. Por espécie e por e-mail.
router.post('/notificacoes/', async (req, res) => {
  try {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const animalId = b.animal_id != null ? BigInt(b.animal_id) : null;
    if (!animalId) return res.status(400).json({ success: false, error: 'Animal inválido.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, error: 'E-mail inválido.' });
    const ativo = b.ativo === undefined ? true : !!b.ativo;
    await prisma.api_alerta_status.upsert({
      where: { animal_id_email: { animal_id: animalId, email } },
      update: { ativo, updated_at: new Date() },
      create: { animal_id: animalId, email, ativo }
    });
    res.json({ success: true, message: ativo ? 'Notificação ativada!' : 'Notificação desativada.' });
  } catch (err) {
    console.error('Error saving notificacao:', err);
    res.status(500).json({ success: false, error: formatPrismaError(err) });
  }
});

// DELETE /api/v1/notificacoes/ (desativa assinatura — ex: ao desfavoritar)
// Body: { animal_id, email }. Interrompe o envio imediatamente.
router.delete('/notificacoes/', async (req, res) => {
  try {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const animalId = b.animal_id != null ? BigInt(b.animal_id) : null;
    if (!animalId || !email) return res.status(400).json({ success: false, error: 'Parâmetros inválidos.' });
    await prisma.api_alerta_status.updateMany({
      where: { animal_id: animalId, email },
      data: { ativo: false, updated_at: new Date() }
    });
    res.json({ success: true, message: 'Notificação desativada.' });
  } catch (err) {
    console.error('Error deleting notificacao:', err);
    res.status(500).json({ success: false, error: formatPrismaError(err) });
  }
});

// Exportados para teste unitário (node -e). Não altera o comportamento do router.
router.buildMultiPolygonWKT = buildMultiPolygonWKT;
router.parseZonaRings = parseZonaRings;
router.splitZonaStyle = splitZonaStyle;

// POST /api/v1/animais/import-salve (Importação de Planilha do SALVE)
const { importSalveCSV } = require('../services/salveImporter');
const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.post('/animais/import-salve', uploadCSV.single('csv_file'), async (req, res) => {
  const isStream = req.query.stream === 'true' || req.headers['x-stream'] === 'true' || req.headers.accept?.includes('text/event-stream');

  if (isStream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.flushHeaders) res.flushHeaders();
  }

  const sendEvent = (event, data) => {
    if (isStream) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    }
  };

  try {
    let csvContent = '';
    if (req.file && req.file.buffer) {
      csvContent = req.file.buffer.toString('utf-8');
      if (csvContent.includes('\uFFFD')) {
        csvContent = req.file.buffer.toString('latin1');
      }
    } else if (req.body && req.body.csv_text) {
      csvContent = req.body.csv_text;
    } else {
      if (isStream) {
        sendEvent('error', { success: false, message: 'Nenhum arquivo CSV ou texto foi enviado para importação.' });
        return res.end();
      }
      return res.status(400).json({ success: false, message: 'Nenhum arquivo CSV ou texto foi enviado para importação.' });
    }

    const autoImages = req.body.auto_images !== 'false' && req.body.auto_images !== false;
    const maxRows = parseInt(req.body.max_rows) || 5000;

    const result = await importSalveCSV(csvContent, { autoImages, maxRows }, (progress) => {
      sendEvent('progress', progress);
    });

    const successMessage = `Importação concluída com sucesso! ${result.inserted} adicionados, ${result.updated} atualizados.`;

    if (isStream) {
      sendEvent('done', {
        success: true,
        message: successMessage,
        data: result
      });
      return res.end();
    }

    res.json({
      success: true,
      message: successMessage,
      data: result
    });
  } catch (err) {
    console.error('Erro na importação SALVE:', err);
    if (isStream) {
      sendEvent('error', { success: false, error: err.message, message: `Erro ao importar planilha: ${err.message}` });
      return res.end();
    }
    res.status(500).json({ success: false, error: err.message, message: `Erro ao importar planilha: ${err.message}` });
  }
});

module.exports = router;
