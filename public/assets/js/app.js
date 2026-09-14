var map;
var maskLayer;
var maskPaths = [[[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]]];
var atlanticLayer;
var atlanticPatternLayer;
var pampasLayer;
var pampasPatternLayer;
var cerradoLayer;
var cerradoPatternLayer;
var rsGeometry = null;
var prGeometry = null;
var forestGeometry = null;
var pampaGeometry = null;
var cerradoGeometry = null;
var stateLayers = [];
var markersData = [];

/* Camadas de Base */
var darkFull = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_3l5t_1_889f4489a3fb5fb5051816e3', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19,
  updateWhenIdle: true,
  keepBuffer: 4
});

// Mapa de cores para níveis de extinção
const extinctionColorMap = {
  'ex': '#403E4C', 'ew': '#831F34', 'cr': '#FF4068', 'en': '#ff6426',
  'vu': '#FFA63A', 'nt': '#217757', 'lc': '#1a5fb4', 'dd': '#555555',
  '1': '#FF4068', '2': '#ff6426', '3': '#FFA63A',
  '4': '#217757', '5': '#1a5fb4', '6': '#555555', '7': '#403E4C', '8': '#831F34'
};

function formatErrorMessage(data, fallback = 'Tente novamente.') {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.error === 'string' && data.error.trim().length > 0) return data.error;
  if (typeof data.message === 'string' && data.message.trim().length > 0) return data.message;
  if (typeof data.detail === 'string' && data.detail.trim().length > 0) return data.detail;
  if (data.error && typeof data.error === 'object') {
    if (typeof data.error.message === 'string') return data.error.message;
    if (typeof data.error.detail === 'string') return data.error.detail;
    const keys = Object.keys(data.error);
    if (keys.length > 0) {
      return keys.map(k => `${k}: ${Array.isArray(data.error[k]) ? data.error[k].join(', ') : data.error[k]}`).join(' | ');
    }
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data).filter(k => k !== 'success');
    if (keys.length > 0) {
      const msgs = [];
      for (const k of keys) {
        const val = data[k];
        if (typeof val === 'string') msgs.push(`${k}: ${val}`);
        else if (Array.isArray(val)) msgs.push(`${k}: ${val.join(', ')}`);
        else if (val && typeof val === 'object') msgs.push(`${k}: ${JSON.stringify(val)}`);
      }
      if (msgs.length > 0) return msgs.join('\n');
    }
  }
  return fallback;
}

// Cidades pré-configuradas do Sul para pesquisa instantânea
const southCitiesList = [
  { name: "Curitiba, PR", lat: -25.4284, lng: -49.2733 },
  { name: "Florianópolis, SC", lat: -27.5954, lng: -48.5480 },
  { name: "Porto Alegre, RS", lat: -30.0346, lng: -51.2177 },
  { name: "Joinville, SC", lat: -26.3045, lng: -48.8487 },
  { name: "Londrina, PR", lat: -23.3045, lng: -51.1696 },
  { name: "Caxias do Sul, RS", lat: -29.1678, lng: -51.1794 },
  { name: "Maringá, PR", lat: -23.4210, lng: -51.9331 },
  { name: "Blumenau, SC", lat: -26.9194, lng: -49.0661 },
  { name: "Ponta Grossa, PR", lat: -25.0994, lng: -50.1583 },
  { name: "Pelotas, RS", lat: -31.7654, lng: -52.3376 },
  { name: "Cascavel, PR", lat: -24.9578, lng: -53.4595 },
  { name: "São José, SC", lat: -27.6136, lng: -48.6366 },
  { name: "Santa Maria, RS", lat: -29.6842, lng: -53.8069 },
  { name: "Foz do Iguaçu, PR", lat: -25.5159, lng: -54.5855 },
  { name: "Chapecó, SC", lat: -27.1004, lng: -52.6152 },
  { name: "Itajaí, SC", lat: -26.9078, lng: -48.6619 },
  { name: "Criciúma, SC", lat: -28.6775, lng: -49.3703 },
  { name: "Passo Fundo, RS", lat: -28.2628, lng: -52.4067 },
  { name: "Rio Grande, RS", lat: -32.0350, lng: -52.0986 },
  { name: "Lages, SC", lat: -27.8157, lng: -50.3260 },
  { name: "Guarapuava, PR", lat: -25.3953, lng: -51.4582 },
  { name: "Jaraguá do Sul, SC", lat: -26.4851, lng: -49.0763 },
  { name: "Paranaguá, PR", lat: -25.5205, lng: -48.5095 },
  { name: "Uruguaiana, RS", lat: -29.7547, lng: -57.0883 },
  { name: "Bento Gonçalves, RS", lat: -29.1711, lng: -51.5188 },
  { name: "Toledo, PR", lat: -24.7244, lng: -53.7431 },
  { name: "Palhoça, SC", lat: -27.6455, lng: -48.6698 },
  { name: "Tubarão, SC", lat: -28.4736, lng: -49.0158 }
];

