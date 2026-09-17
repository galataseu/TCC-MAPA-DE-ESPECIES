/**
 * Polígonos de referência georreferenciados dos Biomas do Sul do Brasil
 * Coordenadas no formato Leaflet: [latitude, longitude]
 */

// Polígono do Bioma Pampa (Rio Grande do Sul)
const PAMPA_POLYGON = [
  [-29.89, -50.27], // Osório / Litoral Médio
  [-30.03, -51.18], // Porto Alegre / Guaíba
  [-30.03, -52.89], // Cachoeira do Sul
  [-29.68, -53.80], // Santa Maria
  [-29.20, -54.80], // Santiago
  [-28.65, -56.00], // São Borja / Fronteira Oeste
  [-29.13, -56.55], // Itaqui
  [-29.75, -57.08], // Uruguaiana
  [-30.21, -57.55], // Barra do Quaraí (Tríplice Fronteira)
  [-30.89, -55.53], // Santana do Livramento
  [-31.33, -54.10], // Bagé / Campanha Gaúcha
  [-31.87, -54.16], // Aceguá
  [-32.56, -53.38], // Jaguarão
  [-33.69, -53.45], // Chuí (Extremo Sul)
  [-33.52, -53.36], // Santa Vitória do Palmar
  [-32.18, -52.17], // Rio Grande / Cassino
  [-31.31, -50.92], // Mostardas / Lagoa dos Patos
  [-30.26, -50.51], // Palmares do Sul
  [-29.89, -50.27]  // Fechamento do anel
];

// Polígono do Bioma Mata Atlântica no Sul (PR, SC e Serra/Litoral Norte do RS)
const MATA_ATLANTICA_POLYGON = [
  [-22.77, -53.27], // Porto Rico / Noroeste do PR
  [-23.16, -49.97], // Norte Pioneiro do PR
  [-25.30, -48.33], // Litoral Norte do PR / Guaraqueçaba
  [-25.88, -48.57], // Baía de Guaratuba (PR)
  [-26.24, -48.64], // São Francisco do Sul / Joinville (SC)
  [-26.90, -48.66], // Itajaí / Balneário Camboriú (SC)
  [-27.59, -48.54], // Florianópolis (SC)
  [-28.48, -48.78], // Laguna / Litoral Sul de SC
  [-29.34, -49.72], // Torres / Litoral Norte do RS
  [-29.89, -50.27], // Osório (RS)
  [-30.03, -51.18], // Região Metropolitana de Porto Alegre (RS)
  [-29.68, -53.80], // Santa Maria / Encosta da Serra (RS)
  [-28.64, -53.60], // Cruz Alta / Planalto Médio (RS)
  [-27.58, -54.67], // Porto Mauá / Noroeste do RS
  [-27.17, -53.71], // Chapecó / Oeste de SC
  [-26.25, -53.64], // Dionísio Cerqueira (Extremo Oeste SC)
  [-25.54, -54.58], // Foz do Iguaçu (PR)
  [-24.08, -54.25], // Guaíra (PR)
  [-22.77, -53.27]  // Fechamento do anel
];

// Polígono do Bioma Cerrado no Sul (enclave dos Campos Gerais, PR:
// Jaguariaíva / Sengés / Ponta Grossa — savana entre a Mata Atlântica)
const CERRADO_POLYGON = [
  [-23.90, -49.70], // Sengés / divisa SP
  [-24.10, -49.30], // Jaguariaíva
  [-24.45, -49.15], // Arapoti
  [-24.80, -49.25], // Tibagi
  [-25.05, -49.60], // Ponta Grossa / Vila Velha
  [-25.00, -50.00], // Campos Gerais oeste
  [-24.65, -50.20], // Reserva / Cândido de Abreu
  [-24.20, -50.00], // Telêmaco Borba
  [-23.90, -49.70]  // Fechamento do anel
];

// Polígono do Bioma Oceano Atlântico (Marinho/Costeiro da Região Sul)
const OCEANO_ATLANTICO_POLYGON = [
  [-25.30, -48.30], // Paranaguá (Litoral Norte PR - costa)
  [-25.10, -46.00], // Oceano aberto (PR)
  [-27.00, -46.50], // Oceano aberto (SC)
  [-29.50, -47.50], // Oceano aberto (RS Norte)
  [-33.70, -50.20], // Oceano aberto (Extremo Sul RS - Chuí)
  [-33.75, -53.35], // Foz do Chuí / Praia do Cassino (costa)
  [-32.18, -52.10], // Rio Grande (costa)
  [-29.34, -49.70], // Torres / Litoral RS (costa)
  [-28.48, -48.75], // Laguna SC (costa)
  [-27.59, -48.50], // Florianópolis SC (costa)
  [-26.24, -48.60], // São Francisco do Sul SC (costa)
  [-25.88, -48.55], // Guaratuba PR (costa)
  [-25.30, -48.30]  // Fechamento do anel
];

