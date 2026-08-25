const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'public', 'media');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

const serialize = (obj) => JSON.parse(JSON.stringify(obj, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
));

// Helper para salvar imagem em base64 (crop de ícone)
function saveBase64Image(dataString, prefix = 'icon') {
  if (!dataString || typeof dataString !== 'string' || !dataString.startsWith('data:image')) {
    return null;
  }
  const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

  const ext = matches[1].includes('jpeg') ? '.jpg' : '.png';
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
  const dir = path.join(__dirname, '..', 'public', 'media');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/media/${filename}`;
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
router.post('/animais/', uploadFields, async (req, res) => {
  try {
    const b = req.body;
    const now = new Date();

    const nivelExtincaoId = b.nivel_extincao_id ? BigInt(b.nivel_extincao_id) : 1n;
    
    // 1. Capturar arquivo ou URL da imagem principal
    let imgPath = null;
    if (req.files && req.files['animal_imagem'] && req.files['animal_imagem'].length > 0) {
      imgPath = `/media/${req.files['animal_imagem'][0].filename}`;
    } else if (b.imagem_url && b.imagem_url.trim().length > 0) {
      imgPath = b.imagem_url.trim();
    } else if (b.imagem) {
      imgPath = b.imagem;
    }

    // 2. Capturar arquivo ou base64 do ícone
    let iconPath = null;
    if (b.icone_base64 && typeof b.icone_base64 === 'string' && b.icone_base64.startsWith('data:image')) {
      iconPath = saveBase64Image(b.icone_base64, 'icon');
    } else if (req.files && req.files['animal_icone'] && req.files['animal_icone'].length > 0) {
      iconPath = `/media/${req.files['animal_icone'][0].filename}`;
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
      for (let i = 0; i < req.files['animal_imagem'].length; i++) {
        await prisma.api_animalimagem.create({
          data: {
            animal_id: animal.id,
            imagem: `/media/${req.files['animal_imagem'][i].filename}`,
            legenda: b.nome_comum || '',
            ordem: i + 1
          }
        });
      }
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
      for (const biomaId of biomasArr) {
        if (biomaId) {
          await prisma.api_animal_biomas.create({
            data: {
              animal_id: animal.id,
              bioma_id: BigInt(biomaId)
            }
          });
        }
      }
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
        await prisma.$executeRawUnsafe(`
          INSERT INTO public.api_marcador (animal_id, location, icone, created_at)
          VALUES (${animal.id}, ST_SetSRID(ST_MakePoint(${cLng}, ${cLat}), 4326), '${iconVal}', NOW());
        `);
      }
    }

    res.status(201).json({ success: true, data: serialize(animal) });
  } catch (err) {
    console.error('Error creating animal:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/animais/:id/ (Edição)
router.patch('/animais/:id/', uploadFields, async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const b = req.body;
    const now = new Date();

    let imgPath = null;
    if (req.files && req.files['animal_imagem'] && req.files['animal_imagem'].length > 0) {
      imgPath = `/media/${req.files['animal_imagem'][0].filename}`;
    } else if (b.imagem_url && b.imagem_url.trim().length > 0) {
      imgPath = b.imagem_url.trim();
    }

    let iconPath = null;
    if (b.icone_base64 && typeof b.icone_base64 === 'string' && b.icone_base64.startsWith('data:image')) {
      iconPath = saveBase64Image(b.icone_base64, 'icon');
    } else if (req.files && req.files['animal_icone'] && req.files['animal_icone'].length > 0) {
      iconPath = `/media/${req.files['animal_icone'][0].filename}`;
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
      let obsBase = b.obs !== undefined ? b.obs : '';
      if (b.area_polygon_json && typeof b.area_polygon_json === 'string' && b.area_polygon_json.trim().length > 0) {
        obsBase = `${obsBase} [[POLYGON_DATA]]${b.area_polygon_json.trim()}`;
      }
      updateData.obs = obsBase || null;
    }
    if (b.nivel_extincao_id) updateData.nivel_extincao_id = BigInt(b.nivel_extincao_id);

    const animal = await prisma.api_animal.update({
      where: { id: id },
      data: updateData
    });

    if (req.files && req.files['animal_imagem'] && req.files['animal_imagem'].length > 0) {
      await prisma.api_animalimagem.deleteMany({ where: { animal_id: id } });
      for (let i = 0; i < req.files['animal_imagem'].length; i++) {
        await prisma.api_animalimagem.create({
          data: {
            animal_id: id,
            imagem: `/media/${req.files['animal_imagem'][i].filename}`,
            legenda: animal.nome_comum || '',
            ordem: i + 1
          }
        });
      }
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
      for (const biomaId of biomasArr) {
        if (biomaId) {
          await prisma.api_animal_biomas.create({
            data: {
              animal_id: id,
              bioma_id: BigInt(biomaId)
            }
          });
        }
      }
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

    const iconVal = iconPath || imgPath || '/assets/img/logotipo.png';

    if (Array.isArray(coordsList) && coordsList.length > 0) {
      await prisma.api_marcador.deleteMany({ where: { animal_id: id } });
      for (const c of coordsList) {
        let cLat = parseFloat(c.lat);
        let cLng = parseFloat(c.lng);
        if (!isNaN(cLat) && !isNaN(cLng)) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO public.api_marcador (animal_id, location, icone, created_at)
            VALUES (${id}, ST_SetSRID(ST_MakePoint(${cLng}, ${cLat}), 4326), '${iconVal}', NOW());
          `);
        }
      }
    } else {
      const lat = parseFloat(b.lat);
      const lng = parseFloat(b.lng);
      const hasCoords = !isNaN(lat) && !isNaN(lng);

      const existingMarker = await prisma.api_marcador.findFirst({ where: { animal_id: id } });
      if (existingMarker) {
        let setClauses = [];
        if (hasCoords) {
          setClauses.push(`location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`);
        }
        if (iconPath) {
          setClauses.push(`icone = '${iconPath}'`);
        }
        if (setClauses.length > 0) {
          await prisma.$executeRawUnsafe(`UPDATE public.api_marcador SET ${setClauses.join(', ')} WHERE animal_id = ${id};`);
        }
      } else if (hasCoords || iconPath) {
        const coordLat = hasCoords ? lat : -27.59;
        const coordLng = hasCoords ? lng : -48.54;
        await prisma.$executeRawUnsafe(`
          INSERT INTO public.api_marcador (animal_id, location, icone, created_at)
          VALUES (${id}, ST_SetSRID(ST_MakePoint(${coordLng}, ${coordLat}), 4326), '${iconVal}', NOW());
        `);
      }
    }

    res.json({ success: true, data: serialize(animal) });
  } catch (err) {
    console.error('Error updating animal:', err);
    res.status(500).json({ success: false, error: err.message });
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

    res.json({ success: true, message: 'Animal excluído com sucesso!' });
  } catch (err) {
    console.error('Error deleting animal:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/ongs/:id/ (Exclusão de ONG)
router.delete('/ongs/:id/', async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    await prisma.api_ong.delete({
      where: { id: id }
    });
    res.json({ success: true, message: 'ONG excluída com sucesso!' });
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

module.exports = router;