$(document).ready(function () {
  /* 1. Configuração do Mapa Principal */
  map = L.map("map", {
    center: [-27.5, -51.5],
    zoom: 6,
    layers: [darkFull],
    zoomControl: false,
    attributionControl: false,
    maxBounds: [[-34.0, -58.0], [-22.0, -47.0]],
    maxBoundsViscosity: 0.7,
    minZoom: 5,
    zoomSnap: 1,
    zoomAnimation: true,
    preferCanvas: true
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);
  if (typeof L.control.locate === 'function') {
    L.control.locate({ position: "bottomright", icon: 'fa-solid fa-location-arrow' }).addTo(map);
  }

  /* 2. Inicialização das Camadas de Biomas e Máscara */
  var svgRenderer = L.svg({ padding: 0 });

  pampasLayer = L.geoJson(null, { renderer: svgRenderer }).addTo(map);
  pampasPatternLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "url(#pampa-pattern)", fillOpacity: 0.6, clickable: false },
    renderer: svgRenderer
  }).addTo(map);

  cerradoLayer = L.geoJson(null, { renderer: svgRenderer }).addTo(map);
  cerradoPatternLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "url(#cerrado-pattern)", fillOpacity: 0.6, clickable: false },
    renderer: svgRenderer
  }).addTo(map);

  atlanticLayer = L.geoJson(null, { renderer: svgRenderer }).addTo(map);
  atlanticPatternLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "url(#tree-pattern)", fillOpacity: 0.6, clickable: false },
    renderer: svgRenderer
  }).addTo(map);

  maskLayer = L.polygon(maskPaths, {
    color: "transparent",
    fillColor: "#000000",
    fillOpacity: 0.6,
    pointerEvents: "none",
    fillRule: 'evenodd'
  }).addTo(map);

  function updateLayerStyles() {
    pampasLayer.setStyle({
      color: "transparent",
      fillColor: "#3b7ba5",
      fillOpacity: 0.3
    });

    cerradoLayer.setStyle({
      color: "transparent",
      fillColor: "#E6C140",
      fillOpacity: 0.4
    });

    atlanticLayer.setStyle({
      color: "transparent",
      fillColor: "#287f5e",
      fillOpacity: 0.1
    });

    maskLayer.setStyle({
      fillColor: "#000000",
      fillOpacity: 0.6
    });
  }

  /* 3. Lógica de Carregamento de Dados Geográficos */
  var loadData = function() {
    var requests = [
      $.getJSON("/data/ATLANTIC_FOREST_LAW.json"),
      $.getJSON("/data/br_pr.json"),
      $.getJSON("/data/br_sc.json"),
      $.getJSON("/data/br_rs.json")
    ];

    $.when.apply($, requests).done(function() {
      var results = Array.prototype.slice.call(arguments).map(function(res) { 
        return Array.isArray(res) ? res[0] : res; 
      });
      
      var forestData = results[0];
      var prData = results[1];
      var scData = results[2];
      var rsData = results[3];

      var simplifiedForest = turf.simplify(forestData, {tolerance: 0.005, highPrecision: false});
      atlanticLayer.addData(simplifiedForest);
      atlanticPatternLayer.addData(simplifiedForest);
      
      var merged = simplifiedForest.features[0];
      for (var i = 1; i < simplifiedForest.features.length; i++) {
        try { 
          var union = turf.union(merged, simplifiedForest.features[i]);
          if (union) merged = union;
        } catch(e) {}
      }
      forestGeometry = merged;

      var processState = function(data, color, code) {
        var layer = L.geoJson(data, {
          style: { color: color, weight: 3, fillOpacity: 0, clickable: false }
        }).addTo(map);
        stateLayers.push(layer);

        data.features.forEach(function(f) {
          if (!f.geometry) return;
          var type = f.geometry.type;
          var coords = f.geometry.coordinates;
          if (type === "Polygon") {
            coords.forEach(function(ring) { maskPaths.push(ring.map(function(c) { return [c[1], c[0]]; })); });
          } else if (type === "MultiPolygon") {
            coords.forEach(function(poly) { poly.forEach(function(ring) { maskPaths.push(ring.map(c => [c[1], c[0]])); }); });
          }
        });

        if (code === "PR") prGeometry = data.features[0];
        if (code === "RS") rsGeometry = data.features[0];
      };

      processState(prData, "#1E7552", "PR");
      processState(scData, "#FF0000", "SC");
      processState(rsData, "#FFFF00", "RS");

      maskLayer.setLatLngs(maskPaths);

      try {
        var cleanForest = forestGeometry ? turf.simplify(turf.buffer(forestGeometry, 0), {tolerance: 0.003}) : null;
        if (rsGeometry && cleanForest) {
          var pampaDiff = turf.difference(turf.simplify(turf.buffer(rsGeometry, 0), {tolerance: 0.003}), cleanForest);
          if (pampaDiff) {
            pampaGeometry = pampaDiff;
            pampasLayer.addData(pampaDiff);
            pampasPatternLayer.addData(pampaDiff);
          }
        }
        if (prGeometry && cleanForest) {
          var cerradoDiff = turf.difference(turf.simplify(turf.buffer(prGeometry, 0), {tolerance: 0.003}), cleanForest);
          if (cerradoDiff) {
            cerradoGeometry = cerradoDiff;
            cerradoLayer.addData(cerradoDiff);
            cerradoPatternLayer.addData(cerradoDiff);
          }
        }
      } catch (e) {}

      updateLayerStyles();
      reorderLayers();
      injectTreePattern();
      refreshAreaViewport();
    });
  };

  function injectTreePattern() {
    var svg = document.querySelector('svg');
    if (!svg) { setTimeout(injectTreePattern, 200); return; }
    var defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), svg.firstChild);
    var patterns = [
      { id: 'tree-pattern', img: '/svg/mataatlantica.png', size: 100, icons: [[10,10,40],[60,50,30]] },
      { id: 'pampa-pattern', img: '/svg/pampa.png', size: 80, icons: [[10,10,35],[45,40,25]] },
      { id: 'cerrado-pattern', img: '/svg/cerrado.png', size: 90, icons: [[10,10,40],[55,45,30]] }
    ];
    patterns.forEach(function(p) {
      if (!document.getElementById(p.id)) {
        var pat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pat.setAttribute('id', p.id); pat.setAttribute('patternUnits', 'userSpaceOnUse');
        pat.setAttribute('width', p.size); pat.setAttribute('height', p.size);
        p.icons.forEach(function(icon) {
          var img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', p.img);
          img.setAttribute('x', icon[0]); img.setAttribute('y', icon[1]);
          img.setAttribute('width', icon[2]); img.setAttribute('height', icon[2]);
          img.setAttribute('opacity', '0.7');
          pat.appendChild(img);
        });
        defs.appendChild(pat);
      }
    });
  }

  function reorderLayers() {
    if (atlanticPatternLayer) atlanticPatternLayer.bringToFront();
    if (pampasPatternLayer) pampasPatternLayer.bringToFront();
    if (cerradoPatternLayer) cerradoPatternLayer.bringToFront();
  }

  $("#toggle-textures-legend").change(function() {
    var isChecked = $(this).is(":checked");
    if (isChecked) {
      map.addLayer(atlanticPatternLayer); map.addLayer(pampasLayer); 
      map.addLayer(pampasPatternLayer); map.addLayer(cerradoLayer);
      map.addLayer(cerradoPatternLayer); reorderLayers();
    } else {
      map.removeLayer(atlanticPatternLayer); map.removeLayer(pampasPatternLayer); map.removeLayer(cerradoPatternLayer);
    }
  });

  // Slider de tamanho dos marcadores no mapa
  $(document).on("input", "#marker-size-slider", function() {
    const val = parseFloat($(this).val());
    const percentage = Math.round(val * 100);
    $("#marker-size-val").text(percentage + "%");
    document.documentElement.style.setProperty("--marker-scale", val);
  });

  // Tornar o Quadro de Legendas Arrastável na Tela
  function makeLegendDraggable() {
    const legend = document.getElementById("map-legend");
    if (!legend) return;

    if (window.L && L.DomEvent) {
      L.DomEvent.disableClickPropagation(legend);
      L.DomEvent.disableScrollPropagation(legend);
    }

    const header = legend.querySelector(".legend-header");
    if (!header) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    function onDragStart(clientX, clientY, target) {
      if (['INPUT', 'BUTTON', 'LABEL'].includes(target.tagName)) return false;

      isDragging = true;
      $(header).css('cursor', 'grabbing');

      const rect = legend.getBoundingClientRect();
      startX = clientX;
      startY = clientY;

      legend.style.bottom = "auto";
      legend.style.right = "auto";
      legend.style.left = rect.left + "px";
      legend.style.top = rect.top + "px";

      initialLeft = rect.left;
      initialTop = rect.top;
      return true;
    }

    function onDragMove(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = window.innerWidth - legend.offsetWidth - 10;
      const maxTop = window.innerHeight - legend.offsetHeight - 10;

      newLeft = Math.max(10, Math.min(newLeft, maxLeft));
      newTop = Math.max(10, Math.min(newTop, maxTop));

      legend.style.left = newLeft + "px";
      legend.style.top = newTop + "px";
    }

    function onDragEnd() {
      if (isDragging) {
        isDragging = false;
        $(header).css('cursor', 'grab');
      }
    }

    header.addEventListener("mousedown", function(e) {
      if (onDragStart(e.clientX, e.clientY, e.target)) {
        e.preventDefault();
      }
    });

    window.addEventListener("mousemove", function(e) {
      onDragMove(e.clientX, e.clientY);
    });

    window.addEventListener("mouseup", onDragEnd);

    header.addEventListener("touchstart", function(e) {
      if (e.touches.length === 1) {
        onDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }
    });

    window.addEventListener("touchmove", function(e) {
      if (isDragging && e.touches.length === 1) {
        onDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    });

    window.addEventListener("touchend", onDragEnd);
  }

  makeLegendDraggable();

  $("#about-btn").click(function() { $("#aboutModal").modal("show"); return false; });

  // =========================================================================
  // 4. PESQUISA UNIFICADA INSTANTÂNEA DE LOCALIDADES E ANIMAIS
  // =========================================================================
  let remoteSearchDebounceTimer = null;
  const searchDropdown = $("#search-results-dropdown");

  $("#searchbox").on("input", function() {
    const query = $(this).val().trim();

    if (query.length < 1) {
      searchDropdown.addClass("d-none").empty();
      clearTimeout(remoteSearchDebounceTimer);
      return;
    }

    // 1. Busca Local Instantânea (0ms de latência)
    const qLower = query.toLowerCase();
    const matchedAnimals = markersData.filter(a => {
      const nomeComum = (a.nome_comum || '').toLowerCase();
      const nomeCient = (a.nome_cientifico || '').toLowerCase();
      const classe = (a.classe || '').toLowerCase();
      const habitos = (a.habitos || '').toLowerCase();
      const sigla = (a.nivel_sigla || '').toLowerCase();
      return nomeComum.includes(qLower) || nomeCient.includes(qLower) || classe.includes(qLower) || habitos.includes(qLower) || sigla.includes(qLower);
    });

    let matchedCities = southCitiesList.filter(c => c.name.toLowerCase().includes(qLower));

    // Renderiza imediatamente os resultados locais
    renderSearchResults(matchedCities.slice(0, 5), matchedAnimals.slice(0, 8));

    // 2. Busca Remota em background apenas se query for mais específica (>= 3 caracteres)
    clearTimeout(remoteSearchDebounceTimer);
    if (query.length >= 3) {
      remoteSearchDebounceTimer = setTimeout(() => {
        fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=-27.5&lon=-51.5&limit=4`)
          .then(res => res.json())
          .then(geoData => {
            if (geoData && geoData.features) {
              geoData.features.forEach(f => {
                const p = f.properties;
                if (p && p.name && (p.countrycode === 'BR' || p.country === 'Brazil')) {
                  const state = p.state || p.country || '';
                  const fullName = state ? `${p.name}, ${state}` : p.name;
                  if (!matchedCities.some(c => c.name.toLowerCase() === fullName.toLowerCase())) {
                    matchedCities.push({
                      name: fullName,
                      lat: f.geometry.coordinates[1],
                      lng: f.geometry.coordinates[0]
                    });
                  }
                }
              });
              renderSearchResults(matchedCities.slice(0, 5), matchedAnimals.slice(0, 8));
            }
          })
          .catch(() => {});
      }, 350);
    }
  });

  function renderSearchResults(cities, animals) {
    searchDropdown.empty();

    if (cities.length === 0 && animals.length === 0) {
      searchDropdown.html('<div class="p-3 text-center text-muted small">Nenhum resultado encontrado.</div>').removeClass("d-none");
      return;
    }

    // Seção Localidades
    if (cities.length > 0) {
      searchDropdown.append('<div class="search-category-header">Localidades</div>');
      cities.forEach(c => {
        const item = $(`
          <div class="search-item-location" data-lat="${c.lat}" data-lng="${c.lng}">
            <div class="loc-left">
              <i class="fa-solid fa-location-dot loc-icon"></i>
              <span>${c.name}</span>
            </div>
            <span class="loc-coords">${c.lat.toFixed(2)}, ${c.lng.toFixed(2)}</span>
          </div>
        `);
        item.click(function() {
          map.flyTo([c.lat, c.lng], 13, { duration: 1.2 });
          searchDropdown.addClass("d-none");
        });
        searchDropdown.append(item);
      });
    }

    // Seção Animais
    if (animals.length > 0) {
      if (cities.length > 0) searchDropdown.append('<hr class="my-1 border-secondary opacity-25">');
      searchDropdown.append('<div class="search-category-header">Animais Catalogados</div>');
      animals.forEach(a => {
        const statusSigla = a.nivel_sigla ? a.nivel_sigla.toLowerCase() : 'dd';
        const color = extinctionColorMap[statusSigla] || '#1a5fb4';
        let imgUrl = a.icone || (a.imagens && a.imagens.length > 0 ? a.imagens[0].imagem : '/assets/img/logotipo.png');

        let lat = -27.59;
        let lng = -48.54;
        if (a.lat && a.lng) {
          lat = parseFloat(a.lat);
          lng = parseFloat(a.lng);
        }

        const item = $(`
          <div class="search-item-animal">
            <div class="animal-left">
              <div class="animal-avatar">
                <img src="${imgUrl}" alt="${a.nome_comum}">
              </div>
              <div class="animal-info">
                <div class="animal-names">
                  ${a.nome_comum}
                  <span class="animal-sci-name">${a.nome_cientifico || ''}</span>
                </div>
                <div class="animal-desc">${a.habitos ? a.habitos.substring(0, 45) + '...' : (a.classe || 'Espécie catalogada')}</div>
              </div>
            </div>
            <div class="animal-right">
              <span class="status-badge" style="background-color: ${color};">${(a.nivel_sigla || 'DD').toUpperCase()}</span>
              <span class="animal-coords">${lat.toFixed(2)}, ${lng.toFixed(2)}</span>
            </div>
          </div>
        `);

        item.click(function() {
          searchDropdown.addClass("d-none");
          map.flyTo([lat, lng], 14, { duration: 1.2 });
          setTimeout(() => {
            showDetails(a.animal_id);
          }, 800);
        });

        searchDropdown.append(item);
      });
    }

    searchDropdown.removeClass("d-none");
  }

  // Fechar dropdown de pesquisa ao clicar fora
  $(document).on("click", function(e) {
    if (!$(e.target).closest("#floating-search").length) {
      searchDropdown.addClass("d-none");
    }
  });

  // =========================================================================
  // 5. MARCADORES COM CLUSTERING — suporta milhares de animais sem travar
  // =========================================================================

  /**
   * Cache de features por bbox (chave = string arredondada).
   * Evita re-requisitar a mesma área ao pan/zoom.
   */
  const _markerCache = new Map(); // chave → Set de animal_ids já carregados
  const _allFeatures  = new Map(); // animal_id → feature (deduplica)
  let _loadingMarkers = false;
  let rawMarkersGeoJson = { type: 'FeatureCollection', features: [] };

  /**
   * Cria o ícone customizado de marcador.
   */
  function createAnimalIcon(p) {
    const statusSigla = p.nivel_sigla ? p.nivel_sigla.toLowerCase() : 'dd';
    const borderColor = extinctionColorMap[statusSigla] || '#1a5fb4';
    let iconUrl = '/assets/img/logotipo.png';
    if (p.icone && typeof p.icone === 'string' && !p.icone.includes('logotipo.png')) {
      iconUrl = p.icone;
    } else if (p.imagens && Array.isArray(p.imagens) && p.imagens.length > 0) {
      const firstImg = p.imagens[0];
      const u = typeof firstImg === 'string' ? firstImg : (firstImg && firstImg.imagem ? firstImg.imagem : '');
      if (u && !u.includes('logotipo.png')) iconUrl = u;
    } else if (p.imagem && typeof p.imagem === 'string' && !p.imagem.includes('logotipo.png')) {
      iconUrl = p.imagem;
    }
    if (iconUrl && !iconUrl.startsWith('http') && !iconUrl.startsWith('/') && !iconUrl.startsWith('data:')) {
      iconUrl = `/media/${iconUrl}`;
    }
    return L.divIcon({
      className: 'custom-animal-marker',
      html: `
        <div class="marker-container">
          <div class="marker-pin" style="border-color: ${borderColor};">
            <div class="marker-avatar">
              <img src="${iconUrl}" alt="${p.nome_comum || ''}" loading="lazy">
            </div>
            <span class="marker-name-label">${p.nome_comum || ''}</span>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });
  }

  /**
   * Cria um marcador Leaflet a partir de uma feature GeoJSON.
   */
  function createMarkerFromFeature(feature) {
    const coords = feature.geometry && feature.geometry.coordinates;
    if (!coords) return null;
    const latlng = L.latLng(coords[1], coords[0]);
    const p = feature.properties;
    const marker = L.marker(latlng, { icon: createAnimalIcon(p) });

    marker.on('click', function () {
      showDetails(p.animal_id);
    });

    marker.on('contextmenu', function (e) {
      if (!isAdminModeActive()) return;
      L.DomEvent.stopPropagation(e);
      const containerPoint = map.latLngToContainerPoint(e.latlng);
      const menu = $("#admin-context-menu");
      menu.html(`
        <div class="admin-menu-item" id="menu-edit-entity">
          <i class="fa-solid fa-pen-to-square text-warning me-2"></i>
          <span>Editar ${p.nome_comum || 'Entidade'}</span>
        </div>
        <div class="admin-menu-item text-danger" id="menu-delete-entity">
          <i class="fa-solid fa-trash me-2"></i>
          <span>Excluir ${p.nome_comum || 'Entidade'}</span>
        </div>
      `);
      menu.css({ left: containerPoint.x + 'px', top: containerPoint.y + 'px' }).removeClass('d-none');
      $('#menu-edit-entity').off('click').on('click', function () {
        menu.addClass('d-none');
        openAdminDrawerForEdit(feature);
      });
      $('#menu-delete-entity').off('click').on('click', function () {
        menu.addClass('d-none');
        deleteEntityWithConfirmation(feature);
      });
    });

    return marker;
  }

  /**
   * Cluster group principal — agrupa marcadores próximos automaticamente.
   */
  var markersCluster = L.markerClusterGroup({
    chunkedLoading: true,       // carrega em chunks sem bloquear a UI
    chunkInterval: 100,         // ms entre chunks
    chunkDelay: 50,
    maxClusterRadius: 60,       // raio de agrupamento em pixels
    showCoverageOnHover: false,
    iconCreateFunction: function (cluster) {
      const count = cluster.getChildCount();
      let cls = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
      return L.divIcon({
        html: `<div class="cluster-inner cluster-${cls}"><span>${count}</span></div>`,
        className: 'marker-cluster',
        iconSize: L.point(40, 40)
      });
    }
  }).addTo(map);

  const SUL_BOUNDS = {
    minLat: -33.8,
    maxLat: -22.5,
    minLng: -57.7,
    maxLng: -48.0
  };

  let debugPolygonsLayer = L.layerGroup().addTo(map);

  // ---------------------------------------------------------------------------
  // ÁREAS DESENHADAS PELOS ADMINS.
  // Cada animal pode ter uma área de ocorrência (polígono). O comportamento
  // esperado: sempre que a câmera mostrar essa área, o animal aparece na tela.
  // - areaPolygonsLayer desenha as áreas, mas SÓ para ADM com "Exibir Áreas"
  //   ativado (ver renderAreaPolygons);
  // - refreshAreaViewport() cria um "proxy" do marcador dentro do viewport
  //   quando a área cruza a tela mas o ponto original está fora dela — isso
  //   vale para TODOS os usuários, mesmo sem ver o polígono.
  // ---------------------------------------------------------------------------
  var areaPolygonsLayer = L.layerGroup().addTo(map);
  var areaProxyByAnimal = new Map(); // animal_id (string) -> L.marker

  function getAreaRingsOf(p) {
    var raw = p && p.area_polygon;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
    var rings = (Array.isArray(raw[0]) && Array.isArray(raw[0][0])) ? raw : [raw];
    return rings.filter(function(r) { return r && r.length >= 3; });
  }

  function ringBboxIntersectsBounds(ring, bounds) {
    var south = bounds.getSouth(), north = bounds.getNorth();
    var west = bounds.getWest(), east = bounds.getEast();
    var rMinLat = Infinity, rMinLng = Infinity, rMaxLat = -Infinity, rMaxLng = -Infinity;
    for (var i = 0; i < ring.length; i++) {
      var pt = ring[i];
      if (!pt || pt.length < 2) continue;
      var lat = parseFloat(pt[0]);
      var lng = parseFloat(pt[1]);
      if (isNaN(lat) || isNaN(lng)) continue;
      if (lat < rMinLat) rMinLat = lat;
      if (lat > rMaxLat) rMaxLat = lat;
      if (lng < rMinLng) rMinLng = lng;
      if (lng > rMaxLng) rMaxLng = lng;
    }
    if (rMinLat === Infinity) return false;
    if (rMaxLng < west || rMinLng > east || rMaxLat < south || rMinLat > north) return false;
    return true;
  }

  function renderAreaPolygons() {
    areaPolygonsLayer.clearLayers();
    // Zonas visíveis apenas para ADM com "Exibir Áreas" ativado.
    // (Os proxies dos marcadores continuam funcionando para todos.)
    if (typeof isAdminModeActive !== 'function' || !isAdminModeActive()) return;
    if (!$("#toggle-debug-areas").is(":checked")) return;
    if (!rawMarkersGeoJson || !rawMarkersGeoJson.features) return;
    var rendered = new Set();
    rawMarkersGeoJson.features.forEach(function(f) {
      var p = f.properties;
      var animalId = String(p.animal_id || p.id);
      if (rendered.has(animalId)) return;
      rendered.add(animalId);
      var rings = getAreaRingsOf(p);
      if (rings.length === 0) return;
      var stroke = p.area_polygon_color || '#FFAA44';
      rings.forEach(function(ring) {
        L.polygon(ring, {
          color: stroke,
          fillColor: stroke,
          fillOpacity: 0.15,
          weight: 2,
          interactive: false
        }).addTo(areaPolygonsLayer);
      });
    });
  }

  function refreshAreaViewport() {
    if (!map || !rawMarkersGeoJson || !rawMarkersGeoJson.features) return;
    var bounds;
    try { bounds = map.getBounds(); } catch (e) { return; }
    var seen = new Set();
    var aliveIds = new Set();
    rawMarkersGeoJson.features.forEach(function(f) {
      var p = f.properties;
      var animalId = String(p.animal_id || p.id);
      if (seen.has(animalId)) return;
      seen.add(animalId);
      var rings = getAreaRingsOf(p);
      if (rings.length === 0) return;
      aliveIds.add(animalId);

      var intersects = rings.some(function(ring) { return ringBboxIntersectsBounds(ring, bounds); });
      var ptLat = null, ptLng = null;
      if (f.geometry && f.geometry.coordinates && f.geometry.coordinates.length >= 2) {
        ptLng = parseFloat(f.geometry.coordinates[0]);
        ptLat = parseFloat(f.geometry.coordinates[1]);
      }
      var pointVisible = (ptLat !== null && !isNaN(ptLat) && bounds.contains([ptLat, ptLng]));
      var existing = areaProxyByAnimal.get(animalId);

      if (intersects && !pointVisible) {
        var center = bounds.getCenter();
        var valid = null;
        try {
          valid = findValidPointForAnimal(p, bounds.getSouth(), bounds.getNorth(), bounds.getWest(), bounds.getEast(), center.lat, center.lng);
        } catch (e) { valid = null; }
        if (!valid) return;
        if (existing) {
          existing.setLatLng(valid);
        } else {
          var proxy = L.marker(valid, { icon: createAnimalIcon(p) });
          proxy.on('click', function() { showDetails(p.animal_id); });
          proxy.addTo(map);
          areaProxyByAnimal.set(animalId, proxy);
        }
      } else if (existing) {
        map.removeLayer(existing);
        areaProxyByAnimal.delete(animalId);
      }
    });
    // Remove proxies de animais que não existem mais nos dados (ex.: após reload)
    areaProxyByAnimal.forEach(function(marker, animalId) {
      if (!aliveIds.has(animalId) && !seen.has(animalId)) {
        map.removeLayer(marker);
        areaProxyByAnimal.delete(animalId);
      }
    });
  }

  function areaPolygonToTurf(polygonCoords) {
    if (!polygonCoords || !Array.isArray(polygonCoords) || polygonCoords.length < 3) return null;
    try {
      const ring = polygonCoords.map(pt => [parseFloat(pt[1]), parseFloat(pt[0])]);
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
      return turf.polygon([ring]);
    } catch (e) {
      return null;
    }
  }

  function isPointInsidePolygon(lat, lng, polygonCoords) {
    if (!polygonCoords || !Array.isArray(polygonCoords) || polygonCoords.length < 3) return true;

    if (window.turf) {
      try {
        const pt = turf.point([parseFloat(lng), parseFloat(lat)]);
        const poly = areaPolygonToTurf(polygonCoords);
        if (poly) {
          return turf.booleanPointInPolygon(pt, poly);
        }
      } catch (e) {
        // Fallback para ray casting se turf falhar
      }
    }

    let inside = false;
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
      const xi = parseFloat(polygonCoords[i][0]), yi = parseFloat(polygonCoords[i][1]);
      const xj = parseFloat(polygonCoords[j][0]), yj = parseFloat(polygonCoords[j][1]);
      const intersect = ((yi > pLng) !== (yj > pLng)) && (pLat < (xj - xi) * (pLng - yi) / (yj - yi + 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function getPolygonCentroid(polygonCoords) {
    if (!polygonCoords || !Array.isArray(polygonCoords) || polygonCoords.length === 0) return null;
    let sumLat = 0, sumLng = 0;
    polygonCoords.forEach(pt => {
      sumLat += parseFloat(pt[0]);
      sumLng += parseFloat(pt[1]);
    });
    return [sumLat / polygonCoords.length, sumLng / polygonCoords.length];
  }

  function renderDebugPolygons() {
    debugPolygonsLayer.clearLayers();
    if (!$("#toggle-debug-areas").is(":checked") || !rawMarkersGeoJson || !rawMarkersGeoJson.features) {
      return;
    }

    const renderedAnimals = new Set();
    rawMarkersGeoJson.features.forEach(f => {
      const p = f.properties;
      const animalId = p.animal_id || p.id;
      if (renderedAnimals.has(animalId)) return;
      renderedAnimals.add(animalId);

      if (p.area_polygon && Array.isArray(p.area_polygon) && p.area_polygon.length > 0) {
        const rings = (Array.isArray(p.area_polygon[0]) && Array.isArray(p.area_polygon[0][0])) ? p.area_polygon : [p.area_polygon];
        const strokeColor = p.area_polygon_color || '#FFAA44';

        rings.forEach(ring => {
          if (!ring || ring.length < 3) return;
          const poly = L.polygon(ring, {
            color: strokeColor,
            fillColor: strokeColor,
            fillOpacity: 0.3,
            weight: 3,
            dashArray: '6, 6'
          }).addTo(debugPolygonsLayer);

          poly.bindTooltip(`
            <div style="font-weight: 800; color: ${strokeColor}; background: #1B1A22; padding: 4px 8px; border-radius: 6px; border: 1px solid ${strokeColor};">
              <i class="fa-solid fa-draw-polygon me-1"></i> Área de Ocorrência: ${p.nome_comum}
            </div>
          `, { sticky: true });
        });
      }
    });
  }

  $(document).on("change", "#toggle-debug-areas", function() {
    renderDebugPolygons();
    renderAreaPolygons();
  });

  function isPointInsideGeometry(lat, lng, geom) {
    if (!geom || !window.turf) return false;
    try {
      const pt = turf.point([lng, lat]);
      if (geom.type === 'FeatureCollection') {
        for (const f of geom.features) {
          if (turf.booleanPointInPolygon(pt, f)) return true;
        }
        return false;
      }
      return turf.booleanPointInPolygon(pt, geom);
    } catch (e) {
      return false;
    }
  }

  function isPointInsideAnimalBiomes(lat, lng, p) {
    if (!p || !p.biomas || !Array.isArray(p.biomas) || p.biomas.length === 0) {
      return true;
    }

    let hasAtlantic = false;
    let hasPampa = false;
    let hasCerrado = false;
    let knownCount = 0;

    p.biomas.forEach(b => {
      let name = '';
      let id = null;
      if (typeof b === 'object' && b !== null) {
        name = (b.nome || '').toLowerCase();
        id = b.id;
      } else if (typeof b === 'string') {
        name = b.toLowerCase();
      } else if (typeof b === 'number') {
        id = b;
      }

      if (id === 1 || name.includes('atlantic') || name.includes('atlântica') || name.includes('mata')) {
        hasAtlantic = true;
        knownCount++;
      }
      if (id === 2 || name.includes('pampa')) {
        hasPampa = true;
        knownCount++;
      }
      if (id === 3 || name.includes('cerrado')) {
        hasCerrado = true;
        knownCount++;
      }
    });

    if (knownCount === 0 || (hasAtlantic && hasPampa && hasCerrado)) {
      return true;
    }

    if (!forestGeometry && !pampaGeometry && !cerradoGeometry) {
      return true;
    }

    if (hasAtlantic && forestGeometry && isPointInsideGeometry(lat, lng, forestGeometry)) {
      return true;
    }
    if (hasPampa && pampaGeometry && isPointInsideGeometry(lat, lng, pampaGeometry)) {
      return true;
    }
    if (hasCerrado && cerradoGeometry && isPointInsideGeometry(lat, lng, cerradoGeometry)) {
      return true;
    }

    return false;
  }

  function isPointValidForAnimal(lat, lng, p, validRings) {
    // 1. Biome Restriction
    if (!isPointInsideAnimalBiomes(lat, lng, p)) {
      return false;
    }

    // 2. Custom Area Polygon Restriction (if defined)
    if (validRings && validRings.length > 0) {
      let insideAnyRing = false;
      for (const ring of validRings) {
        if (isPointInsidePolygon(lat, lng, ring)) {
          insideAnyRing = true;
          break;
        }
      }
      if (!insideAnyRing) return false;
    }

    return true;
  }

  function findValidPointForAnimal(p, minLat, maxLat, minLng, maxLng, gridLat, gridLng) {
    const rawPolygon = p.area_polygon;
    let validRings = [];

    if (rawPolygon && Array.isArray(rawPolygon) && rawPolygon.length > 0) {
      const rings = (Array.isArray(rawPolygon[0]) && Array.isArray(rawPolygon[0][0])) ? rawPolygon : [rawPolygon];
      validRings = rings.filter(r => r && r.length >= 3);
    }

    // 1. Test grid point
    if (gridLat >= minLat && gridLat <= maxLat && gridLng >= minLng && gridLng <= maxLng) {
      if (isPointValidForAnimal(gridLat, gridLng, p, validRings)) {
        return [gridLat, gridLng];
      }
    }

    // 2. Sample grid across current viewport
    const steps = 12;
    const stepLat = (maxLat - minLat) / steps;
    const stepLng = (maxLng - minLng) / steps;

    for (let r = 1; r < steps; r++) {
      for (let c = 1; c < steps; c++) {
        const testLat = minLat + r * stepLat;
        const testLng = minLng + c * stepLng;
        if (isPointValidForAnimal(testLat, testLng, p, validRings)) {
          return [testLat, testLng];
        }
      }
    }

    // 3. Check vertices of custom area polygon inside viewport
    if (validRings.length > 0) {
      for (const ring of validRings) {
        for (let i = 0; i < ring.length; i++) {
          const vLat = parseFloat(ring[i][0]);
          const vLng = parseFloat(ring[i][1]);
          if (vLat >= minLat && vLat <= maxLat && vLng >= minLng && vLng <= maxLng) {
            if (isPointValidForAnimal(vLat, vLng, p, validRings)) {
              return [vLat, vLng];
            }
          }
        }
      }
    }

    // 4. Turf pointOnFeature for custom area polygon OR biome geometries inside viewport
    if (window.turf) {
      if (validRings.length > 0) {
        for (const ring of validRings) {
          const poly = areaPolygonToTurf(ring);
          if (poly) {
            const pof = turf.pointOnFeature(poly);
            const pofLat = pof.geometry.coordinates[1];
            const pofLng = pof.geometry.coordinates[0];
            if (pofLat >= minLat && pofLat <= maxLat && pofLng >= minLng && pofLng <= maxLng) {
              if (isPointValidForAnimal(pofLat, pofLng, p, validRings)) {
                return [pofLat, pofLng];
              }
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Converte bbox em chave de cache (arredondada a 1 decimal para maior hit rate).
   */
  function _bboxKey(b) {
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
      .map(n => Math.round(n * 10) / 10).join(',');
  }

  /**
   * Carrega marcadores da API para o viewport atual.
   * Usa cache para evitar re-requests da mesma área.
   */
  function loadMarkersForViewport() {
    if (_loadingMarkers) return;
    const bounds = map.getBounds();
    const key = _bboxKey(bounds);

    if (_markerCache.has(key)) return; // já carregado
    _loadingMarkers = true;
    _markerCache.set(key, true);

    const bbox = [
      bounds.getWest().toFixed(4),
      bounds.getSouth().toFixed(4),
      bounds.getEast().toFixed(4),
      bounds.getNorth().toFixed(4)
    ].join(',');

    $.getJSON(`/api/markers?bbox=${bbox}`, function (data) {
      const newMarkers = [];
      (data.features || []).forEach(feature => {
        const id = feature.properties.animal_id;
        if (_allFeatures.has(id)) return; // já existe no mapa
        _allFeatures.set(id, feature);

        // Atualiza markersData para pesquisa
        const p = feature.properties;
        if (feature.geometry && feature.geometry.coordinates) {
          p.lng = feature.geometry.coordinates[0];
          p.lat = feature.geometry.coordinates[1];
        }
        markersData.push(p);

        const marker = createMarkerFromFeature(feature);
        if (marker) newMarkers.push(marker);
      });

      if (newMarkers.length > 0) {
        markersCluster.addLayers(newMarkers); // batch add — muito mais rápido
      }

      // Atualiza rawMarkersGeoJson para renderDebugPolygons
      rawMarkersGeoJson = {
        type: 'FeatureCollection',
        features: Array.from(_allFeatures.values())
      };
      renderDebugPolygons();
      renderAreaPolygons();
      refreshAreaViewport();
    }).always(function () {
      _loadingMarkers = false;
    });
  }

  /**
   * Carregamento inicial: busca todos os marcadores de uma vez (sem bbox)
   * para preencher o mapa rapidamente ao abrir.
   */
  function loadMarkers() {
    _loadingMarkers = true;
    $.getJSON('/api/markers', function (data) {
      const markers = [];
      (data.features || []).forEach(feature => {
        const id = feature.properties.animal_id;
        if (_allFeatures.has(id)) return;
        _allFeatures.set(id, feature);

        const p = feature.properties;
        if (feature.geometry && feature.geometry.coordinates) {
          p.lng = feature.geometry.coordinates[0];
          p.lat = feature.geometry.coordinates[1];
        }
        markersData.push(p);

        const marker = createMarkerFromFeature(feature);
        if (marker) markers.push(marker);
      });

      markersCluster.addLayers(markers);
      rawMarkersGeoJson = {
        type: 'FeatureCollection',
        features: Array.from(_allFeatures.values())
      };
      renderDebugPolygons();
      renderAreaPolygons();
      refreshAreaViewport();
    }).always(function () {
      _loadingMarkers = false;
      // Marca bbox inicial como carregado para não re-buscar
      _markerCache.set(_bboxKey(map.getBounds()), true);
    });
  }

  /**
   * Recarrega todos os marcadores do zero (limpa cache).
   * Usar após criar, editar ou excluir um animal.
   */
  function reloadMarkers() {
    _markerCache.clear();
    _allFeatures.clear();
    markersData.length = 0;
    markersCluster.clearLayers();
    areaProxyByAnimal.forEach(function(marker) { map.removeLayer(marker); });
    areaProxyByAnimal.clear();
    if (typeof areaPolygonsLayer !== 'undefined' && areaPolygonsLayer) areaPolygonsLayer.clearLayers();
    loadMarkers();
  }

  // Ao mover/zoom: carrega marcadores das novas áreas (debounced)
  let _viewportTimer = null;
  let _areaViewportTimer = null;
  map.on('moveend zoomend', function () {
    clearTimeout(_viewportTimer);
    _viewportTimer = setTimeout(loadMarkersForViewport, 300);
    clearTimeout(_areaViewportTimer);
    _areaViewportTimer = setTimeout(refreshAreaViewport, 350);
  });

  // =========================================================================
  // 6. MODO ADMINISTRADOR (Login, Context Menu & Modal Split-Screen)
  // =========================================================================
  var draftMarker = null;
  var draftZone = null;
  var lastClickedLatLng = null;

  function isAdminModeActive() {
    return sessionStorage.getItem("adminMode") === "true";
  }

  function updateAdminUI() {
    if (isAdminModeActive()) {
      $("#admin-mode-badge").removeClass("d-none");
      $("#admin-debug-toggle-container").removeClass("d-none");
      $("#toggle-debug-areas").prop("checked", true);
      renderDebugPolygons();
      renderAreaPolygons();
      $("#admin-btn").addClass("admin-active").attr("title", "Clique para encerrar o Modo Administrador");
      $("#admin-btn").attr("href", "#");
    } else {
      $("#admin-mode-badge").addClass("d-none");
      $("#admin-debug-toggle-container").addClass("d-none");
      $("#toggle-debug-areas").prop("checked", false);
      renderDebugPolygons();
      renderAreaPolygons();
      $("#admin-btn").removeClass("admin-active").attr("title", "Acesso Administrador");
      $("#admin-btn").attr("href", "/admin/login");
      closeAdminDrawer();
    }
  }

  $("#admin-btn").click(function(e) {
    if (isAdminModeActive()) {
      e.preventDefault();
      if (confirm("Deseja sair do Modo Administrador e retornar ao modo normal?")) {
        sessionStorage.removeItem("adminMode");
        updateAdminUI();
        alert("Modo Administrador encerrado.");
      }
    }
  });

  updateAdminUI();

  // Menu de Contexto no Mapa
  map.on('contextmenu', function(e) {
    if (!isAdminModeActive()) return;

    lastClickedLatLng = e.latlng;
    var containerPoint = e.containerPoint;
    var menu = $("#admin-context-menu");
    
    menu.html(`
      <div class="admin-menu-item" data-action="preservacao">
        <i class="fa-solid fa-shield-halved text-success"></i>
        <span>Criar área de preservação</span>
      </div>
      <div class="admin-menu-item" data-action="animal">
        <i class="fa-solid fa-paw text-warning"></i>
        <span>Criar animal</span>
      </div>
      <div class="admin-menu-item" data-action="ong">
        <i class="fa-solid fa-hand-holding-heart text-info"></i>
        <span>Criar ONG</span>
      </div>
    `);

    menu.find(".admin-menu-item").click(function() {
      var action = $(this).data("action");
      menu.addClass("d-none");
      if (lastClickedLatLng) {
        openAdminDrawer(action, lastClickedLatLng);
      }
    });

    menu.css({
      left: containerPoint.x + "px",
      top: containerPoint.y + "px"
    }).removeClass("d-none");
  });

  $(document).on("click", function(e) {
    if (!$(e.target).closest("#admin-context-menu").length) {
      $("#admin-context-menu").addClass("d-none");
    }
  });

  // Abertura do Drawer para Edição
  function openAdminDrawerForEdit(feature) {
    closeAdminDrawer();
    const props = feature.properties || feature;
    let lat = -27.59;
    let lng = -48.54;

    if (feature.geometry && feature.geometry.coordinates) {
      lng = parseFloat(feature.geometry.coordinates[0].toFixed(6));
      lat = parseFloat(feature.geometry.coordinates[1].toFixed(6));
    } else if (props.lat && props.lng) {
      lat = parseFloat(parseFloat(props.lat).toFixed(6));
      lng = parseFloat(parseFloat(props.lng).toFixed(6));
    }

    $("#species-admin-modal").removeClass("d-none");
    const form = $("#form-create-animal");
    form[0].reset();

    $("#animal-edit-id").val(props.animal_id || props.id || "");
    form.find(".coord-lat").val(lat);
    form.find(".coord-lng").val(lng);
    form.find('input[name="nome_comum"]').val(props.nome_comum || "");
    form.find('input[name="nome_cientifico"]').val(props.nome_cientifico || "");
    form.find('select[name="classe"]').val(props.classe || "Mammalia");
    form.find('input[name="familia"]').val(props.familia || "");
    form.find('input[name="peso"]').val(props.peso || "");
    form.find('input[name="altura"]').val(props.altura || "");
    form.find('input[name="dieta"]').val(props.dieta || "");
    form.find('textarea[name="habitos"]').val(props.habitos || "");
    form.find('textarea[name="obs"]').val(props.obs || "");

    if (props.nivel_extincao_id) {
      form.find(".select-nivel-extincao").val(props.nivel_extincao_id).trigger('change');
    }

    modalSelectedFiles = [];
    const imgsList = props.imagens || [];
    if (Array.isArray(imgsList) && imgsList.length > 0) {
      imgsList.forEach(img => {
        let u = typeof img === 'string' ? img : (img && img.imagem ? img.imagem : '');
        if (u) {
          if (!u.startsWith('http') && !u.startsWith('/') && !u.startsWith('data:')) u = `/media/${u}`;
          modalSelectedFiles.push({
            id: String(Date.now() + Math.random()),
            file: u,
            currentX: 0,
            currentY: 0,
            scale: 1.0
          });
        }
      });
    }
    renderModalImageGallery();

    let iconUrl = props.icone;
    if (iconUrl) {
      if (!iconUrl.startsWith('http') && !iconUrl.startsWith('/') && !iconUrl.startsWith('data:')) iconUrl = `/media/${iconUrl}`;
      $('#modal-icon-preview-img').attr('src', iconUrl).removeClass('d-none');
      $('#modal-icon-placeholder-content').addClass('d-none');
    } else {
      $('#modal-icon-preview-img').attr('src', '').addClass('d-none');
      $('#modal-icon-placeholder-content').removeClass('d-none');
    }

    loadAdminSelectOptions(function() {
      if (props.nivel_extincao_id) {
        form.find(".select-nivel-extincao").val(props.nivel_extincao_id).trigger('change');
      }
      if (props.biomas && Array.isArray(props.biomas)) {
        const biomaIds = props.biomas.map(b => String(typeof b === 'object' ? b.id : b));
        $('#modal-biomes-tag-selector .biome-chip').each(function() {
          const chipId = String($(this).attr('data-id'));
          const isSel = biomaIds.includes(chipId);
          $(this).attr('data-selected', isSel ? 'true' : 'false');
          const icon = $(this).find('.chip-icon');
          if (isSel) icon.removeClass('fa-plus').addClass('fa-check');
          else icon.removeClass('fa-check').addClass('fa-plus');
        });
        form.find(".select-biomas").val(biomaIds);
      }
    });

    initModalRightPanelMap(lat, lng);

    if (props.area_polygon) {
      let data = props.area_polygon;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e){}
      }
      if (data && typeof data === 'object' && !Array.isArray(data) && data.polygons) {
        modalPolygonColor = data.color || '#FFAA44';
        modalDraftPolygonsList = data.polygons;
      } else if (Array.isArray(data) && data.length > 0) {
        modalPolygonColor = props.area_polygon_color || '#FFAA44';
        if (Array.isArray(data[0]) && Array.isArray(data[0][0])) {
          modalDraftPolygonsList = data;
        } else {
          modalDraftPolygonsList = [data];
        }
      } else {
        modalDraftPolygonsList = [[]];
      }
      $('#modal-polygon-color-picker').val(modalPolygonColor);
      redrawModalDraftPolygonLayers();
    } else {
      modalDraftPolygonsList = [[]];
      redrawModalDraftPolygonLayers();
    }
  }

  let modalRightMap = null;
  let modalRightMarker = null;

  function openAdminDrawer(action, latlng) {
    closeAdminDrawer();
    $("#animal-edit-id").val("");

    const lat = parseFloat(latlng.lat.toFixed(6));
    const lng = parseFloat(latlng.lng.toFixed(6));

    if (action === "animal") {
      $("#species-admin-modal").removeClass("d-none");
      const form = $("#form-create-animal");
      form[0].reset();
      form.find(".coord-lat").val(lat);
      form.find(".coord-lng").val(lng);

      modalSelectedFiles = [];
      renderModalImageGallery();
      $('#modal-icon-preview-img').attr('src', '').addClass('d-none');
      $('#modal-icon-placeholder-content').removeClass('d-none');
      $('#modal-input-icon-base64').val('');

      $("#modal-toggle-map").addClass("active");
      $("#modal-toggle-list").removeClass("active");
      $("#modal-panel-map").removeClass("d-none");
      $("#modal-panel-list").addClass("d-none");

      isModalDrawingPolygon = false;
      $('#modal-btn-draw-polygon-mode')
        .removeClass('btn-success text-white')
        .addClass('btn-info text-dark')
        .html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
      modalDraftPolygonsList = [[]];
      modalPolygonHistory = [];
      modalPolygonRedo = [];
      updateModalUndoRedoButtonsUI();

      initModalRightPanelMap(lat, lng);
      loadAdminSelectOptions();
    } 
    else if (action === "preservacao" || action === "ong") {
      $("#admin-sidebar-drawer").removeClass("d-none");
      $(".admin-form").addClass("d-none");

      if (action === "preservacao") {
        $("#drawer-title").text("Criar Área de Preservação");
        const form = $("#form-create-preservacao");
        form.removeClass("d-none");
        form.find(".coord-lat, .input-lat").val(lat);
        form.find(".coord-lng, .input-lng").val(lng);

        const radius = parseInt(form.find(".input-radius").val()) || 5000;
        draftMarker = L.marker(latlng, { draggable: true }).addTo(map);
        draftZone = L.circle(latlng, {
          radius: radius,
          color: "#287f5e",
          fillColor: "#287f5e",
          fillOpacity: 0.4
        }).addTo(map);
        setupZoneDragAndResizeEvents(form, draftMarker, draftZone);
      } 
      else if (action === "ong") {
        $("#drawer-title").text("Criar ONG");
        const form = $("#form-create-ong");
        form.removeClass("d-none");
        form.find(".coord-lat, .input-lat").val(lat);
        form.find(".coord-lng, .input-lng").val(lng);

        draftMarker = L.marker(latlng, {
          draggable: true,
          icon: L.divIcon({
            className: 'custom-animal-marker',
            html: `<div class="marker-pin" style="border-color: #3498db;"><i class="fa-solid fa-hand-holding-heart text-info" style="font-size: 18px;"></i></div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          })
        }).addTo(map);
        setupMarkerDragEvents(form, draftMarker);
      }
    }
  }

  // Minimapa 100% IDÊNTICO ao Mapa Principal no Modal Split-Screen
  function initModalRightPanelMap(lat, lng) {
    setTimeout(() => {
      if (!modalRightMap) {
        const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_3l5t_1_889f4489a3fb5fb5051816e3', {
          maxZoom: 19,
          attribution: '© CARTO'
        });

        modalRightMap = L.map('modal-right-panel-map', {
          center: [lat, lng],
          zoom: 7,
          layers: [darkTile],
          zoomControl: true,
          attributionControl: false
        });

        const svgRenderer = L.svg({ padding: 0 });
        const pampasLayerM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#3b7ba5", fillOpacity: 0.3 } }).addTo(modalRightMap);
        const pampasPatternM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#pampa-pattern-mod)", fillOpacity: 0.6 } }).addTo(modalRightMap);
        const cerradoLayerM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#E6C140", fillOpacity: 0.4 } }).addTo(modalRightMap);
        const cerradoPatternM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#cerrado-pattern-mod)", fillOpacity: 0.6 } }).addTo(modalRightMap);
        const atlanticLayerM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#287f5e", fillOpacity: 0.1 } }).addTo(modalRightMap);
        const atlanticPatternM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#tree-pattern-mod)", fillOpacity: 0.6 } }).addTo(modalRightMap);

        const modalMask = L.polygon(maskPaths, {
          color: "transparent",
          fillColor: "#000000",
          fillOpacity: 0.6,
          pointerEvents: "none",
          fillRule: 'evenodd'
        }).addTo(modalRightMap);

        // Carregar camadas GeoJSON
        const requests = [
          $.getJSON("/data/ATLANTIC_FOREST_LAW.json"),
          $.getJSON("/data/br_pr.json"),
          $.getJSON("/data/br_sc.json"),
          $.getJSON("/data/br_rs.json")
        ];

        $.when.apply($, requests).done(function(forestRes, prRes, scRes, rsRes) {
          const forestData = forestRes[0] || forestRes;
          const prData = prRes[0] || prRes;
          const scData = scRes[0] || scRes;
          const rsData = rsRes[0] || rsRes;

          if (window.turf) {
            try {
              const simplifiedForest = turf.simplify(forestData, { tolerance: 0.005, highPrecision: false });
              atlanticLayerM.addData(simplifiedForest);
              atlanticPatternM.addData(simplifiedForest);

              let merged = simplifiedForest.features[0];
              for (let i = 1; i < simplifiedForest.features.length; i++) {
                try {
                  let union = turf.union(merged, simplifiedForest.features[i]);
                  if (union) merged = union;
                } catch(e) {}
              }
              const cleanForest = turf.simplify(turf.buffer(merged, 0), { tolerance: 0.003 });

              if (rsData.features && cleanForest) {
                const pampaDiff = turf.difference(turf.simplify(turf.buffer(rsData.features[0], 0), { tolerance: 0.003 }), cleanForest);
                if (pampaDiff) { pampasLayerM.addData(pampaDiff); pampasPatternM.addData(pampaDiff); }
              }
              if (prData.features && cleanForest) {
                const cerradoDiff = turf.difference(turf.simplify(turf.buffer(prData.features[0], 0), { tolerance: 0.003 }), cleanForest);
                if (cerradoDiff) { cerradoLayerM.addData(cerradoDiff); cerradoPatternM.addData(cerradoDiff); }
              }
            } catch (e) {}
          }

          L.geoJson(prData, { style: { color: "#1E7552", weight: 2, fillOpacity: 0, clickable: false } }).addTo(modalRightMap);
          L.geoJson(scData, { style: { color: "#FF0000", weight: 2, fillOpacity: 0, clickable: false } }).addTo(modalRightMap);
          L.geoJson(rsData, { style: { color: "#FFFF00", weight: 2, fillOpacity: 0, clickable: false } }).addTo(modalRightMap);

          injectModalTreePatterns();
        });

        // Carregar marcadores existentes no minimapa
        $.getJSON('/api/markers', function(data) {
          if (data && data.features) {
            L.geoJSON(data, {
              pointToLayer: function(feature, latlng) {
                const p = feature.properties;
                const statusSigla = p.nivel_sigla ? p.nivel_sigla.toLowerCase() : 'dd';
                const borderColor = extinctionColorMap[statusSigla] || '#1a5fb4';
                const iconSrc = p.icone || (p.imagens && p.imagens.length > 0 ? p.imagens[0].imagem : '/assets/img/logotipo.png');

                return L.marker(latlng, {
                  icon: L.divIcon({
                    className: 'custom-animal-marker',
                    html: `
                      <div class="marker-pin" style="border-color: ${borderColor};">
                        <div class="marker-avatar">
                          <img src="${iconSrc}" alt="${p.nome_comum}">
                        </div>
                        <span class="marker-name-label">${p.nome_comum}</span>
                      </div>
                    `,
                    iconSize: [36, 36],
                    iconAnchor: [18, 18]
                  })
                });
              }
            }).addTo(modalRightMap);
          }
        });

        modalRightMarker = L.marker([lat, lng], {
          draggable: true,
          icon: L.divIcon({
            className: 'custom-animal-marker',
            html: `
              <div class="marker-pin" style="border-color: #FFA63A; background: #9C5B1C;">
                <div class="marker-avatar">
                  <i class="fa-solid fa-crosshairs" style="color: #9C5B1C; font-size: 16px;"></i>
                </div>
                <span class="marker-name-label" style="opacity: 1; max-width: 200px;">Posição</span>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        }).addTo(modalRightMap);

        modalRightMap.on('click', function(e) {
          if (isModalDrawingPolygon) {
            saveModalPolygonHistoryState();
            const lat = parseFloat(e.latlng.lat.toFixed(6));
            const lng = parseFloat(e.latlng.lng.toFixed(6));
            if (modalDraftPolygonsList.length === 0) modalDraftPolygonsList.push([]);
            modalDraftPolygonsList[modalDraftPolygonsList.length - 1].push([lat, lng]);
            redrawModalDraftPolygonLayers();
          } else {
            const latFixed = e.latlng.lat.toFixed(6);
            const lngFixed = e.latlng.lng.toFixed(6);
            $("#form-create-animal").find(".coord-lat").val(latFixed);
            $("#form-create-animal").find(".coord-lng").val(lngFixed);
            $("#modal-coordenadas-json-hidden").val(JSON.stringify([{ lat: parseFloat(latFixed), lng: parseFloat(lngFixed) }]));
            if (modalRightMarker) {
              modalRightMarker.setLatLng(e.latlng);
            }
          }
        });

        modalRightMarker.on('dragend', function(e) {
          const pos = e.target.getLatLng();
          $("#form-create-animal").find(".coord-lat").val(pos.lat.toFixed(6));
          $("#form-create-animal").find(".coord-lng").val(pos.lng.toFixed(6));
          $("#modal-coordenadas-json-hidden").val(JSON.stringify([{ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) }]));
        });
      } else {
        modalRightMap.invalidateSize();
        modalRightMap.setView([lat, lng], 8);
        if (modalRightMarker) {
          modalRightMarker.setLatLng([lat, lng]);
        }
      }
      redrawModalDraftPolygonLayers();
    }, 200);
  }
  let modalDraftPolygonsList = [[]];
  let modalPolygonColor = '#FFAA44';
  let modalPolygonHistory = [];
  let modalPolygonRedo = [];
  let modalPolygonLayersGroup = null;

  function updateModalUndoRedoButtonsUI() {
    $('#modal-btn-undo-polygon').prop('disabled', modalPolygonHistory.length === 0).toggleClass('opacity-50', modalPolygonHistory.length === 0);
    $('#modal-btn-redo-polygon').prop('disabled', modalPolygonRedo.length === 0).toggleClass('opacity-50', modalPolygonRedo.length === 0);
  }

  function saveModalPolygonHistoryState() {
    const stateCopy = {
      color: modalPolygonColor,
      polygons: JSON.parse(JSON.stringify(modalDraftPolygonsList))
    };
    modalPolygonHistory.push(stateCopy);
    if (modalPolygonHistory.length > 50) modalPolygonHistory.shift();
    modalPolygonRedo = [];
    updateModalUndoRedoButtonsUI();
  }

  function undoModalPolygonState() {
    if (modalPolygonHistory.length === 0) return;
    const currentState = {
      color: modalPolygonColor,
      polygons: JSON.parse(JSON.stringify(modalDraftPolygonsList))
    };
    modalPolygonRedo.push(currentState);
    const prevState = modalPolygonHistory.pop();
    modalPolygonColor = prevState.color || '#FFAA44';
    $('#modal-polygon-color-picker').val(modalPolygonColor);
    modalDraftPolygonsList = prevState.polygons || [[]];
    redrawModalDraftPolygonLayers();
    updateModalUndoRedoButtonsUI();
  }

  function redoModalPolygonState() {
    if (modalPolygonRedo.length === 0) return;
    const currentState = {
      color: modalPolygonColor,
      polygons: JSON.parse(JSON.stringify(modalDraftPolygonsList))
    };
    modalPolygonHistory.push(currentState);
    const nextState = modalPolygonRedo.pop();
    modalPolygonColor = nextState.color || '#FFAA44';
    $('#modal-polygon-color-picker').val(modalPolygonColor);
    modalDraftPolygonsList = nextState.polygons || [[]];
    redrawModalDraftPolygonLayers();
    updateModalUndoRedoButtonsUI();
  }

  window.editModalPolygonRingByRef = function(ringIndex) {
    saveModalPolygonHistoryState();
    if (ringIndex >= 0 && ringIndex < modalDraftPolygonsList.length) {
      const target = modalDraftPolygonsList.splice(ringIndex, 1)[0];
      modalDraftPolygonsList.push(target);
      redrawModalDraftPolygonLayers();
    }
    if (modalRightMap) modalRightMap.closePopup();
  };

  window.deleteModalPolygonRingByRef = function(ringIndex) {
    saveModalPolygonHistoryState();
    if (ringIndex >= 0 && ringIndex < modalDraftPolygonsList.length) {
      modalDraftPolygonsList.splice(ringIndex, 1);
    }
    if (modalDraftPolygonsList.length === 0) {
      modalDraftPolygonsList = [[]];
    }
    redrawModalDraftPolygonLayers();
    if (modalRightMap) modalRightMap.closePopup();
  };

  function updateModalPolygonHiddenInput() {
    const validPolygons = modalDraftPolygonsList.filter(ring => ring && ring.length >= 3);
    const totalPoints = validPolygons.reduce((acc, ring) => acc + ring.length, 0);

    const currentRing = modalDraftPolygonsList[modalDraftPolygonsList.length - 1];
    const currentPts = (currentRing && currentRing.length > 0) ? currentRing.length : 0;

    if (validPolygons.length > 0 || currentPts > 0) {
      const payload = {
        color: modalPolygonColor,
        polygons: validPolygons
      };
      $('#modal-area-polygon-json-hidden').val(JSON.stringify(payload));
      
      let badgeText = `Área: ${validPolygons.length} área(s) (${totalPoints} pts)`;
      if (isModalDrawingPolygon && currentPts < 3) {
        badgeText = `Desenhando: ${currentPts} ponto(s)... (mín 3)`;
      } else if (isModalDrawingPolygon) {
        badgeText = `Desenhando: ${currentPts} pts na área atual`;
      }

      $('#modal-polygon-status-badge')
        .text(badgeText)
        .removeClass('bg-dark text-warning')
        .addClass('bg-success text-white');
    } else {
      $('#modal-area-polygon-json-hidden').val('');
      $('#modal-polygon-status-badge')
        .text('Área: Todo o Mapa')
        .removeClass('bg-success text-white')
        .addClass('bg-dark text-warning');
    }
  }

  function redrawModalDraftPolygonLayers() {
    if (!modalRightMap) return;
    if (!modalPolygonLayersGroup) {
      modalPolygonLayersGroup = L.layerGroup().addTo(modalRightMap);
    } else {
      modalPolygonLayersGroup.clearLayers();
    }

    modalDraftPolygonsList.forEach((ring, idx) => {
      if (!ring || ring.length === 0) return;
      const isCurrentActive = (idx === modalDraftPolygonsList.length - 1);
      let polyLayer = null;

      ring.forEach((pt) => {
        L.circleMarker(pt, {
          radius: 5,
          color: modalPolygonColor,
          fillColor: '#FFFFFF',
          fillOpacity: 1,
          weight: 2,
          interactive: false
        }).addTo(modalPolygonLayersGroup);
      });

      if (ring.length >= 3) {
        polyLayer = L.polygon(ring, {
          color: modalPolygonColor,
          fillColor: modalPolygonColor,
          fillOpacity: isCurrentActive ? 0.4 : 0.25,
          weight: isCurrentActive ? 3 : 2,
          dashArray: isCurrentActive ? '5, 5' : null,
          interactive: !isModalDrawingPolygon
        }).addTo(modalPolygonLayersGroup);
      } else if (ring.length > 0) {
        polyLayer = L.polyline(ring, {
          color: modalPolygonColor,
          weight: 3,
          dashArray: '5, 5',
          interactive: !isModalDrawingPolygon
        }).addTo(modalPolygonLayersGroup);
      }

      if (polyLayer && !isModalDrawingPolygon) {
        const ringIndex = idx;
        polyLayer.on('contextmenu', function(e) {
          L.DomEvent.stopPropagation(e);
          
          const popupContent = `
            <div style="text-align: center; padding: 4px; min-width: 140px;">
              <strong style="color: ${modalPolygonColor}; font-size: 13px;">Área #${ringIndex + 1} (${ring.length} pts)</strong>
              <div class="d-flex flex-column gap-2 mt-2">
                <button type="button" class="btn btn-sm btn-info rounded-pill fw-bold text-dark" onclick="editModalPolygonRingByRef(${ringIndex})">
                  <i class="fa-solid fa-pen me-1"></i> Editar Área
                </button>
                <button type="button" class="btn btn-sm btn-danger rounded-pill fw-bold" onclick="deleteModalPolygonRingByRef(${ringIndex})">
                  <i class="fa-solid fa-trash me-1"></i> Excluir Área
                </button>
              </div>
            </div>
          `;

          L.popup()
            .setLatLng(e.latlng)
            .setContent(popupContent)
            .openOn(modalRightMap);
        });
      }
    });

    updateModalPolygonHiddenInput();
  }

  $(document).on('click', '#modal-btn-draw-polygon-mode', function() {
    isModalDrawingPolygon = !isModalDrawingPolygon;
    if (isModalDrawingPolygon) {
      $(this).removeClass('btn-info text-dark').addClass('btn-success text-white');
      $(this).html('<i class="fa-solid fa-check me-1"></i> Concluir Polígono');
      if (modalRightMap) modalRightMap.getContainer().style.cursor = 'crosshair';
    } else {
      $(this).removeClass('btn-success text-white').addClass('btn-info text-dark');
      $(this).html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
      if (modalRightMap) modalRightMap.getContainer().style.cursor = '';
    }
    redrawModalDraftPolygonLayers();
  });

  $(document).on('click', '#modal-btn-new-polygon-area', function() {
    const lastRing = modalDraftPolygonsList[modalDraftPolygonsList.length - 1];
    if (lastRing && lastRing.length >= 3) {
      saveModalPolygonHistoryState();
      modalDraftPolygonsList.push([]);
      redrawModalDraftPolygonLayers();
    } else {
      alert('Complete pelo menos 3 pontos no polígono atual antes de iniciar uma nova área.');
    }
  });

  $(document).on('click', '#modal-btn-undo-polygon', function() {
    undoModalPolygonState();
  });

  $(document).on('click', '#modal-btn-redo-polygon', function() {
    redoModalPolygonState();
  });

  $(document).on('change input', '#modal-polygon-color-picker', function() {
    modalPolygonColor = $(this).val();
    saveModalPolygonHistoryState();
    redrawModalDraftPolygonLayers();
  });

  $(document).on('click', '#modal-btn-clear-polygon', function() {
    saveModalPolygonHistoryState();
    modalDraftPolygonsList = [[]];
    if (modalPolygonLayersGroup) modalPolygonLayersGroup.clearLayers();
    isModalDrawingPolygon = false;
    $('#modal-btn-draw-polygon-mode').removeClass('btn-success text-white').addClass('btn-info text-dark')
      .html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
    if (modalRightMap) modalRightMap.getContainer().style.cursor = '';
    updateModalPolygonHiddenInput();
  });

  $(document).on('keydown', function(e) {
    if (!$('#species-admin-modal').is(':visible')) return;
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
      if (e.shiftKey) {
        redoModalPolygonState();
      } else {
        undoModalPolygonState();
      }
    } else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
      redoModalPolygonState();
    }
  });

  function injectModalTreePatterns() {
    const svg = document.querySelector('#modal-right-panel-map svg');
    if (!svg) return;
    const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), svg.firstChild);
    const patterns = [
      { id: 'tree-pattern-mod', img: '/svg/mataatlantica.png', size: 100, icons: [[10,10,40],[60,50,30]] },
      { id: 'pampa-pattern-mod', img: '/svg/pampa.png', size: 80, icons: [[10,10,35],[45,40,25]] },
      { id: 'cerrado-pattern-mod', img: '/svg/cerrado.png', size: 90, icons: [[10,10,40],[55,45,30]] }
    ];
    patterns.forEach(p => {
      if (!document.getElementById(p.id)) {
        const pat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pat.setAttribute('id', p.id); pat.setAttribute('patternUnits', 'userSpaceOnUse');
        pat.setAttribute('width', p.size); pat.setAttribute('height', p.size);
        p.icons.forEach(icon => {
          const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', p.img);
          img.setAttribute('x', icon[0]); img.setAttribute('y', icon[1]);
          img.setAttribute('width', icon[2]); img.setAttribute('height', icon[2]);
          img.setAttribute('opacity', '0.7');
          pat.appendChild(img);
        });
        defs.appendChild(pat);
      }
    });
  }

  $("#close-species-modal-btn, .btn-cancel-modal").click(function() {
    $("#species-admin-modal").addClass("d-none");
  });

  $("#modal-toggle-map").click(function() {
    $(this).addClass("active");
    $("#modal-toggle-list").removeClass("active");
    $("#modal-panel-map").removeClass("d-none");
    $("#modal-panel-list").addClass("d-none");
    if (modalRightMap) {
      setTimeout(() => modalRightMap.invalidateSize(), 150);
    }
  });

  $("#modal-toggle-list").click(function() {
    $(this).addClass("active");
    $("#modal-toggle-map").removeClass("active");
    $("#modal-panel-list").removeClass("d-none");
    $("#modal-panel-map").addClass("d-none");
    loadModalSpeciesCards();
  });

  function getAnimalTextureClassApp(classe) {
    if (!classe) return 'texture-default';
    const c = classe.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (c.includes('mamif') || c.includes('mammal')) return 'texture-mamiferos';
    if (c.includes('ave') || c.includes('bird')) return 'texture-aves';
    if (c.includes('rept') || c.includes('reptil')) return 'texture-repteis';
    if (c.includes('amfib') || c.includes('anfib') || c.includes('amphib')) return 'texture-anfibios';
    if (c.includes('cartilag') || c.includes('chondrichthyes')) return 'texture-peixes-cartilaginosos';
    if (c.includes('osse') || c.includes('osteichthyes') || c.includes('peix') || c.includes('fish')) return 'texture-peixes-osseos';
    return 'texture-default';
  }

  function getAnimalImagesApp(animal) {
    const images = [];
    if (animal.imagens && Array.isArray(animal.imagens) && animal.imagens.length > 0) {
      animal.imagens.forEach(imgObj => {
        const raw = typeof imgObj === 'string' ? imgObj : (imgObj && imgObj.imagem ? imgObj.imagem : '');
        if (raw && typeof raw === 'string' && raw.trim() && !raw.includes('logotipo.png') && !raw.includes('falta_imagem') && !raw.includes('Falta_imagem')) {
          const u = raw.startsWith('http') || raw.startsWith('/') || raw.startsWith('data:') ? raw : `/media/${raw}`;
          if (!images.includes(u)) images.push(u);
        }
      });
    }
    if (animal.imagem && typeof animal.imagem === 'string' && !animal.imagem.includes('logotipo.png') && !animal.imagem.includes('falta_imagem') && !animal.imagem.includes('Falta_imagem')) {
      const u = animal.imagem.startsWith('http') || animal.imagem.startsWith('/') || animal.imagem.startsWith('data:') ? animal.imagem : `/media/${animal.imagem}`;
      if (!images.includes(u)) images.push(u);
    }
    if (animal.icone && typeof animal.icone === 'string' && !animal.icone.includes('logotipo.png') && !animal.icone.includes('falta_imagem') && !animal.icone.includes('Falta_imagem')) {
      const u = animal.icone.startsWith('http') || animal.icone.startsWith('/') || animal.icone.startsWith('data:') ? animal.icone : `/media/${animal.icone}`;
      if (!images.includes(u)) images.push(u);
    }
    // De preferência de 1 a 3 imagens por card
    const finalImgs = images.slice(0, 3);
    if (finalImgs.length === 0) {
      finalImgs.push('/assets/img/logotipo.png');
    }
    return finalImgs;
  }

  let modalSlideshowInterval = null;
  function startModalSlideshows() {
    if (modalSlideshowInterval) clearInterval(modalSlideshowInterval);
    modalSlideshowInterval = setInterval(() => {
      $('#modalAnimalCardsGrid .species-card-slideshow').each(function() {
        const container = $(this);
        const imgs = container.find('.card-slide-img');
        if (imgs.length <= 1) return;

        const activeImg = container.find('.card-slide-img.active');
        let nextImg = activeImg.next('.card-slide-img');
        if (!nextImg.length) {
          nextImg = imgs.first();
        }

        const nextIndex = nextImg.index('.card-slide-img');
        container.find('.card-slide-dot').removeClass('active').eq(nextIndex).addClass('active');

        activeImg.removeClass('active').addClass('exit-left');
        nextImg.removeClass('exit-left').addClass('active');

        setTimeout(() => {
          activeImg.removeClass('exit-left');
        }, 800);
      });
    }, 3500);
  }

  function getAnimalBiomesHtmlApp(animal) {
    if (!animal.biomas || !Array.isArray(animal.biomas) || animal.biomas.length === 0) {
      return '<span class="mini-biome-chip mini-biome-chip-default">Geral</span>';
    }

    return animal.biomas.map(b => {
      let bId = '';
      let bName = '';
      if (typeof b === 'object' && b !== null) {
        bId = String(b.id || '');
        bName = b.nome || '';
      } else {
        bId = String(b);
        bName = String(b);
      }

      const nameLower = (bName || '').toLowerCase();
      let cssClass = 'mini-biome-chip-default';
      if (bId === '1' || nameLower.includes('mata')) {
        cssClass = 'biome-chip-mata-atlantica';
        bName = 'Mata Atlântica';
      } else if (bId === '2' || nameLower.includes('pampa')) {
        cssClass = 'biome-chip-pampa';
        bName = 'Pampa';
      } else if (bId === '3' || nameLower.includes('cerrado')) {
        cssClass = 'biome-chip-cerrado';
        bName = 'Cerrado';
      }

      return `<span class="mini-biome-chip ${cssClass}">${bName || 'Bioma'}</span>`;
    }).join('');
  }

  // Renderizar cards no modal com menu de 3 pontinhos e badge de extinção
  function loadModalSpeciesCards() {
    $.getJSON("/api/animals", function(data) {
      const grid = $("#modalAnimalCardsGrid");
      grid.empty();
      if (!data || data.length === 0) {
        grid.html('<div class="col-12 text-center text-muted py-4"><p>Nenhum animal cadastrado.</p></div>');
        return;
      }
      const isAdmin = isAdminModeActive();

      data.forEach((animal) => {
        const textureClass = getAnimalTextureClassApp(animal.classe);
        const formattedId = String(animal.id).padStart(4, '0');
        const dataFormatted = animal.created_at ? new Date(animal.created_at).toLocaleDateString('pt-BR') : '00/00/0000';
        const autor = animal.api_user ? (animal.api_user.username || 'adm123') : 'adm123';
        const sigla = (animal.api_nivelextincao ? animal.api_nivelextincao.sigla : (animal.nivel_sigla || 'CR')).toUpperCase();
        const extinctionColor = extinctionColorMap[sigla.toLowerCase()] || extinctionColorMap[String(animal.nivel_extincao_id)] || '#FF4068';
        const biomasHtml = getAnimalBiomesHtmlApp(animal);

        const imgs = getAnimalImagesApp(animal);
        const slidesHtml = imgs.map((src, i) => `
          <img src="${src}" alt="${animal.nome_comum}" class="card-slide-img ${i === 0 ? 'active' : ''}">
        `).join('');

        const dotsHtml = imgs.length > 1 ? `
          <div class="card-slideshow-dots">
            ${imgs.map((_, idx) => `<span class="card-slide-dot ${idx === 0 ? 'active' : ''}"></span>`).join('')}
          </div>
        ` : '';

        const menuButtonHtml = isAdmin ? `
          <button type="button" class="species-card-menu-btn" title="Opções">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>
        ` : '';

        const footerHtml = isAdmin ? `
          <div class="species-card-footer">
            <span class="species-card-id-pill">${formattedId}</span>
            <div class="species-card-meta">
              <div>@${autor}</div>
              <div>${dataFormatted}</div>
            </div>
          </div>
        ` : '';

        const card = $(`
          <div class="species-card ${textureClass}" style="cursor: pointer; background-color: ${extinctionColor};">
            ${menuButtonHtml}
            <span class="species-card-extinction-badge" style="background-color: ${extinctionColor};">${sigla}</span>
            <div class="species-card-slideshow">
              ${slidesHtml}
              ${dotsHtml}
              <div class="species-card-slideshow-overlay"></div>
            </div>
            <div class="species-card-body">
              <div class="species-card-name-wrapper">
                <span class="species-card-name" title="${animal.nome_comum}">${animal.nome_comum}</span>
                <span class="species-card-scientific-name" title="${animal.nome_cientifico || ''}">${animal.nome_cientifico || ''}</span>
              </div>
              <div class="species-card-biomes-wrapper">
                ${biomasHtml}
              </div>
              ${footerHtml}
            </div>
          </div>
        `);

        card.find('.species-card-menu-btn').click(function(e) {
          e.stopPropagation();
          $('.species-card-menu-dropdown').remove();
          const dropdown = $(`
            <div class="species-card-menu-dropdown">
              <div class="species-card-menu-item edit-item">
                <i class="fa-solid fa-pen-to-square text-warning"></i>
                <span>Editar</span>
              </div>
              <div class="species-card-menu-item text-danger delete-item">
                <i class="fa-solid fa-trash"></i>
                <span>Excluir</span>
              </div>
            </div>
          `);
          dropdown.find('.edit-item').click(function(ev) {
            ev.stopPropagation();
            dropdown.remove();
            openAdminDrawerForEdit(animal);
          });
          dropdown.find('.delete-item').click(function(ev) {
            ev.stopPropagation();
            dropdown.remove();
            deleteEntityWithConfirmation(animal);
          });
          card.append(dropdown);
        });

        card.click(function() {
          showDetails(animal.id);
        });

        grid.append(card);
      });
      startModalSlideshows();
    });
  }

  // =========================================================================
  // 7. GALERIA DE IMAGENS E CROP CIRCULAR DO ÍCONE NO MODAL
  // =========================================================================
  // =========================================================================
  // 7. GALERIA DE IMAGENS E CROP CIRCULAR DO ÍCONE NO MODAL
  // =========================================================================
  let modalSelectedFiles = []; // Armazena objetos { id, file, currentX, currentY, scale }
  let modalIconCropState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    scale: 1.0
  };

  // Botão explícito de escolher ícone
  $(document).on('click', '#modal-btn-choose-icon', function(e) {
    e.preventDefault();
    $('#modal-input-file-icon').click();
  });

  // Botão + de adicionar fotos na galeria
  $(document).on('click', '#modal-btn-add-images', function(e) {
    e.preventDefault();
    $('#modal-input-file-image').click();
  });

  // Atualizar lista ao selecionar novos arquivos
  $('#modal-input-file-image').change(function() {
    if (this.files && this.files.length > 0) {
      Array.from(this.files).forEach(f => {
        modalSelectedFiles.push({
          id: 'img_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
          file: f,
          currentX: 0,
          currentY: 0,
          scale: 1.0
        });
      });
      renderModalImageGallery();
      this.value = ''; // Reset input para permitir re-selecionar
    }
  });

  function renderModalImageGallery() {
    const listContainer = $('#modal-image-preview-list');
    listContainer.empty();

    if (!modalSelectedFiles || modalSelectedFiles.length === 0) {
      $('#modal-image-preview-placeholder').removeClass('d-none');
    } else {
      $('#modal-image-preview-placeholder').addClass('d-none');
      modalSelectedFiles.forEach((item, index) => {
        const fileObj = item.file || item;
        const url = typeof fileObj === 'string' ? fileObj : URL.createObjectURL(fileObj);
        const card = $(`
          <div class="gallery-card-item position-relative flex-shrink-0 rounded-3 overflow-hidden border border-secondary shadow-sm" data-index="${index}" style="width: 130px; height: 130px; background: #121118; cursor: move; user-select: none; touch-action: none;" title="Arraste para mover • Roda do mouse para zoom">
            <img class="card-crop-img position-absolute" src="${url}" style="width: 100%; height: 100%; object-fit: cover; transform: translate(${item.currentX || 0}px, ${item.currentY || 0}px) scale(${item.scale || 1.0});">
            <div class="position-absolute bottom-0 start-0 end-0 p-1 text-center text-white-50" style="background: rgba(0,0,0,0.4); font-size: 9px; pointer-events: none;">Arraste/Zoom</div>
            <button type="button" class="btn-remove-modal-img position-absolute top-0 end-0 m-1 rounded-circle border-0 d-flex align-items-center justify-content-center" data-index="${index}" style="width: 24px; height: 24px; background: #FF4068; color: white; font-size: 12px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.5);" title="Remover foto">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        `);

        let isCardDragging = false;
        let startX = 0, startY = 0;

        card.on('mousedown touchstart', function(e) {
          if ($(e.target).closest('.btn-remove-modal-img').length) return;
          isCardDragging = true;
          const clientX = e.type.startsWith('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientX : 0) : e.clientX;
          const clientY = e.type.startsWith('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientY : 0) : e.clientY;
          startX = clientX - (item.currentX || 0);
          startY = clientY - (item.currentY || 0);
          e.preventDefault();
        });

        $(window).on(`mousemove.${item.id} touchmove.${item.id}`, function(e) {
          if (!isCardDragging) return;
          const clientX = e.type.startsWith('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientX : 0) : e.clientX;
          const clientY = e.type.startsWith('touch') ? (e.touches && e.touches[0] ? e.touches[0].clientY : 0) : e.clientY;
          item.currentX = clientX - startX;
          item.currentY = clientY - startY;
          card.find('.card-crop-img').css('transform', `translate(${item.currentX}px, ${item.currentY}px) scale(${item.scale || 1.0})`);
        });

        $(window).on(`mouseup.${item.id} touchend.${item.id}`, function() {
          isCardDragging = false;
        });

        card.on('wheel', function(e) {
          e.preventDefault();
          const step = e.originalEvent.deltaY < 0 ? 0.1 : -0.1;
          item.scale = Math.min(Math.max(0.4, (item.scale || 1.0) + step), 4.0);
          card.find('.card-crop-img').css('transform', `translate(${item.currentX || 0}px, ${item.currentY || 0}px) scale(${item.scale})`);
        });

        listContainer.append(card);
      });
    }
  }

  // Remover foto individual da lista ao clicar no X
  $(document).on('click', '.btn-remove-modal-img', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const index = parseInt($(this).attr('data-index'));
    if (!isNaN(index) && index >= 0 && index < modalSelectedFiles.length) {
      const item = modalSelectedFiles[index];
      if (item && item.id) {
        $(window).off(`.${item.id}`);
      }
      modalSelectedFiles.splice(index, 1);
      renderModalImageGallery();
    }
  });

  // Interatividade com o Círculo do Ícone (Clique para escolher, arraste p/ recortar)
  $('#modal-icon-circle-trigger').click(function(e) {
    if (e.target.tagName !== 'IMG') {
      $('#modal-input-file-icon').click();
    }
  });

  $('#modal-input-file-icon').change(function() {
    if (this.files && this.files[0]) {
      const url = URL.createObjectURL(this.files[0]);
      const img = $('#modal-icon-preview-img');
      img.attr('src', url).removeClass('d-none');
      $('#modal-icon-placeholder-content').addClass('d-none');
      modalIconCropState.currentX = 0;
      modalIconCropState.currentY = 0;
      modalIconCropState.scale = 1.0;
      img.css('transform', 'translate(0px, 0px) scale(1)');
      generateModalIconBase64();
    }
  });

  const modalIconTrigger = document.getElementById('modal-icon-circle-trigger');
  const modalIconImg = document.getElementById('modal-icon-preview-img');

  // Mantém a foto sempre cobrindo o círculo de 105px: o zoom mínimo é 1
  // (cover) e o arrasto é limitado para nunca revelar o fundo vazio.
  // Sem isso a foto salva saía "longe"/pequena dentro do ícone.
  function clampModalIconCrop() {
    var s = modalIconCropState.scale || 1.0;
    if (s < 1.0) { s = 1.0; modalIconCropState.scale = 1.0; }
    if (s > 4.0) { s = 4.0; modalIconCropState.scale = 4.0; }
    var max = 105 * (s - 1) / 2;
    if (max < 0) max = 0;
    modalIconCropState.currentX = Math.min(max, Math.max(-max, modalIconCropState.currentX || 0));
    modalIconCropState.currentY = Math.min(max, Math.max(-max, modalIconCropState.currentY || 0));
  }

  function applyModalIconTransform() {
    clampModalIconCrop();
    modalIconImg.style.transform = `translate(${modalIconCropState.currentX}px, ${modalIconCropState.currentY}px) scale(${modalIconCropState.scale})`;
  }

  if (modalIconTrigger && modalIconImg) {
    const startDrag = function(clientX, clientY) {
      if (modalIconImg.classList.contains('d-none')) return;
      modalIconCropState.isDragging = true;
      modalIconCropState.startX = clientX - modalIconCropState.currentX;
      modalIconCropState.startY = clientY - modalIconCropState.currentY;
    };

    const moveDrag = function(clientX, clientY) {
      if (!modalIconCropState.isDragging) return;
      modalIconCropState.currentX = clientX - modalIconCropState.startX;
      modalIconCropState.currentY = clientY - modalIconCropState.startY;
      applyModalIconTransform();
    };

    const endDrag = function() {
      if (modalIconCropState.isDragging) {
        modalIconCropState.isDragging = false;
        generateModalIconBase64();
      }
    };

    modalIconTrigger.addEventListener('mousedown', e => { startDrag(e.clientX, e.clientY); e.preventDefault(); });
    window.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);

    modalIconTrigger.addEventListener('touchstart', e => { if (e.touches && e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY); });
    window.addEventListener('touchmove', e => { if (e.touches && e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY); });
    window.addEventListener('touchend', endDrag);

    // Roda do mouse no círculo do ícone para Zoom (só aproxima a partir do cover)
    modalIconTrigger.addEventListener('wheel', e => {
      if (modalIconImg.classList.contains('d-none')) return;
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.1 : -0.1;
      modalIconCropState.scale = (modalIconCropState.scale || 1.0) + step;
      applyModalIconTransform();
      generateModalIconBase64();
    }, { passive: false });
  }

  // Gera o PNG circular do ícone a partir do enquadramento atual do preview.
  // Retorna Promise para o submit aguardar o recorte antes de enviar.
  function generateModalIconBase64() {
    const img = document.getElementById('modal-icon-preview-img');
    if (!img || img.classList.contains('d-none') || !img.src) return Promise.resolve(null);
    clampModalIconCrop();

    return new Promise(function(resolve) {
      var done = function(val) { resolve(val); };
      // Nunca trava o submit: resolve mesmo se a imagem falhar (ex.: CORS).
      var timer = setTimeout(function() { done($('#modal-input-icon-base64').val() || null); }, 1500);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 500;
        const ctx = canvas.getContext('2d');

        ctx.save();
        ctx.beginPath();
        ctx.arc(250, 250, 250, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        const naturalW = img.naturalWidth || 500;
        const naturalH = img.naturalHeight || 500;
        const aspect = naturalW / naturalH;
        let drawW = 500, drawH = 500;

        if (aspect > 1) drawW = 500 * aspect;
        else drawH = 500 / aspect;

        const scaleRatio = 500 / 105;
        drawW = drawW * (modalIconCropState.scale || 1.0);
        drawH = drawH * (modalIconCropState.scale || 1.0);

        const drawX = (500 - drawW) / 2 + (modalIconCropState.currentX * scaleRatio);
        const drawY = (500 - drawH) / 2 + (modalIconCropState.currentY * scaleRatio);

        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.onload = function() {
          try {
            ctx.drawImage(tempImg, drawX, drawY, drawW, drawH);
            ctx.restore();
            const dataUrl = canvas.toDataURL('image/png');
            $('#modal-input-icon-base64').val(dataUrl);
            clearTimeout(timer);
            done(dataUrl);
          } catch (e) {
            console.error("Error generating icon base64:", e);
            clearTimeout(timer);
            done($('#modal-input-icon-base64').val() || null);
          }
        };
        tempImg.onerror = function() {
          clearTimeout(timer);
          done($('#modal-input-icon-base64').val() || null);
        };
        tempImg.src = img.src;
      } catch(e) {
        console.error("Error generating icon base64:", e);
        clearTimeout(timer);
        done($('#modal-input-icon-base64').val() || null);
      }
    });
  }

  // Interatividade com os Chips de Biomas no Modal
  $(document).on('click', '#modal-biomes-tag-selector .biome-chip', function() {
    const isSelected = $(this).attr('data-selected') === 'true';
    const newSelected = !isSelected;
    $(this).attr('data-selected', newSelected ? 'true' : 'false');
    
    const icon = $(this).find('.chip-icon');
    if (newSelected) {
      icon.removeClass('fa-plus').addClass('fa-check');
    } else {
      icon.removeClass('fa-check').addClass('fa-plus');
    }

    const selectedIds = [];
    $('#modal-biomes-tag-selector .biome-chip[data-selected="true"]').each(function() {
      selectedIds.push($(this).attr('data-id'));
    });
    $('#form-create-animal .select-biomas').val(selectedIds);
  });

  function setupMarkerDragEvents(form, marker) {
    marker.on('drag', function(e) {
      const newPos = e.target.getLatLng();
      form.find(".coord-lat, .input-lat").val(newPos.lat.toFixed(6));
      form.find(".coord-lng, .input-lng").val(newPos.lng.toFixed(6));
    });

    form.find(".input-lat, .input-lng").off("input change").on("input change", function() {
      const newLat = parseFloat(form.find(".input-lat").val());
      const newLng = parseFloat(form.find(".input-lng").val());
      if (!isNaN(newLat) && !isNaN(newLng)) {
        const newLatLng = L.latLng(newLat, newLng);
        marker.setLatLng(newLatLng);
        map.panTo(newLatLng);
      }
    });
  }

  function setupZoneDragAndResizeEvents(form, marker, zone) {
    marker.on('drag', function(e) {
      const newPos = e.target.getLatLng();
      form.find(".coord-lat, .input-lat").val(newPos.lat.toFixed(6));
      form.find(".coord-lng, .input-lng").val(newPos.lng.toFixed(6));
      zone.setLatLng(newPos);
    });

    form.find(".input-lat, .input-lng").off("input change").on("input change", function() {
      const newLat = parseFloat(form.find(".input-lat").val());
      const newLng = parseFloat(form.find(".input-lng").val());
      if (!isNaN(newLat) && !isNaN(newLng)) {
        const newLatLng = L.latLng(newLat, newLng);
        marker.setLatLng(newLatLng);
        zone.setLatLng(newLatLng);
        map.panTo(newLatLng);
      }
    });

    form.find(".input-radius, .slider-radius").off("input change").on("input change", function() {
      const rad = parseInt($(this).val());
      if (!isNaN(rad)) {
        form.find(".input-radius, .slider-radius").val(rad);
        zone.setRadius(rad);
      }
    });
  }

  function closeAdminDrawer() {
    $("#admin-sidebar-drawer").addClass("d-none");
    if (draftMarker) {
      map.removeLayer(draftMarker);
      draftMarker = null;
    }
    if (draftZone) {
      map.removeLayer(draftZone);
      draftZone = null;
    }
  }

  $("#close-drawer-btn, .btn-cancel-drawer").click(closeAdminDrawer);

  function loadAdminSelectOptions(callback) {
    const fetchNiveis = fetch('/api/v1/niveis-extincao/').then(res => res.json());
    const fetchBiomas = fetch('/api/v1/biomas/').then(res => res.json());

    Promise.all([fetchNiveis, fetchBiomas])
      .then(([niveisRes, biomasRes]) => {
        const selectNiveis = $(".select-nivel-extincao");
        selectNiveis.empty();
        selectNiveis.append('<option value="" style="background-color: #2B2A33; color: #FFF;">NÍVEL DE EXTINÇÃO</option>');
        const niveis = niveisRes.data || niveisRes;
        if (Array.isArray(niveis)) {
          niveis.forEach(item => {
            const color = extinctionColorMap[item.id] || '#383642';
            const textColor = item.id == 3 ? '#111111' : '#FFFFFF';
            selectNiveis.append(`<option value="${item.id}" style="background-color: ${color}; color: ${textColor}; font-weight: bold; padding: 8px;">${item.nome}</option>`);
          });
        }

        const selectBiomas = $(".select-biomas");
        selectBiomas.empty();
        const biomas = biomasRes.data || biomasRes;
        if (Array.isArray(biomas)) {
          biomas.forEach(item => selectBiomas.append(`<option value="${item.id}">${item.nome}</option>`));
        }

        if (typeof callback === 'function') callback();
      })
      .catch(err => {
        console.error("Erro ao carregar selects:", err);
        if (typeof callback === 'function') callback();
      });
  }

  // Mudar cor dinamicamente ao selecionar Nível de Extinção no Modal
  $(document).on('change', '.select-nivel-extincao', function() {
    const val = $(this).val();
    const color = extinctionColorMap[val] || '#383642';
    const textColor = val == '3' ? '#111111' : '#FFFFFF';
    $(this).css({
      'background-color': color,
      'border-color': color,
      'color': textColor,
      'font-weight': 'bold'
    });
  });

  // Submissão do Formulário de Animal (Criação e Edição)
  $("#form-create-animal").submit(async function(e) {
    e.preventDefault();
    // Garante que o recorte atual do ícone foi gerado antes de montar o FormData
    try { await generateModalIconBase64(); } catch (err) {}
    const formData = new FormData(this);

    // Anexar todos os arquivos ativos da galeria
    formData.delete('animal_imagem');
    modalSelectedFiles.forEach(item => {
      const fileObj = item.file || item;
      if (typeof fileObj !== 'string') {
        formData.append('animal_imagem', fileObj);
      }
    });

    const selectedBiomas = [];
    $('#modal-biomes-tag-selector .biome-chip[data-selected="true"]').each(function() {
      selectedBiomas.push($(this).attr('data-id'));
    });
    formData.delete('biomas_ids');
    selectedBiomas.forEach(b => formData.append('biomas_ids', b));

    const latVal = $(this).find('.coord-lat').val();
    const lngVal = $(this).find('.coord-lng').val();
    if (latVal) formData.set('lat', latVal);
    if (lngVal) formData.set('lng', lngVal);

    // Se desenhou área mas não clicou no mapa, ancora o ponto no centroide
    // da área para ponto e polígono não ficarem desconectados.
    try {
      var polyHidden = $('#modal-area-polygon-json-hidden').val();
      var coordHidden = $('#modal-coordenadas-json-hidden').val();
      if (polyHidden && polyHidden.trim().length > 0 && (!coordHidden || coordHidden.trim().length === 0)) {
        var polyPayload = JSON.parse(polyHidden);
        var polyRings = (polyPayload && polyPayload.polygons) || [];
        var firstRing = null;
        for (var ri = 0; ri < polyRings.length; ri++) {
          if (polyRings[ri] && polyRings[ri].length >= 3) { firstRing = polyRings[ri]; break; }
        }
        if (firstRing) {
          var centroid = getPolygonCentroid(firstRing);
          if (centroid) {
            formData.set('lat', String(centroid[0]));
            formData.set('lng', String(centroid[1]));
            formData.set('coordenadas_json', JSON.stringify([{ lat: centroid[0], lng: centroid[1] }]));
          }
        }
      }
    } catch (e) {}

    const editId = $("#animal-edit-id").val();
    const url = editId ? `/api/v1/animais/${editId}/` : `/api/v1/animais/`;
    const method = editId ? "PATCH" : "POST";

    fetch(url, { method: method, body: formData })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(editId ? "Espécie atualizada com sucesso!" : "Espécie cadastrada com sucesso!");
        $("#species-admin-modal").addClass("d-none");
        reloadMarkers();
      } else {
        alert('Erro ao salvar espécie: ' + formatErrorMessage(data, 'Tente novamente.'));
      }
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao salvar espécie: " + (err.message || 'Falha de comunicação com o servidor.'));
    });
  });

  // Submissão do Formulário de Área de Preservação
  $("#form-create-preservacao").submit(function(e) {
    e.preventDefault();
    const nome = $(this).find('input[name="nome"]').val();
    const tipo = $(this).find('select[name="tipo"]').val();
    const raio = parseInt($(this).find('.input-radius').val());
    const lat = parseFloat($(this).find('.input-lat').val());
    const lng = parseFloat($(this).find('.input-lng').val());

    L.circle([lat, lng], {
      radius: raio,
      color: '#287f5e',
      fillColor: '#287f5e',
      fillOpacity: 0.5,
      weight: 2
    }).bindPopup(`<b>${nome}</b><br>Tipo: ${tipo}<br>Raio: ${(raio/1000).toFixed(1)} km`).addTo(map);

    alert(`Área de Preservação "${nome}" criada com sucesso!`);
    closeAdminDrawer();
  });

  // Submissão do Formulário de ONG
  $("#form-create-ong").submit(function(e) {
    e.preventDefault();
    const nome = $(this).find('input[name="nome"]').val();
    const foco = $(this).find('input[name="foco"]').val();
    const lat = parseFloat($(this).find('.input-lat').val());
    const lng = parseFloat($(this).find('.input-lng').val());

    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'custom-animal-marker',
        html: `<div class="marker-pin" style="border-color: #3498db; background-color: #1e3d59;"><i class="fa-solid fa-hand-holding-heart text-info" style="font-size: 18px;"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      })
    }).bindPopup(`<b>ONG: ${nome}</b><br>Foco: ${foco || 'Preservação Ambiental'}`).addTo(map);

    alert(`ONG "${nome}" cadastrada com sucesso!`);
    closeAdminDrawer();
  });

  // Modal de Detalhes do Animal
  window.showDetails = function(id) {
    const animal = markersData.find(a => a.animal_id == id);
    if (!animal) return;

    const statusSigla = animal.nivel_sigla ? animal.nivel_sigla.toLowerCase() : 'dd';
    const statusConfig = {
      'ex': { color: '#403E4C', icon: 'fa-skull' },
      'ew': { color: '#831F34', icon: 'fa-skull-crossbones' },
      'cr': { color: '#FF4068', icon: 'fa-exclamation-triangle' },
      'en': { color: '#ff6426', icon: 'fa-triangle-exclamation' },
      'vu': { color: '#FFA63A', icon: 'fa-shield-halved' },
      'nt': { color: '#217757', icon: 'fa-circle-check' },
      'lc': { color: '#1a5fb4', icon: 'fa-circle-check' },
      'dd': { color: '#555555', icon: 'fa-question-circle' }
    };
    const config = statusConfig[statusSigla] || { color: '#1a5fb4', icon: 'fa-info-circle' };
    const statusColor = config.color;
    const statusIcon = config.icon;

    let allImgs = [];
    const sourceImgs = animal.imagens || [];
    if (Array.isArray(sourceImgs)) {
      sourceImgs.forEach(img => {
        let u = typeof img === 'string' ? img : (img && img.imagem ? img.imagem : '');
        if (u && !u.includes('logotipo.png') && !u.includes('falta_imagem') && !u.includes('Falta_imagem') && !allImgs.includes(u)) {
          allImgs.push(u);
        }
      });
    }
    if (animal.imagem && !animal.imagem.includes('logotipo.png') && !animal.imagem.includes('falta_imagem') && !animal.imagem.includes('Falta_imagem') && !allImgs.includes(animal.imagem)) {
      allImgs.push(animal.imagem);
    }
    if (animal.icone && !animal.icone.includes('logotipo.png') && !animal.icone.includes('falta_imagem') && !animal.icone.includes('Falta_imagem') && !allImgs.includes(animal.icone)) {
      allImgs.push(animal.icone);
    }
    allImgs = allImgs.map(url => (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:') ? url : `/media/${url}`));
    // De preferência de 1 a 3 fotos
    allImgs = allImgs.slice(0, 3);
    if (allImgs.length === 0) allImgs.push('/assets/img/logotipo.png');

    let biomas = (animal.biomas || []).map(b => b.nome).join(', ') || 'Não informado';

    let html = `
      <div class="container-fluid p-0">
        <div class="row g-0">
          <div class="col-md-5">
            <div class="modal-img-container" style="overflow: hidden; position: relative; border-left: 5px solid ${statusColor}; height: 100%; min-height: 280px;">
              <img id="modalCarouselImg" src="${allImgs[0]}" class="modal-img-pan" data-current="0" data-imgs='${JSON.stringify(allImgs)}'>
              ${allImgs.length > 1 ? `
                <button class="carousel-btn carousel-prev" onclick="changeModalImg(-1)" style="position: absolute; top: 50%; left: 10px; z-index: 10; border: none; background: ${statusColor}; color: white; border-radius: 50%; width: 36px; height: 36px; cursor: pointer;">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <button class="carousel-btn carousel-next" onclick="changeModalImg(1)" style="position: absolute; top: 50%; right: 10px; z-index: 10; border: none; background: ${statusColor}; color: white; border-radius: 50%; width: 36px; height: 36px; cursor: pointer;">
                  <i class="fas fa-chevron-right"></i>
                </button>
                <div class="modal-carousel-indicators">
                  ${allImgs.map((_, i) => `
                    <span class="modal-thumb-dot ${i === 0 ? 'bg-primary text-white' : 'bg-dark text-muted'} border border-secondary" onclick="setModalImg(${i})">
                      ${i + 1}
                    </span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
          <div class="col-md-7 p-4" style="max-height: 480px; overflow-y: auto;">
            <div class="mb-3">
              <span class="badge px-3 py-2 rounded-pill me-2" style="background-color: ${statusColor}; font-weight: bold;">${animal.classe || 'Classe não informada'}</span>
              <span class="badge bg-secondary px-3 py-2 rounded-pill">${animal.familia || 'Família não informada'}</span>
            </div>
            <div class="row mb-3">
              <div class="col-6">
                <h6 style="color: ${statusColor};" class="fw-bold text-uppercase small mb-1">Nome Científico</h6>
                <p class="fst-italic text-white mb-0">${animal.nome_cientifico}</p>
              </div>
              <div class="col-6">
                <h6 style="color: ${statusColor};" class="fw-bold text-uppercase small mb-1">Status de Extinção</h6>
                <p class="text-white mb-0"><i class="fas ${statusIcon} me-2" style="color: ${statusColor};"></i>${animal.nivel_extincao || animal.nivel_sigla}</p>
              </div>
            </div>
            <div class="bg-dark p-3 rounded-3 mt-3" style="border-top: 3px solid ${statusColor}; border-bottom: 3px solid ${statusColor};">
              <div class="row text-center mb-1 gy-2 text-white">
                  <div class="col-4">
                      <span class="mb-1 text-muted small"><i class="fas fa-utensils me-1"></i> Dieta</span>
                      <div class="fw-bold" style="color: ${statusColor}; font-size: 0.95rem;">${animal.dieta || 'N/A'}</div>
                  </div>
                  <div class="col-4 border-start border-secondary">
                      <span class="mb-1 text-muted small"><i class="fas fa-weight-hanging me-1"></i> Peso</span>
                      <div class="fw-bold" style="color: ${statusColor}; font-size: 0.95rem;">${animal.peso ? animal.peso + ' Kg' : '00 Kg'}</div>
                  </div>
                  <div class="col-4 border-start border-secondary">
                      <span class="mb-1 text-muted small"><i class="fas fa-arrows-alt-v me-1"></i> Altura</span>
                      <div class="fw-bold" style="color: ${statusColor}; font-size: 0.95rem;">${animal.altura ? animal.altura + ' m' : '00 m'}</div>
                  </div>
              </div>
              <hr style="border-color: ${statusColor}; opacity: 0.3;" class="my-2">
              <div class="mt-2 text-white">
                  <h6 class="fst-italic text-muted small mb-1">Biomas</h6>
                  <p class="mb-2 fw-bold" style="color: ${statusColor};">${biomas}</p>
                  <h6 class="fst-italic text-muted small mb-1">Descrição / Hábitos</h6>
                  <p class="mb-0 small text-light" style="line-height: 1.5; text-align: justify;">${animal.habitos || 'Descrição detalhada não disponível.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    let modalEl = $('#animalModal');
    if (modalEl.length === 0) {
      $('body').append(`
        <div class="modal fade" id="animalModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg" style="background-color: #23222B;">
              <div class="modal-header border-bottom border-secondary">
                <h5 class="modal-title fw-bold" id="modalAnimalName"></h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-0" id="modalBody"></div>
              <div class="modal-footer border-top border-secondary d-flex justify-content-between">
                <div id="modalAdminBtns" class="d-flex gap-2"></div>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      `);
    }

    $('#modalAnimalName').text(animal.nome_comum).css('color', statusColor);
    $('#modalBody').html(html);

    if (isAdminModeActive()) {
      $('#modalAdminBtns').html(`
        <button type="button" class="btn btn-outline-warning btn-sm rounded-pill" id="btn-modal-edit-animal">
          <i class="fa-solid fa-pen-to-square me-1"></i> Editar
        </button>
        <button type="button" class="btn btn-outline-danger btn-sm rounded-pill" id="btn-modal-delete-animal">
          <i class="fa-solid fa-trash me-1"></i> Excluir Espécie
        </button>
      `);

      $('#btn-modal-delete-animal').off('click').on('click', function() {
        deleteEntityWithConfirmation(animal);
      });
      $('#btn-modal-edit-animal').off('click').on('click', function() {
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('animalModal'));
        if (modalInstance) modalInstance.hide();
        openAdminDrawerForEdit({ properties: animal });
      });
    } else {
      $('#modalAdminBtns').empty();
    }

    new bootstrap.Modal(document.getElementById('animalModal')).show();
  };

  window.setModalImg = function(targetIndex) {
    const imgTag = $('#modalCarouselImg');
    if (!imgTag.length) return;
    const imgsStr = imgTag.attr('data-imgs');
    if (!imgsStr) return;
    const imgs = JSON.parse(imgsStr);
    if (!imgs || !imgs[targetIndex]) return;

    imgTag.attr('data-current', targetIndex);
    $('.modal-thumb-dot').removeClass('bg-primary text-white').addClass('bg-dark text-muted')
      .eq(targetIndex).removeClass('bg-dark text-muted').addClass('bg-primary text-white');

    imgTag.stop(true, true).fadeOut(120, function() {
      imgTag.attr('src', imgs[targetIndex]);
      imgTag.fadeIn(120);
    });
  };

  window.changeModalImg = function(step) {
    const imgTag = $('#modalCarouselImg');
    if (!imgTag.length) return;
    const imgsStr = imgTag.attr('data-imgs');
    if (!imgsStr) return;
    const imgs = JSON.parse(imgsStr);
    if (!imgs || imgs.length <= 1) return;

    let current = parseInt(imgTag.attr('data-current')) || 0;
    let next = (current + step + imgs.length) % imgs.length;
    window.setModalImg(next);
  };

  window.deleteEntityWithConfirmation = function(entity) {
    const props = entity.properties || entity;
    const animalId = props.animal_id || props.id;
    const nome = props.nome_comum || props.nome || 'esta entidade';

    if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
    if (!confirm(`⚠️ CONFIRMAÇÃO FINAL DE SEGURANÇA:\n\nEsta ação é permanente e removerá "${nome}" do mapa e do catálogo.\n\nDeseja REALMENTE EXCLUIR?`)) return;

    fetch(`/api/v1/animais/${animalId}/`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(`"${nome}" foi excluído com sucesso!`);
        const modalEl = document.getElementById('animalModal');
        if (modalEl) {
          const bsModal = bootstrap.Modal.getInstance(modalEl);
          if (bsModal) bsModal.hide();
        }
        reloadMarkers();
      } else {
        alert(`Erro ao excluir: ${formatErrorMessage(data, 'Erro no servidor.')}`);
      }
    })
    .catch(err => {
      console.error(err);
      alert(`Erro de conexão ao tentar excluir "${nome}": ${err.message || 'Falha de rede.'}`);
    });
  };

  // --------------------------------------------------
  // Módulo de Importação de Espécies do SALVE (ICMBio)
  // --------------------------------------------------
  let selectedSalveFile = null;

  $(document).on('show.bs.modal', '#modalImportSalve', function() {
    selectedSalveFile = null;
    $('#salve-file-input').val('');
    $('#salve-preview-container').addClass('d-none');
    $('#salve-progress-container').addClass('d-none');
    $('#salve-result-container').addClass('d-none').empty();
    $('#btn-execute-import-salve').prop('disabled', true);
  });

  $(document).on('click', '#btn-open-salve-modal', function(e) {
    const modalEl = document.getElementById('modalImportSalve');
    if (modalEl) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  });

  $(document).on('click', '#salve-drop-zone', function(e) {
    if (e.target.id !== 'salve-file-input') {
      $('#salve-file-input').trigger('click');
    }
  });

  $(document).on('dragover dragenter', '#salve-drop-zone', function(e) {
    e.preventDefault(); e.stopPropagation();
    $(this).addClass('border-warning').css('background', '#201f2b');
  });

  $(document).on('dragleave dragend', '#salve-drop-zone', function(e) {
    e.preventDefault(); e.stopPropagation();
    $(this).removeClass('border-warning').css('background', '#191820');
  });

  $(document).on('drop', '#salve-drop-zone', function(e) {
    e.preventDefault(); e.stopPropagation();
    $(this).removeClass('border-warning').css('background', '#191820');
    const files = e.originalEvent.dataTransfer.files;
    if (files && files.length > 0) handleSalveFileApp(files[0]);
  });

  $(document).on('change', '#salve-file-input', function() {
    if (this.files && this.files.length > 0) handleSalveFileApp(this.files[0]);
  });

  function handleSalveFileApp(file) {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      alert('Por favor, selecione um arquivo .csv válido.');
      return;
    }
    selectedSalveFile = file;
    $('#salve-file-badge').text(file.name);
    $('#salve-file-info').text((file.size / 1048576).toFixed(2) + ' MB');
    const reader = new FileReader();
    reader.onload = function(evt) { renderSalvePreviewApp(evt.target.result || ''); };
    reader.readAsText(file.slice(0, 50000));
    $('#btn-execute-import-salve').prop('disabled', false);
  }

  function renderSalvePreviewApp(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (!lines.length) return;
    const delim = (lines[0].match(/;/g)||[]).length > (lines[0].match(/,/g)||[]).length ? ';' : ',';
    const parse = l => l.split(delim).map(c => c.replace(/^"|"$/g,'').trim());
    const headers = parse(lines[0]);
    $('#salve-preview-thead').html('<tr>' + headers.slice(0,7).map(h=>`<th class="text-warning">${h}</th>`).join('') + '</tr>');
    let body = '';
    for (let i=1; i<Math.min(lines.length,4); i++) {
      body += '<tr>' + parse(lines[i]).slice(0,7).map(c=>`<td>${c||'-'}</td>`).join('') + '</tr>';
    }
    $('#salve-preview-tbody').html(body);
    $('#salve-preview-container').removeClass('d-none');
  }

  // ---------------------------------------------------------------------------
  // Importação compatível com a Vercel (fallback fatiado em JSON).
  // A Vercel encerra funções serverless após poucos segundos, então um CSV
  // grande com busca de fotos nunca termina via SSE (streaming). O fallback
  // divide o CSV em lotes pequenos e envia cada lote como JSON simples
  // (sem streaming), acumulando o resultado. Cada lote cabe no timeout.
  // ---------------------------------------------------------------------------
  var SALVE_CHUNK_ROWS = 60;

  function splitSalveCsvIntoChunks(fullText, chunkRows) {
    if (!fullText || typeof fullText !== 'string') return [];
    var firstLine = (fullText.slice(0, 2000).split(/\r?\n/)[0]) || '';
    var semis = (firstLine.match(/;/g) || []).length;
    var commas = (firstLine.match(/,/g) || []).length;
    var rows = [];
    var cur = '';
    var inQ = false;
    var pushRow = function() { rows.push(cur); cur = ''; };
    for (var i = 0; i < fullText.length; i++) {
      var ch = fullText[i];
      var nx = fullText[i + 1];
      if (inQ) {
        cur += ch;
        if (ch === '"') {
          if (nx === '"') { cur += nx; i++; }
          else { inQ = false; }
        }
      } else {
        if (ch === '"') { inQ = true; cur += ch; }
        else if (ch === '\r') { if (nx === '\n') i++; pushRow(); }
        else if (ch === '\n') { pushRow(); }
        else { cur += ch; }
      }
    }
    if (cur.length > 0) rows.push(cur);
    var nonEmpty = rows.filter(function(r) { return r.trim().length > 0; });
    if (nonEmpty.length === 0) return [];
    var header = nonEmpty[0];
    var body = nonEmpty.slice(1);
    var chunks = [];
    for (var j = 0; j < body.length; j += chunkRows) {
      chunks.push(header + '\n' + body.slice(j, j + chunkRows).join('\n'));
    }
    return chunks;
  }

  function readSelectedSalveFileText() {
    if (!selectedSalveFile) return Promise.resolve('');
    if (typeof selectedSalveFile.text === 'function') return selectedSalveFile.text();
    return new Promise(function(resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onload = function(evt) { resolve(evt.target.result || ''); };
        reader.onerror = function() { reject(new Error('Não foi possível ler o arquivo CSV.')); };
        reader.readAsText(selectedSalveFile);
      } catch (e) { reject(e); }
    });
  }

  function salveProgress(pct, statusHtml) {
    $('#salve-progress-bar').css('width', pct + '%').text(pct + '%').attr('aria-valuenow', pct);
    $('#salve-progress-percent').text(pct + '%');
    if (statusHtml) $('#salve-progress-status').html(statusHtml);
  }

  function showSalveSuccess(message, s) {
    $('#salve-progress-container').addClass('d-none');
    $('#btn-execute-import-salve').prop('disabled', false);
    $('#salve-result-container').html(
      '<div class="alert alert-success border-0 mb-0" style="background:#1e3a29;color:#75b798;">' +
      '<div class="d-flex align-items-center gap-2 mb-2">' +
      '<i class="fa-solid fa-circle-check fs-5"></i>' +
      '<strong>' + (message || 'Importação finalizada com sucesso!') + '</strong>' +
      '</div>' +
      '<ul class="mb-0 small ps-3">' +
      '<li><strong>Identificadas no arquivo:</strong> ' + (s.totalParsed || 0) + '</li>' +
      '<li><strong>Novas espécies inseridas:</strong> ' + (s.inserted || 0) + '</li>' +
      '<li><strong>Espécies atualizadas:</strong> ' + (s.updated || 0) + '</li>' +
      (s.skipped ? '<li><strong>Linhas ignoradas/vazias:</strong> ' + s.skipped + '</li>' : '') +
      '</ul></div>'
    ).removeClass('d-none');
    if (typeof reloadMarkers === 'function') reloadMarkers();
    if (typeof loadData === 'function') loadData();
  }

  function showSalveError(err) {
    $('#salve-progress-container').addClass('d-none');
    $('#btn-execute-import-salve').prop('disabled', false);
    var msg = 'Erro desconhecido.';
    try { msg = formatErrorMessage(err, 'Erro desconhecido.'); } catch (e) { msg = (err && err.message) || msg; }
    $('#salve-result-container').html(
      '<div class="alert alert-danger border-0 mb-0" style="background:#3e1f25;color:#ea868f;">' +
      '<div class="d-flex align-items-center gap-2">' +
      '<i class="fa-solid fa-triangle-exclamation fs-5"></i>' +
      '<div><strong>Falha na importação</strong>' +
      '<div class="small mt-1">' + msg + '</div>' +
      '</div></div></div>'
    ).removeClass('d-none');
  }

  // Envia o CSV em lotes JSON (sem SSE). Usado quando o streaming falha
  // (ex.: timeout da função serverless na Vercel).
  async function runChunkedSalveImport(fullText, maxRows, autoImages) {
    var chunks = splitSalveCsvIntoChunks(fullText, SALVE_CHUNK_ROWS);
    if (chunks.length === 0) throw new Error('O arquivo CSV está vazio ou o formato não pôde ser interpretado.');
    var limit = parseInt(maxRows, 10) || 5000;
    chunks = chunks.slice(0, Math.max(1, Math.ceil(limit / SALVE_CHUNK_ROWS)));
    var totals = { totalParsed: 0, processed: 0, inserted: 0, updated: 0, skipped: 0 };
    for (var i = 0; i < chunks.length; i++) {
      salveProgress(Math.round((i / chunks.length) * 100),
        '<i class="fa-solid fa-spinner fa-spin me-1"></i> Enviando lote ' + (i + 1) + '/' + chunks.length + ' (modo compatível)...');
      var fd = new FormData();
      fd.append('csv_text', chunks[i]);
      fd.append('auto_images', autoImages);
      fd.append('max_rows', String(SALVE_CHUNK_ROWS));
      var resp = await fetch('/api/v1/animais/import-salve', { method: 'POST', body: fd });
      var data = null;
      try { data = await resp.json(); } catch (e) { data = null; }
      if (!resp.ok || !data || data.success === false) {
        throw new Error((data && (data.message || data.error)) || ('Erro no servidor (lote ' + (i + 1) + '): HTTP ' + resp.status));
      }
      var r = data.data || {};
      totals.totalParsed += (r.totalParsed || 0);
      totals.processed += (r.processed || 0);
      totals.inserted += (r.inserted || 0);
      totals.updated += (r.updated || 0);
      totals.skipped += (r.skipped || 0);
      salveProgress(Math.round(((i + 1) / chunks.length) * 100),
        '<i class="fa-solid fa-spinner fa-spin me-1"></i> Lote ' + (i + 1) + '/' + chunks.length + ' concluído...');
    }
    salveProgress(100, '<i class="fa-solid fa-circle-check me-1"></i> Concluído!');
    showSalveSuccess('Importação concluída com sucesso! ' + totals.inserted + ' adicionados, ' + totals.updated + ' atualizados.', totals);
    return true;
  }

  $(document).on('click', '#btn-execute-import-salve', async function() {
    if (!selectedSalveFile) return;
    const btn = $(this);
    btn.prop('disabled', true);
    $('#salve-progress-container').removeClass('d-none');
    $('#salve-result-container').addClass('d-none').empty();
    $('#salve-progress-bar').css('width', '0%').text('0%').attr('aria-valuenow', 0);
    $('#salve-progress-percent').text('0%');
    $('#salve-progress-status').html('<i class="fa-solid fa-spinner fa-spin me-1"></i> Iniciando importação...');

    const fd = new FormData();
    fd.append('csv_file', selectedSalveFile);
    fd.append('auto_images', $('#check-auto-images').is(':checked'));
    fd.append('max_rows', $('#select-max-rows').val());

    try {
      const response = await fetch('/api/v1/animais/import-salve?stream=true', {
        method: 'POST',
        headers: { 'Accept': 'text/event-stream' },
        body: fd
      });

      // A Vercel pode responder JSON direto (erro, ou função sem streaming).
      // Nesse caso não há eventos SSE para ler — trata como JSON.
      var contentType = '';
      try { contentType = response.headers.get('content-type') || ''; } catch (e) {}
      if (contentType.indexOf('application/json') !== -1) {
        var jsonData = await response.json();
        if (response.ok && jsonData && jsonData.success) {
          showSalveSuccess(jsonData.message, jsonData.data || {});
          return;
        }
        throw new Error(formatErrorMessage(jsonData, 'Erro no servidor: HTTP ' + response.status));
      }
      if (!response.ok) {
        throw new Error('Erro no servidor: HTTP ' + response.status);
      }
      if (!response.body || typeof response.body.getReader !== 'function') {
        throw new Error('STREAMING_INDISPONIVEL');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasCompleted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // guarda pedaço parcial

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split('\n');
          let eventType = 'message';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.replace('event: ', '').trim();
            else if (line.startsWith('data: ')) dataStr = line.replace('data: ', '').trim();
          }

          if (dataStr) {
            try {
              const payload = JSON.parse(dataStr);
              if (eventType === 'progress') {
                const pct = Math.max(0, Math.min(100, payload.percent || 0));
                $('#salve-progress-bar')
                  .css('width', pct + '%')
                  .text(pct + '%')
                  .attr('aria-valuenow', pct);
                $('#salve-progress-percent').text(pct + '%');
                $('#salve-progress-status').html(`
                  <i class="fa-solid fa-spinner fa-spin me-1"></i>
                  Processando: <strong>${payload.species || ''}</strong> (${payload.current}/${payload.total})
                `);
              } else if (eventType === 'done') {
                hasCompleted = true;
                $('#salve-progress-bar').css('width', '100%').text('100%');
                $('#salve-progress-percent').text('100%');
                setTimeout(() => {
                  $('#salve-progress-container').addClass('d-none');
                  btn.prop('disabled', false);
                  const s = payload.data || {};
                  $('#salve-result-container').html(`
                    <div class="alert alert-success border-0 mb-0" style="background:#1e3a29;color:#75b798;">
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <i class="fa-solid fa-circle-check fs-5"></i>
                        <strong>${payload.message || 'Importação finalizada com sucesso!'}</strong>
                      </div>
                      <ul class="mb-0 small ps-3">
                        <li><strong>Identificadas no arquivo:</strong> ${s.totalParsed || 0}</li>
                        <li><strong>Novas espécies inseridas:</strong> ${s.inserted || 0}</li>
                        <li><strong>Espécies atualizadas:</strong> ${s.updated || 0}</li>
                        ${s.skipped ? `<li><strong>Linhas ignoradas/vazias:</strong> ${s.skipped}</li>` : ''}
                      </ul>
                    </div>`).removeClass('d-none');
                  if (typeof reloadMarkers === 'function') reloadMarkers();
                  if (typeof loadData === 'function') loadData();
                }, 400);
              } else if (eventType === 'error') {
                throw new Error(payload.message || payload.error || 'Erro durante a importação.');
              }
            } catch (jsonErr) {
              if (eventType === 'error') throw jsonErr;
            }
          }
        }
      }

      if (!hasCompleted) {
        // O servidor encerrou a conexão sem concluir (ex.: timeout da função
        // serverless na Vercel). Tenta automaticamente o modo fatiado.
        try {
          $('#salve-progress-status').html('<i class="fa-solid fa-spinner fa-spin me-1"></i> Conexão interrompida, tentando modo compatível...');
          var fullTextFallback = await readSelectedSalveFileText();
          await runChunkedSalveImport(fullTextFallback, $('#select-max-rows').val(), $('#check-auto-images').is(':checked'));
        } catch (chunkErr) {
          showSalveError(new Error('O servidor encerrou a conexão antes de concluir (limite de tempo da hospedagem). Tente um limite menor de espécies ou desative a busca automática de fotos. Detalhe: ' + ((chunkErr && chunkErr.message) || 'sem resposta')));
        }
      }
    } catch (err) {
      if (err && err.message === 'STREAMING_INDISPONIVEL') {
        try {
          var fullTextRetry = await readSelectedSalveFileText();
          await runChunkedSalveImport(fullTextRetry, $('#select-max-rows').val(), $('#check-auto-images').is(':checked'));
          return;
        } catch (chunkErr2) {
          showSalveError(chunkErr2);
          return;
        }
      }
      // Falha no SSE (rede, timeout, etc.): tenta o modo fatiado antes de desistir.
      try {
        $('#salve-progress-status').html('<i class="fa-solid fa-spinner fa-spin me-1"></i> Streaming indisponível nesta hospedagem, tentando modo compatível...');
        var fullTextCatch = await readSelectedSalveFileText();
        if (fullTextCatch) {
          await runChunkedSalveImport(fullTextCatch, $('#select-max-rows').val(), $('#check-auto-images').is(':checked'));
          return;
        }
        showSalveError(err);
      } catch (chunkErr3) {
        showSalveError(chunkErr3 && chunkErr3.message ? chunkErr3 : err);
      }
    }
  });

  loadData();
  loadMarkers();
  setTimeout(function() { map.invalidateSize(); }, 400);
});

