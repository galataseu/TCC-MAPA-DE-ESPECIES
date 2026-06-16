const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* GET markers listing as GeoJSON. */
router.get('/', async (req, res) => {
  try {
    // Fetch markers with animal info using raw query to get GeoJSON from PostGIS
    const markers = await prisma.$queryRaw`
      SELECT 
        m.id,
        ST_AsGeoJSON(m.location) as geometry_str,
        m.icone,
        m.animal_id,
        a.nome_comum,
        a.nome_cientifico,
        a.classe,
        a.familia,
        a.dieta,
        a.habitos,
        a.altura,
        a.peso,
        a.imagem as imagem_unica,
        n.nome as nivel_extincao,
        n.sigla as nivel_sigla,
        (
          SELECT json_agg(json_build_object('id', b.id, 'nome', b.nome))
          FROM api_animal_biomas ab
          JOIN api_bioma b ON ab.bioma_id = b.id
          WHERE ab.animal_id = a.id
        ) as biomas
      FROM api_marcador m
      JOIN api_animal a ON m.animal_id = a.id
      JOIN api_nivelextincao n ON a.nivel_extincao_id = n.id
      WHERE a.deleted_at IS NULL
    `;

    const featureCollection = {
      type: 'FeatureCollection',
      features: markers.map(m => {
        let geometry = {};
        try {
          geometry = JSON.parse(m.geometry_str);
        } catch (e) {
          console.error("Error parsing geometry:", e);
        }

        return {
          type: 'Feature',
          geometry: geometry,
          properties: {
            id: m.id.toString(),
            animal_id: m.animal_id.toString(),
            nome_comum: m.nome_comum,
            nome_cientifico: m.nome_cientifico,
            classe: m.classe,
            familia: m.familia,
            dieta: m.dieta,
            habitos: m.habitos,
            altura: m.altura,
            peso: m.peso,
            nivel_extincao: m.nivel_extincao,
            nivel_sigla: m.nivel_sigla,
            icone: m.icone,
            biomas: m.biomas || [],
            imagens: m.imagem_unica ? [{
              id: 1,
              imagem: m.imagem_unica.startsWith('http') ? m.imagem_unica : `http://localhost:8000/media/${m.imagem_unica}`
            }] : []
          }
        };
      })
    };

    res.json(featureCollection);
  } catch (error) {
    console.error('Erro ao buscar marcadores:', error);
    res.status(500).json({ error: 'Erro ao buscar marcadores' });
  }
});

module.exports = router;