// Centróides de referência para marcadores (lat, lng)
const CENTROIDS = {
  PAMPA: { lat: -30.85, lng: -54.80 },
  MATA_ATLANTICA: { lat: -26.75, lng: -50.60 },
  CERRADO: { lat: -24.55, lng: -49.65 },
  OCEANO_ATLANTICO: { lat: -29.00, lng: -48.20 },
  SUL_GERAL: { lat: -28.20, lng: -51.90 }
};

/**
 * Normaliza e identifica os biomas a partir de string (ex: "Pampa, Mata Atlântica")
 * @param {string} biomaStr 
 * @returns {object} { hasPampa, hasMataAtlantica, hasCerrado, color, polygons, centroid, label }
 */
function getBiomaGeometry(biomaStr = '') {
  const norm = (biomaStr || '').toLowerCase();
  const hasPampa = norm.includes('pampa');
  const hasMataAtlantica = norm.includes('mata atlântica') || norm.includes('mata atlantica') || norm.includes('floresta');
  const hasCerrado = norm.includes('cerrado');
  const hasOceano = norm.includes('oceano') || norm.includes('atlantico') || norm.includes('marinho');

  let polygons = [];
  let color = '#2E7D32'; // Verde floresta por padrão
  let centroid = CENTROIDS.SUL_GERAL;
  let label = 'Sul do Brasil';

  if (hasOceano) {
    polygons = [OCEANO_ATLANTICO_POLYGON];
    color = '#1A5FB4'; // Azul oceano
    centroid = CENTROIDS.OCEANO_ATLANTICO;
    label = 'Bioma Oceano Atlântico';
  } else if (hasPampa && hasMataAtlantica && hasCerrado) {
    polygons = [PAMPA_POLYGON, MATA_ATLANTICA_POLYGON, CERRADO_POLYGON];
    color = '#4E7D32';
    centroid = CENTROIDS.SUL_GERAL;
    label = 'Pampa, Mata Atlântica e Cerrado';
  } else if (hasPampa && hasMataAtlantica) {
    polygons = [PAMPA_POLYGON, MATA_ATLANTICA_POLYGON];
    color = '#4E7D32';
    centroid = CENTROIDS.SUL_GERAL;
    label = 'Pampa e Mata Atlântica';
  } else if (hasPampa && hasCerrado) {
    polygons = [PAMPA_POLYGON, CERRADO_POLYGON];
    color = '#8A7A2E';
    centroid = CENTROIDS.SUL_GERAL;
    label = 'Pampa e Cerrado';
  } else if (hasMataAtlantica && hasCerrado) {
    polygons = [MATA_ATLANTICA_POLYGON, CERRADO_POLYGON];
    color = '#4E7D32';
    centroid = CENTROIDS.MATA_ATLANTICA;
    label = 'Mata Atlântica e Cerrado';
  } else if (hasPampa) {
    polygons = [PAMPA_POLYGON];
    color = '#9C7A2E'; // Tom de estepe/savana pampa
    centroid = CENTROIDS.PAMPA;
    label = 'Bioma Pampa';
  } else if (hasMataAtlantica) {
    polygons = [MATA_ATLANTICA_POLYGON];
    color = '#1B5E20'; // Verde fechado Mata Atlântica
    centroid = CENTROIDS.MATA_ATLANTICA;
    label = 'Bioma Mata Atlântica';
  } else if (hasCerrado) {
    polygons = [CERRADO_POLYGON];
    color = '#B8912E'; // Amarelo-queimado do Cerrado
    centroid = CENTROIDS.CERRADO;
    label = 'Bioma Cerrado';
  } else {
    // Fallback: se não informado ou outro bioma com ocorrência no Sul
    polygons = [MATA_ATLANTICA_POLYGON];
    color = '#FFAA44';
    centroid = CENTROIDS.SUL_GERAL;
    label = biomaStr ? `Bioma: ${biomaStr}` : 'Região Sul';
  }

  const polygonPayload = {
    color: color,
    polygons: polygons
  };

  return {
    hasPampa,
    hasMataAtlantica,
    hasCerrado,
    color,
    polygons,
    centroid,
    label,
    polygonJsonString: JSON.stringify(polygonPayload)
  };
}

