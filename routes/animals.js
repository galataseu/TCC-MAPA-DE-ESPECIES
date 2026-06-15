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
        api_animalimagem: true,
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

    console.log('--- RAW DATA FROM PRISMA ---');
    console.log(JSON.stringify(animals, null, 2));
    console.log('----------------------------');
    
    // Serializar BigInt e formatar URLs das imagens
    const serializedAnimals = animals.map(animal => {
      const obj = JSON.parse(JSON.stringify(animal, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
      
      // Mapear todas as imagens para o campo 'imagens' esperado pelo front
      obj.imagens = (obj.api_animalimagem || []).map(img => {
        return {
          id: img.id,
          imagem: img.imagem.startsWith('http') ? img.imagem : `http://localhost:8000/media/${img.imagem}`,
          legenda: img.legenda,
          ordem: img.ordem
        };
      });

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
