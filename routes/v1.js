const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
        }
      },
      orderBy: { nome_comum: 'asc' }
    });
    res.json({ success: true, data: serialize(animais) });
  } catch (err) {
    console.error('Error fetching animais:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
