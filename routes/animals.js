const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* GET animals listing. */
router.get('/', async (req, res) => {
  try {
    const animals = await prisma.api_animal.findMany({
      where: {
        deleted_at: null
      },
      include: {
        api_nivelextincao: true,
        api_niveldestruicao: true,
        api_animal_biomas: {
          include: {
            api_bioma: true
          }
        }
      },
      orderBy: {
        nome_comum: 'asc'
      }
    });

    // Serializar BigInt e formatar URLs das imagens
    const serializedAnimals = animals.map(animal => {
      const obj = JSON.parse(JSON.stringify(animal, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
      
      // Mapear a imagem única para o campo 'imagens' esperado pelo front
      obj.imagens = animal.imagem ? [{
        id: 1,
        imagem: animal.imagem.startsWith('http') ? animal.imagem : `http://localhost:8000/media/${animal.imagem}`,
        legenda: animal.nome_comum,
        ordem: 1
      }] : [];

      // Mapear biomas
      obj.biomas = (obj.api_animal_biomas || []).map(b => b.api_bioma);
      
      return obj;
    });

    res.json(serializedAnimals);
  } catch (error) {
    console.error('Erro ao buscar animais:', error);
    res.status(500).json({ error: 'Erro ao buscar animais' });
  }
});

module.exports = router;
