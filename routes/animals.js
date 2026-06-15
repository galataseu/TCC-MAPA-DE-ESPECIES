const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* GET animals listing. */
router.get('/', async (req, res) => {
  try {
    const animals = await prisma.api_animal.findMany({
      include: {
        api_nivelextincao: true,
        api_niveldestruicao: true
      },
      orderBy: {
        nome_comum: 'asc'
      }
    });
    
    // Serializar BigInt para String (Prisma retorna BigInt para campos do tipo BigInt)
    const serializedAnimals = JSON.parse(JSON.stringify(animals, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    res.json(serializedAnimals);
  } catch (error) {
    console.error('Erro ao buscar animais:', error);
    res.status(500).json({ error: 'Erro ao buscar animais' });
  }
});

module.exports = router;
