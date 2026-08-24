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
        },
        api_animalimagem: true,
        api_marcador: true
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
      
      let imgs = [];
      if (animal.api_animalimagem && animal.api_animalimagem.length > 0) {
        imgs = animal.api_animalimagem.map((imgObj, i) => {
          const raw = imgObj.imagem;
          let u = '/assets/img/logotipo.png';
          if (raw && typeof raw === 'string' && raw.trim().length > 0) {
            const t = raw.trim();
            if (t.startsWith('http') || t.startsWith('/') || t.startsWith('data:')) u = t;
            else if (t.includes('.')) u = `/media/${t}`;
          }
          return { id: i + 1, imagem: u, legenda: animal.nome_comum, ordem: i + 1 };
        });
      } else if (animal.imagem) {
        const raw = animal.imagem;
        let u = '/assets/img/logotipo.png';
        if (raw && typeof raw === 'string' && raw.trim().length > 0) {
          const t = raw.trim();
          if (t.startsWith('http') || t.startsWith('/') || t.startsWith('data:')) u = t;
          else if (t.includes('.')) u = `/media/${t}`;
        }
        imgs = [{ id: 1, imagem: u, legenda: animal.nome_comum, ordem: 1 }];
      } else {
        imgs = [{ id: 1, imagem: '/assets/img/logotipo.png', legenda: animal.nome_comum, ordem: 1 }];
      }

      let iconeUrl = imgs.length > 0 ? imgs[0].imagem : '/assets/img/logotipo.png';
      if (animal.api_marcador && animal.api_marcador.length > 0 && animal.api_marcador[0].icone) {
        const rawIcon = animal.api_marcador[0].icone;
        if (rawIcon && typeof rawIcon === 'string' && rawIcon.trim().length > 0) {
          const ic = rawIcon.trim();
          if (ic.startsWith('http') || ic.startsWith('/') || ic.startsWith('data:')) {
            iconeUrl = ic;
          } else if (ic.includes('.')) {
            iconeUrl = `/media/${ic}`;
          }
        }
      }

      obj.imagens = imgs;
      obj.icone = iconeUrl;
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
