const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const upload = multer({ dest: path.join(__dirname, '..', 'public', 'media') });

const serialize = (obj) => JSON.parse(JSON.stringify(obj, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
));

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
        api_animalimagem: true
      },
      orderBy: { nome_comum: 'asc' }
    });
    res.json({ success: true, data: serialize(animais) });
  } catch (err) {
    console.error('Error fetching animais:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/animais/
router.post('/animais/', upload.single('animal_imagem'), async (req, res) => {
  try {
    const b = req.body;
    const now = new Date();

    const nivelExtincaoId = b.nivel_extincao_id ? BigInt(b.nivel_extincao_id) : 1n;
    const imgPath = (b.imagem_url && b.imagem_url.trim().length > 0)
      ? b.imagem_url.trim()
      : (req.file ? `/media/${req.file.filename}` : (b.imagem || null));

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
        obs: b.obs || null,
        nivel_extincao_id: nivelExtincaoId,
        created_at: now,
        updated_at: now
      }
    });

    if (imgPath) {
      await prisma.api_animalimagem.create({
        data: {
          animal_id: animal.id,
          imagem: imgPath,
          legenda: b.nome_comum || '',
          ordem: 1
        }
      });
    }

    // Mapear biomas selecionados
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

    // Criar Marcador Geográfico no PostGIS se lat e lng forem informados
    const lat = parseFloat(b.lat);
    const lng = parseFloat(b.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      const icon = `${(b.nome_comum || 'animal').toLowerCase().replace(/\s+/g, '-')}-icon`;
      await prisma.$executeRawUnsafe(`
        INSERT INTO public.api_marcador (animal_id, location, icone, created_at)
        VALUES (${animal.id}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), '${icon}', NOW());
      `);
    }

    res.status(201).json({ success: true, data: serialize(animal) });
  } catch (err) {
    console.error('Error creating animal:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/animais/:id/ (Edição)
router.patch('/animais/:id/', upload.single('animal_imagem'), async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const b = req.body;
    const now = new Date();

    const imgPath = (b.imagem_url && b.imagem_url.trim().length > 0)
      ? b.imagem_url.trim()
      : (req.file ? `/media/${req.file.filename}` : null);

    const updateData = { updated_at: now };
    if (b.nome_comum) updateData.nome_comum = b.nome_comum;
    if (b.nome_cientifico) updateData.nome_cientifico = b.nome_cientifico;
    if (b.classe) updateData.classe = b.classe;
    if (b.familia) updateData.familia = b.familia;
    if (b.peso) updateData.peso = parseFloat(b.peso);
    if (b.altura) updateData.altura = parseFloat(b.altura);
    if (b.dieta) updateData.dieta = b.dieta;
    if (b.habitos) updateData.habitos = b.habitos;
    if (b.obs) updateData.obs = b.obs;
    if (b.nivel_extincao_id) updateData.nivel_extincao_id = BigInt(b.nivel_extincao_id);

    const animal = await prisma.api_animal.update({
      where: { id: id },
      data: updateData
    });

    if (imgPath) {
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

    // Atualizar posição do marcador no PostGIS se lat/lng fornecidos
    const lat = parseFloat(b.lat);
    const lng = parseFloat(b.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      await prisma.$executeRawUnsafe(`
        UPDATE public.api_marcador 
        SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
        WHERE animal_id = ${id};
      `);
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
