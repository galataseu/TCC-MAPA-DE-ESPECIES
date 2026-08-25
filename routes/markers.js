const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/* GET markers listing as GeoJSON. */
router.get('/', async (req, res) => {
  try {
    // Fetch markers with animal info using raw query to get GeoJSON from PostGIS
    const markers = await prisma.$queryRawUnsafe(`
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
        a.obs,
        a.nivel_extincao_id,
        (
          SELECT json_agg(json_build_object('id', ai.id, 'imagem', ai.imagem, 'legenda', ai.legenda, 'ordem', ai.ordem) ORDER BY ai.ordem ASC)
          FROM api_animalimagem ai
          WHERE ai.animal_id = a.id
        ) as imagens_relacionadas,
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
    `);

    const featureCollection = {
      type: 'FeatureCollection',
      features: markers.map(m => {
        let geometry = {};
        try {
          geometry = JSON.parse(m.geometry_str);
        } catch (e) {
          console.error("Error parsing geometry:", e);
        }

        let imagensList = [];
        if (m.imagens_relacionadas && Array.isArray(m.imagens_relacionadas)) {
          imagensList = m.imagens_relacionadas.map(img => {
            let u = img.imagem ? img.imagem.trim() : '';
            if (u && !u.startsWith('http') && !u.startsWith('/') && !u.startsWith('data:')) {
              u = `/media/${u}`;
            }
            return {
              id: img.id,
              imagem: u || '/assets/img/logotipo.png',
              legenda: img.legenda || m.nome_comum,
              ordem: img.ordem || 1
            };
          });
        }

        let imgUrl = imagensList.length > 0 ? imagensList[0].imagem : '/assets/img/logotipo.png';
        if (imagensList.length === 0) {
          imagensList = [{ id: 1, imagem: imgUrl, legenda: m.nome_comum, ordem: 1 }];
        }

        let iconUrl = m.icone && typeof m.icone === 'string' && m.icone.trim().length > 0 ? m.icone.trim() : imgUrl;
        if (iconUrl && !iconUrl.startsWith('http') && !iconUrl.startsWith('/') && !iconUrl.startsWith('data:')) {
          iconUrl = `/media/${iconUrl}`;
        }

        let areaPolygon = null;
        let areaPolygonColor = "#FFAA44";
        let cleanObs = m.obs;
        if (m.obs && typeof m.obs === 'string' && m.obs.includes('[[POLYGON_DATA]]')) {
          const parts = m.obs.split('[[POLYGON_DATA]]');
          cleanObs = parts[0].trim();
          try {
            const parsed = JSON.parse(parts[1].trim());
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.polygons) {
              areaPolygon = parsed.polygons;
              areaPolygonColor = parsed.color || "#FFAA44";
            } else if (Array.isArray(parsed) && parsed.length > 0) {
              if (Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) {
                areaPolygon = parsed;
              } else {
                areaPolygon = [parsed];
              }
            }
          } catch (e) {
            console.error("Error parsing areaPolygon:", e);
          }
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
            obs: cleanObs,
            area_polygon: areaPolygon,
            area_polygon_color: areaPolygonColor,
            nivel_extincao_id: m.nivel_extincao_id ? m.nivel_extincao_id.toString() : null,
            nivel_extincao: m.nivel_extincao,
            nivel_sigla: m.nivel_sigla,
            icone: iconUrl,
            imagem: imgUrl,
            biomas: m.biomas || [],
            imagens: imagensList
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
