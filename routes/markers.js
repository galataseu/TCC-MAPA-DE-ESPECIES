const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = require('../services/db');

/**
 * GET /api/markers
 * Retorna marcadores como GeoJSON. Suporta filtro por bbox e zoom.
 * 
 * Query params:
 *   bbox   — "minLng,minLat,maxLng,maxLat"  (opcional — sem bbox retorna todos)
 *   zoom   — número inteiro                  (opcional — para filtros futuros)
 *   limit  — máximo de registros             (padrão: 2000)
 *   offset — paginação                       (padrão: 0)
 */
/**
 * Extrai os anéis da área desenhada pelo admin (formato Leaflet [lat, lng])
 * a partir do campo obs (delimitador [[POLYGON_DATA]]).
 */
function parseAreaRingsFromObs(obs) {
  if (!obs || typeof obs !== 'string' || !obs.includes('[[POLYGON_DATA]]')) return [];
  try {
    const parsed = JSON.parse(obs.split('[[POLYGON_DATA]]')[1].trim());
    let rings = null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.polygons) {
      rings = parsed.polygons;
    } else if (Array.isArray(parsed) && parsed.length > 0) {
      rings = parsed;
    }
    if (!rings) return [];
    const norm = (Array.isArray(rings[0]) && Array.isArray(rings[0][0])) ? rings : [rings];
    return norm.filter(r => Array.isArray(r) && r.length >= 3);
  } catch (e) {
    return [];
  }
}

/** Testa se o anel [lat,lng] cruza a bbox (overlap de bounding boxes). */
function ringIntersectsBbox(ring, minLng, minLat, maxLng, maxLat) {
  let rMinLng = Infinity, rMinLat = Infinity, rMaxLng = -Infinity, rMaxLat = -Infinity;
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const lat = parseFloat(pt[0]);
    const lng = parseFloat(pt[1]);
    if (isNaN(lat) || isNaN(lng)) continue;
    if (lng < rMinLng) rMinLng = lng;
    if (lng > rMaxLng) rMaxLng = lng;
    if (lat < rMinLat) rMinLat = lat;
    if (lat > rMaxLat) rMaxLat = lat;
  }
  if (rMinLng === Infinity) return false;
  if (rMaxLng < minLng || rMinLng > maxLng || rMaxLat < minLat || rMinLat > maxLat) return false;
  return true;
}

router.get('/', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || '2000', 10), 5000);
    const offset = parseInt(req.query.offset || '0', 10);

    // Filtro de bounding box (PostGIS ST_Within ou ST_Intersects)
    let bboxClause = '';
    let areaBbox = null; // bbox expandida usada também p/ incluir áreas desenhadas
    const bboxParam = req.query.bbox;
    if (bboxParam) {
      const parts = bboxParam.split(',').map(Number);
      if (parts.length === 4 && parts.every(n => !isNaN(n))) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        // Expande 20% para pré-carregar marcadores além da borda
        const padLat = (maxLat - minLat) * 0.2;
        const padLng = (maxLng - minLng) * 0.2;
        areaBbox = {
          minLng: minLng - padLng,
          minLat: minLat - padLat,
          maxLng: maxLng + padLng,
          maxLat: maxLat + padLat
        };
        bboxClause = `AND ST_Intersects(
          m.location,
          ST_MakeEnvelope(
            ${areaBbox.minLng}, ${areaBbox.minLat},
            ${areaBbox.maxLng}, ${areaBbox.maxLat},
            4326
          )
        )`;
      }
    }

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
          SELECT ai.imagem
          FROM api_animalimagem ai
          WHERE ai.animal_id = a.id
          ORDER BY ai.ordem ASC
          LIMIT 1
        ) as primeira_imagem,
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
      ${bboxClause}
      ORDER BY m.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Inclui animais cuja ÁREA desenhada cruza o viewport mesmo que o ponto
    // do marcador esteja fora dele (o filtro PostGIS acima só olha o ponto).
    if (areaBbox) {
      try {
        const areaMarkers = await prisma.$queryRawUnsafe(`
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
              SELECT ai.imagem
              FROM api_animalimagem ai
              WHERE ai.animal_id = a.id
              ORDER BY ai.ordem ASC
              LIMIT 1
            ) as primeira_imagem,
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
          AND a.obs LIKE '%[[POLYGON_DATA]]%'
          ORDER BY m.id ASC
          LIMIT 500 OFFSET 0
        `);
        const seenIds = new Set(markers.map(m => String(m.id)));
        for (const m of areaMarkers) {
          if (seenIds.has(String(m.id))) continue;
          const rings = parseAreaRingsFromObs(m.obs);
          const crosses = rings.some(ring => ringIntersectsBbox(
            ring, areaBbox.minLng, areaBbox.minLat, areaBbox.maxLng, areaBbox.maxLat
          ));
          if (crosses) {
            markers.push(m);
            seenIds.add(String(m.id));
          }
        }
      } catch (areaErr) {
        console.error('Erro ao incluir áreas desenhadas no bbox:', areaErr);
      }
    }

    const features = markers.map(m => {
      let geometry = {};
      try {
        geometry = JSON.parse(m.geometry_str);
      } catch (e) {
        console.error("Error parsing geometry:", e);
      }

      let imgUrl = m.primeira_imagem ? m.primeira_imagem.trim() : '';
      if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('/') && !imgUrl.startsWith('data:')) {
        imgUrl = `/media/${imgUrl}`;
      }
      if (!imgUrl) imgUrl = '/assets/img/logotipo.png';

      // Ícone do animal para o marcador: prioriza icone do banco se for foto real, senão primeira foto do animal
      let iconUrl = (m.icone && typeof m.icone === 'string' && m.icone.trim().length > 0 && !m.icone.includes('logotipo.png'))
        ? m.icone.trim()
        : imgUrl;
      if (iconUrl && !iconUrl.startsWith('http') && !iconUrl.startsWith('/') && !iconUrl.startsWith('data:')) {
        iconUrl = `/media/${iconUrl}`;
      }

      let imagensList = [{ id: 1, imagem: imgUrl, legenda: m.nome_comum, ordem: 1 }];

      // Extrai polígono de área (armazenado em obs com delimitador [[POLYGON_DATA]])
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
            areaPolygon = (Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) ? parsed : [parsed];
          }
        } catch (e) {
          console.error("Error parsing areaPolygon:", e);
        }
      }

      return {
        type: 'Feature',
        geometry,
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
          biomas: m.biomas || [],
          imagens: imagensList
        }
      };
    });

    res.json({ type: 'FeatureCollection', features });
  } catch (error) {
    console.error('Erro ao buscar marcadores:', error);
    res.status(500).json({ error: 'Erro ao buscar marcadores' });
  }
});

module.exports = router;