/**
 * Gera um hash determinístico a partir de uma string
 */
function hashString(str = '') {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Calcula uma coordenada determinística realista para o animal dentro do seu bioma/estado no Sul
 * @param {string} scientificName
 * @param {string} classe
 * @param {string} biomaRaw
 * @param {string} estadosRaw
 * @returns {{ lat: number, lng: number }}
 */
function getDistributedCoordinate(scientificName = '', classe = '', biomaRaw = '', estadosRaw = '') {
  const hash = hashString(scientificName || 'animal');
  const u1 = (hash % 10000) / 10000;
  const u2 = ((Math.floor(hash / 10000)) % 10000) / 10000;
  const u3 = ((Math.floor(hash / 10000000)) % 1000) / 1000;

  const bNorm = (biomaRaw || '').toLowerCase();
  const cNorm = (classe || '').toLowerCase();
  const eNorm = (estadosRaw || '').toLowerCase();

  const isMarine = bNorm.includes('marinho') || bNorm.includes('costeiro') || bNorm.includes('oceano') ||
                   cNorm.includes('chondrichthyes') || cNorm.includes('actinopterygii') || 
                   cNorm.includes('osteichthyes') || cNorm.includes('elasmobranchii') ||
                   cNorm.includes('cetacea');

  // 1. Espécies Marinhas / Costeiras do Litoral Sul
  if (isMarine) {
    // Da foz do Paranaguá (PR) até o Chuí (RS)
    const lat = -25.4 - u1 * 7.5; // -25.4 a -32.9
    // Costa atlântica do Sul (próximo à faixa costeira marítima)
    const baseLng = -48.2 - (lat + 25.4) * 0.55; 
    const lng = baseLng + (u2 * 1.2 - 0.2); // Leve dispersão oceânica
    return {
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4))
    };
  }

  const isPampa = bNorm.includes('pampa') && !bNorm.includes('mata atl');
  const hasPR = eNorm.includes('pr') || eNorm.includes('paraná') || eNorm.includes('parana');
  const hasSC = eNorm.includes('sc') || eNorm.includes('santa catarina');
  const hasRS = eNorm.includes('rs') || eNorm.includes('rio grande');

  // 2. Bioma Pampa exclusivo (Metade Sul do RS)
  if (isPampa) {
    const lat = -29.8 - u1 * 3.3; // -29.8 a -33.1
    const lng = -51.8 - u2 * 5.0; // -51.8 a -56.8
    return {
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4))
    };
  }

  // 3. Mata Atlântica / Geral do Sul por Estado
  // Seleciona um estado válido de acordo com os estados informados
  const candidateStates = [];
  if (hasPR) candidateStates.push('PR');
  if (hasSC) candidateStates.push('SC');
  if (hasRS) candidateStates.push('RS');

  let chosenState = 'SC';
  if (candidateStates.length > 0) {
    chosenState = candidateStates[Math.floor(u3 * candidateStates.length)];
  } else {
    // Se não especificado estado, sorteia entre os 3 estados do Sul
    const states = ['PR', 'SC', 'RS'];
    chosenState = states[Math.floor(u3 * 3)];
  }

  let lat, lng;
  if (chosenState === 'PR') {
    lat = -23.4 - u1 * 2.5; // -23.4 a -25.9
    lng = -49.0 - u2 * 4.5; // -49.0 a -53.5
  } else if (chosenState === 'SC') {
    lat = -26.1 - u1 * 2.4; // -26.1 a -28.5
    lng = -49.0 - u2 * 4.4; // -49.0 a -53.4
  } else {
    // RS (Mata Atlântica / Serra / Planalto Norte do RS)
    lat = -27.8 - u1 * 2.1; // -27.8 a -29.9
    lng = -50.2 - u2 * 3.8; // -50.2 a -54.0
  }

  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4))
  };
}

module.exports = {
  PAMPA_POLYGON,
  MATA_ATLANTICA_POLYGON,
  CERRADO_POLYGON,
  OCEANO_ATLANTICO_POLYGON,
  CENTROIDS,
  getBiomaGeometry,
  getDistributedCoordinate
};

