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

// Mapa de cores para níveis de extinção — FONTE ÚNICA NO FRONTEND.
// Chave canônica: sigla minúscula (ex, ew, re, cr, en, vu, nt, lc, dd).
// RE (#B0214F): vinho-rosado entre EW e CR — regionalmente extinta.
// As chaves numéricas são APENAS fallback legado (IDs antigos do banco:
// 1=CR, 2=EN, 3=VU, 4=NT, 5=LC, 6=DD, 7=EX, 8=EW, 9=RE) — prefira sempre a sigla,
// pois o ID varia conforme o seed do banco.
const extinctionColorMap = {
  'ex': '#403E4C', 'ew': '#831F34', 're': '#B0214F', 'cr': '#FF4068', 'en': '#FF6426',
  'vu': '#FFA63A', 'nt': '#217757', 'lc': '#1A5FB4', 'dd': '#555555',
  '1': '#FF4068', '2': '#FF6426', '3': '#FFA63A',
  '4': '#217757', '5': '#1A5FB4', '6': '#555555', '7': '#403E4C', '8': '#831F34', '9': '#B0214F'
};

// Ordem lógica de severidade (o ID do RE no banco é 9, fora de ordem).
const extinctionSeverityOrder = ['ex', 'ew', 're', 'cr', 'en', 'vu', 'nt', 'lc', 'dd'];

// Animal sem foto/ícone usa a logotipo do sistema como fallback. Quando a
// URL for a logotipo, as views exibem o selo "IMAGEM LIVRE NÃO ENCONTRADA".
function isFallbackLogoUrl(u) {
  return typeof u === 'string' && u.indexOf('logotipo.png') !== -1;
}

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
  /* Oculta a logo Gralha dos Ventos (#brand-header) e a barra de pesquisa
     de localidades (#floating-search) nas telas de criação de animais,
     instituições e áreas (modais fullscreen). */
  function updateCreationOverlayVisibility() {
    var animalOpen = !$("#species-admin-modal").hasClass("d-none");
    var ongOpen = !$("#ong-admin-modal").hasClass("d-none");
    var zonaOpen = !$("#zona-admin-modal").hasClass("d-none");
    $("body").toggleClass("creation-open", animalOpen || ongOpen || zonaOpen);
  }
  try {
    var creationObserver = new MutationObserver(updateCreationOverlayVisibility);
    ["#species-admin-modal", "#ong-admin-modal", "#zona-admin-modal"].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) creationObserver.observe(el, { attributes: true, attributeFilter: ["class"] });
    });
  } catch (e) {}
  updateCreationOverlayVisibility();

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

  pampasLayer = L.geoJson(null, { renderer: svgRenderer, interactive: false }).addTo(map);
  // interactive:false na OPÇÃO da camada (o antigo `clickable` dentro de
  // `style` é ignorado no Leaflet 1.x e a textura engolia cliques dos
  // polígonos de zona/ONG abaixo dela).
  pampasPatternLayer = L.geoJson(null, {
    interactive: false,
    style: { color: "transparent", fillColor: "url(#pampa-pattern)", fillOpacity: 0.6 },
    renderer: svgRenderer
  }).addTo(map);

  cerradoLayer = L.geoJson(null, { renderer: svgRenderer, interactive: false }).addTo(map);
  cerradoPatternLayer = L.geoJson(null, {
    interactive: false,
    style: { color: "transparent", fillColor: "url(#cerrado-pattern)", fillOpacity: 0.6 },
    renderer: svgRenderer
  }).addTo(map);

  atlanticLayer = L.geoJson(null, { renderer: svgRenderer, interactive: false }).addTo(map);
  atlanticPatternLayer = L.geoJson(null, {
    interactive: false,
    style: { color: "transparent", fillColor: "url(#tree-pattern)", fillOpacity: 0.6 },
    renderer: svgRenderer
  }).addTo(map);

  // Máscara de escurecimento fora do Sul: puramente visual (`pointerEvents`
  // não é opção do Leaflet — o correto é `interactive: false`).
  maskLayer = L.polygon(maskPaths, {
    interactive: false,
    color: "transparent",
    fillColor: "#000000",
    fillOpacity: 0.6,
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
        // Contornos dos estados: puramente visuais, nunca interceptam clique.
        var layer = L.geoJson(data, {
          interactive: false,
          style: { color: color, weight: 3, fillOpacity: 0 }
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

  // Botão "Sobre": tratado em views/partials/welcome-modal.pug (overlay global
  // WelcomeModal com localStorage "hideWelcomeScreen"). Mantido aqui apenas como
  // fallback caso o partial não esteja presente.
  $("#about-btn").click(function() {
    if (typeof window.openWelcomeModal === 'function') { window.openWelcomeModal(); return false; }
    $("#aboutModal").modal("show"); return false;
  });

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
        // Restrito ao bounding box da Região Sul (PR, SC, RS)
        fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=-27.5&lon=-51.5&bbox=-57.65,-33.75,-48.00,-22.50&limit=8`)
          .then(res => res.json())
          .then(geoData => {
            if (geoData && geoData.features) {
              geoData.features.forEach(f => {
                const p = f.properties;
                const coords = f.geometry && f.geometry.coordinates;
                if (!p || !p.name || !coords || coords.length < 2) return;
                const lng = coords[0];
                const lat = coords[1];
                const stateStr = (p.state || p.county || '').toLowerCase();

                // Garante que o resultado esteja estritamente na Região Sul (PR, SC, RS)
                const isSouthState = stateStr.includes('paraná') || stateStr.includes('parana') ||
                                     stateStr.includes('santa catarina') || stateStr.includes('rio grande do sul') ||
                                     stateStr.includes('pr') || stateStr.includes('sc') || stateStr.includes('rs');
                const inSouthBbox = (lat >= -33.75 && lat <= -22.50 && lng >= -57.65 && lng <= -48.00);

                if ((p.countrycode === 'BR' || p.country === 'Brazil') && (isSouthState || inSouthBbox)) {
                  const state = p.state || 'Sul';
                  const fullName = `${p.name}, ${state}`;
                  if (!matchedCities.some(c => c.name.toLowerCase() === fullName.toLowerCase())) {
                    matchedCities.push({
                      name: fullName,
                      lat: lat,
                      lng: lng
                    });
                  }
                }
              });
              renderSearchResults(matchedCities.slice(0, 5), matchedAnimals.slice(0, 8));
            }
          })
          .catch(() => {});
      }, 300);
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
        const imgFallback = isFallbackLogoUrl(imgUrl);

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
                <img src="${imgUrl}" alt="${a.nome_comum}${imgFallback ? ' — imagem livre não encontrada' : ''}" title="${imgFallback ? 'Imagem livre não encontrada' : a.nome_comum}">
                ${imgFallback ? '<span class="avatar-fallback-tag">Imagem livre não encontrada</span>' : ''}
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
    const iconFallback = isFallbackLogoUrl(iconUrl);
    return L.divIcon({
      className: 'custom-animal-marker',
      html: `
        <div class="marker-container">
          ${(typeof favIsFav === 'function' && favIsFav(p.animal_id || p.id)) ? '<span class="map-fav-star"><i class="fa-solid fa-star"></i></span>' : ''}
          <div class="marker-pin" style="border-color: ${borderColor};">
            <div class="marker-avatar">
              <img src="${iconUrl}" alt="${p.nome_comum || ''}${iconFallback ? ' — imagem livre não encontrada' : ''}" loading="lazy">
              ${iconFallback ? '<span class="avatar-fallback-tag" title="Imagem livre não encontrada">Imagem livre não encontrada</span>' : ''}
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
    marker.__feature = feature;

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

  // Menu de botão direito para ONGs e Zonas — idêntico ao dos animais
  // (Editar + Excluir, mesmo HTML/CSS do #admin-context-menu).
  function showOngZonaContextMenu(latlng, kind, feature) {
    const p = (feature && feature.properties) || {};
    const nome = p.nome || p.nome_comum || (kind === 'ong' ? 'Instituição' : 'Área');
    const containerPoint = map.latLngToContainerPoint(latlng);
    const menu = $("#admin-context-menu");
    menu.html(`
      <div class="admin-menu-item" id="menu-edit-entity">
        <i class="fa-solid fa-pen-to-square text-warning me-2"></i>
        <span>Editar ${nome}</span>
      </div>
      <div class="admin-menu-item text-danger" id="menu-delete-entity">
        <i class="fa-solid fa-trash me-2"></i>
        <span>Excluir ${nome}</span>
      </div>
    `);
    menu.css({ left: containerPoint.x + 'px', top: containerPoint.y + 'px' }).removeClass('d-none');
    $('#menu-edit-entity').off('click').on('click', function () {
      menu.addClass('d-none');
      if (kind === 'ong') openOngModalForEdit(feature);
      else openZonaModalForEdit(feature);
    });
    $('#menu-delete-entity').off('click').on('click', function () {
      menu.addClass('d-none');
      if (kind === 'ong') deleteOngWithConfirmation(p.id, nome);
      else deleteZonaWithConfirmation(p.id, nome);
    });
  }

  // Atualiza a estrela dos marcadores ao favoritar/desfavoritar (sem recarregar).
  window.__favMarkersRefresh = function () {
    try {
      if (!markersCluster || typeof createAnimalIcon !== 'function') return;
      markersCluster.getLayers().forEach(function (m) {
        try {
          if (m && m.__feature && typeof m.setIcon === 'function') {
            m.setIcon(createAnimalIcon(m.__feature.properties || {}));
          }
        } catch (e) {}
      });
    } catch (e) {}
  };

  /**
   * Cluster group principal — agrupa marcadores próximos automaticamente.
   * Pode ser desativado via #toggle-clustering (desativado por padrão).
   */
  var clusteringEnabled = false; // desativado por padrão
  var individualMarkersLayer = L.layerGroup(); // camada alternativa sem cluster

  function buildClusterGroup() {
    return L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 50,
      maxClusterRadius: 60,
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
    });
  }
  var markersCluster = buildClusterGroup(); // não adiciona ao mapa ainda
  // Inicia sem cluster: a camada individual recebe os marcadores
  if (clusteringEnabled) markersCluster.addTo(map);
  else individualMarkersLayer.addTo(map);

  // =========================================================================
  // CAMADAS DO MENU FLUTUANTE (usuário comum e admin).
  // Toggles: ícones de animais, marcadores de ONGs e zonas de preservação.
  // O estado fica em `layerVisibility` (memória): mover/zoom ou recarregar
  // uma camada nunca reseta as demais — só add/remove no mapa.
  // =========================================================================
  var layerVisibility = { animais: true, ongs: true, zonas: true };
  var ongsLayer = L.layerGroup().addTo(map);
  var zonasLayer = L.layerGroup().addTo(map);
  var zonaEntries = []; // { polygon, center, area, name } p/ labels dinâmicos
  var ZONA_DEFAULT_COLOR = '#287f5e'; // mesmo verde do círculo de preservação
  var ZONA_LABEL_MIN_ZOOM = 7; // abaixo disso os labels somem (mapa limpo)

  // Ícone de ONG (idêntico ao já usado no cadastro — sem cores novas).
  // Envolvido em .marker-container para obedecer ao slider de tamanho
  // (--marker-scale), igual aos marcadores de animais.
  function ongIcon() {
    return L.divIcon({
      className: 'custom-animal-marker',
      html: `<div class="marker-container"><div class="marker-pin" style="border-color: #3498db; background-color: #1e3d59;"><i class="fa-solid fa-hand-holding-heart text-info" style="font-size: 18px;"></i></div></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  }

  function applyLayerVisibility() {
    if (layerVisibility.animais) {
      if (clusteringEnabled) {
        if (map.hasLayer(individualMarkersLayer)) map.removeLayer(individualMarkersLayer);
        if (!map.hasLayer(markersCluster)) map.addLayer(markersCluster);
      } else {
        if (map.hasLayer(markersCluster)) map.removeLayer(markersCluster);
        if (!map.hasLayer(individualMarkersLayer)) map.addLayer(individualMarkersLayer);
      }
    } else {
      if (map.hasLayer(markersCluster)) map.removeLayer(markersCluster);
      if (map.hasLayer(individualMarkersLayer)) map.removeLayer(individualMarkersLayer);
    }
    if (layerVisibility.ongs) { if (!map.hasLayer(ongsLayer)) map.addLayer(ongsLayer); }
    else if (map.hasLayer(ongsLayer)) map.removeLayer(ongsLayer);
    if (layerVisibility.zonas) { if (!map.hasLayer(zonasLayer)) map.addLayer(zonasLayer); }
    else if (map.hasLayer(zonasLayer)) map.removeLayer(zonasLayer);
    refreshZonaLabels();
  }

  $(document).on('change', '#toggle-layer-animais', function() {
    layerVisibility.animais = $(this).is(':checked');
    applyLayerVisibility();
  });
  $(document).on('change', '#toggle-layer-ongs', function() {
    layerVisibility.ongs = $(this).is(':checked');
    applyLayerVisibility();
  });
  $(document).on('change', '#toggle-layer-zonas', function() {
    layerVisibility.zonas = $(this).is(':checked');
    applyLayerVisibility();
  });

  // Toggle de clustering de marcadores (desativado por padrão)
  $(document).on('change', '#toggle-clustering', function() {
    clusteringEnabled = $(this).is(':checked');
    // Migra todos os marcadores entre cluster e camada individual
    var allMarkers = [];
    markerByAnimal.forEach(function(m) { allMarkers.push(m); });
    markersCluster.clearLayers();
    individualMarkersLayer.clearLayers();
    if (clusteringEnabled) {
      markersCluster.addLayers(allMarkers);
    } else {
      allMarkers.forEach(function(m) { individualMarkersLayer.addLayer(m); });
    }
    applyLayerVisibility();
  });

  // Carrega ONGs persistidas (GET /api/v1/ongs/) na camada própria.
  function loadOngs() {
    $.getJSON('/api/v1/ongs/', function(res) {
      ongsLayer.clearLayers();
      window.ongFeaturesById = window.ongFeaturesById || {};
      const fc = (res && res.data) || res;
      (fc.features || []).forEach(function(f) {
        const coords = f.geometry && f.geometry.coordinates;
        if (!coords || coords.length < 2) return;
        const p = f.properties || {};
        if (p.id) window.ongFeaturesById[String(p.id)] = f;
        let popup = `<b>Instituição: ${p.nome || ''}</b>`;
        if (p.descricao) popup += `<br>${p.descricao}`;
        const contato = [p.email, p.telefone].filter(Boolean).join(' • ');
        if (contato) popup += `<br><small>${contato}</small>`;
        // Botões no mesmo estilo do animal (outline + rounded-pill).
        if (typeof isAdminModeActive === 'function' && isAdminModeActive() && p.id) {
          const safeNome = String(p.nome || '').replace(/"/g, '&quot;');
          popup += `<br><div class="d-flex gap-2 mt-2">`
            + `<button type="button" class="btn btn-outline-warning btn-sm rounded-pill btn-edit-ong" data-id="${p.id}"><i class="fa-solid fa-pen-to-square me-1"></i>Editar</button>`
            + `<button type="button" class="btn btn-outline-danger btn-sm rounded-pill btn-del-ong" data-id="${p.id}" data-nome="${safeNome}"><i class="fa-solid fa-trash me-1"></i>Excluir</button>`
            + `</div>`;
        }
        const marker = L.marker([coords[1], coords[0]], { icon: ongIcon() })
          .bindPopup(popup)
          .addTo(ongsLayer);
        marker.featureData = f;
        marker.on('contextmenu', function (e) {
          if (!isAdminModeActive()) return;
          L.DomEvent.stopPropagation(e);
          showOngZonaContextMenu(e.latlng, 'ong', f);
        });
      });
    });
  }

  // Carrega zonas persistidas (GET /api/v1/zonas-preservacao/) com o nome
  // como label em linha única, visível só no hover do polígono.
  function loadZonas() {
    $.getJSON('/api/v1/zonas-preservacao/', function(res) {
      zonasLayer.clearLayers();
      zonaEntries = [];
      window.zonaFeaturesById = window.zonaFeaturesById || {};
      const fc = (res && res.data) || res;
      (fc.features || []).forEach(function(f) {
        const g = f.geometry;
        if (!g || !g.coordinates) return;
        const p = f.properties || {};
        if (p.id) window.zonaFeaturesById[String(p.id)] = f;
        const color = (/^#[0-9a-fA-F]{6}$/.test(p.color || '')) ? p.color : ZONA_DEFAULT_COLOR;
        let polys = [];
        if (g.type === 'MultiPolygon') polys = g.coordinates;
        else if (g.type === 'Polygon') polys = [g.coordinates];
        polys.forEach(function(polyCoords) {
          const latlngs = polyCoords.map(function(ring) {
            return ring.map(function(c) { return [c[1], c[0]]; });
          });
          const polygon = L.polygon(latlngs, {
            color: color,
            fillColor: color,
            fillOpacity: 0.25,
            weight: 2
          });
          polygon.bindTooltip(p.nome || 'Zona de preservação', {
            permanent: false,
            direction: 'top',
            offset: [0, -6],
            className: 'zona-label',
            interactive: false
          });
          let popup = `<b>${p.nome || ''}</b>`;
          if (p.categoria) popup += `<br>Tipo: ${p.categoria}`;
          if (p.descricao) popup += `<br><small>${p.descricao}</small>`;
          // Botões no mesmo estilo do animal (outline + rounded-pill).
          if (typeof isAdminModeActive === 'function' && isAdminModeActive() && p.id) {
            popup += `<br><div class="d-flex gap-2 mt-2">`
              + `<button type="button" class="btn btn-outline-warning btn-sm rounded-pill btn-edit-zona" data-id="${p.id}"><i class="fa-solid fa-pen-to-square me-1"></i>Editar</button>`
              + `<button type="button" class="btn btn-outline-danger btn-sm rounded-pill btn-del-zona" data-id="${p.id}" data-nome="${String(p.nome || '').replace(/"/g, '&quot;')}"><i class="fa-solid fa-trash me-1"></i>Excluir</button>`
              + `</div>`;
          }
          polygon.bindPopup(popup);
          polygon.addTo(zonasLayer);
          polygon.featureData = f;
          polygon.on('contextmenu', function (e) {
            if (!isAdminModeActive()) return;
            L.DomEvent.stopPropagation(e);
            showOngZonaContextMenu(e.latlng, 'zona', f);
          });
          try {
            const b = polygon.getBounds();
            const area = Math.abs(b.getEast() - b.getWest()) * Math.abs(b.getNorth() - b.getSouth());
            zonaEntries.push({ polygon: polygon, center: b.getCenter(), area: area, name: p.nome || 'Zona de preservação' });
          } catch (e) {}
        });
      });
      refreshZonaLabels();
    });
  }

  // Fonte do label escala com o zoom p/ manter legibilidade (11px → 15px).
  // O label é hover-only (Leaflet mostra/esconde sozinho): aqui só se
  // atualiza o tamanho da fonte; sem abrir/fechar nem anti-sobreposição.
  function zonaLabelFontSize(z) {
    let fs = 11 + (z - ZONA_LABEL_MIN_ZOOM) * 1.3;
    if (!isFinite(fs)) fs = 12;
    if (fs < 11) fs = 11;
    if (fs > 15) fs = 15;
    return Math.round(fs * 2) / 2;
  }

  function refreshZonaLabels() {
    if (!map) return;
    let z = 6;
    try { z = map.getZoom(); } catch (e) {}
    try { map.getContainer().style.setProperty('--zona-label-fs', zonaLabelFontSize(z) + 'px'); } catch (_) {}
  }

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
  // ---------------------------------------------------------------------------
  // Posicionamento do marcador por viewport (sem "proxies" e sem tween).
  // - Ponto real dentro da tela: marcador fica nele (cluster gerencia).
  // - Ponto real fora da tela + área cruzando a tela: o PRÓPRIO marcador
  //   (click + contextmenu intactos) é posicionado num ponto da interseção
  //   VISÍVEL, com distribuição polar por índice entre os ativos (sem
  //   sobreposição) + passada anti-colisão de segurança.
  // - Fora desses casos: coordenada real (fora da tela some, normal no mapa).
  // setLatLng direto + refreshClusters: sem dessincronizar o cluster.
  // ---------------------------------------------------------------------------
  var areaPolygonsLayer = L.layerGroup().addTo(map);
  var markerByAnimal = new Map();      // animal_id (string) -> L.marker (no cluster)

  function getAreaRingsOf(p) {
    if (!p) return [];
    var raw = p.area_polygon || p.area_polygon_json || p.area_polygon_data;
    if (!raw && p.obs && typeof p.obs === 'string' && p.obs.includes('[[POLYGON_DATA]]')) {
      try {
        var parts = p.obs.split('[[POLYGON_DATA]]');
        if (parts.length > 1) raw = JSON.parse(parts[1].trim());
      } catch (e) {}
    }
    if (!raw && p.habitos && typeof p.habitos === 'string' && p.habitos.includes('[[POLYGON_DATA]]')) {
      try {
        var partsH = p.habitos.split('[[POLYGON_DATA]]');
        if (partsH.length > 1) raw = JSON.parse(partsH[1].trim());
      } catch (e) {}
    }
    if (!raw) return [];
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) {}
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      if (raw.polygons && Array.isArray(raw.polygons)) {
        raw = raw.polygons;
      } else if (raw.area_polygon && Array.isArray(raw.area_polygon)) {
        raw = raw.area_polygon;
      }
    }
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
    var isSingleRing = Array.isArray(raw[0]) && (typeof raw[0][0] === 'number' || typeof raw[0][0] === 'string');
    var rings = isSingleRing ? [raw] : raw;
    return rings.filter(function(r) { return Array.isArray(r) && r.length >= 3; });
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

  /**
   * Verifica se dois bounding boxes se sobrepõem.
   */
  function bboxOverlap(a, b) {
    if (!a || !b) return false;
    return !(a.maxLat < b.minLat || a.minLat > b.maxLat ||
             a.maxLng < b.minLng || a.minLng > b.maxLng);
  }

  /**
   * Renderiza as áreas de ocorrência de cada animal com a cor selecionada, sem tooltips.
   */
  function renderAreaPolygons() {
    areaPolygonsLayer.clearLayers();
    debugPolygonsLayer.clearLayers();
    const isVisible = $("#toggle-layer-ocorrencias").is(":checked");
    const featuresList = (rawMarkersGeoJson && rawMarkersGeoJson.features && rawMarkersGeoJson.features.length > 0)
      ? rawMarkersGeoJson.features
      : (typeof _allFeatures !== 'undefined' && _allFeatures.size > 0 ? Array.from(_allFeatures.values()) : []);

    if (!isVisible || featuresList.length === 0) return;

    var rendered = new Set();
    featuresList.forEach(function(f) {
      var p = f.properties;
      var animalId = String(p.animal_id || p.id);
      if (rendered.has(animalId)) return;
      rendered.add(animalId);
      var rings = getAreaRingsOf(p);
      if (rings.length === 0) return;
      var color = p.area_polygon_color || '#FFAA44';
      rings.forEach(function(ring) {
        if (!ring || ring.length < 3) return;
        L.polygon(ring, {
          color: color,
          fillColor: color,
          fillOpacity: 0.18,
          weight: 2,
          interactive: false
        }).addTo(areaPolygonsLayer);
      });
    });
  }

  function hashSeed01(str) {
    var h = 5381;
    var s = String(str == null ? '' : str);
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    }
    return ((h >>> 0) % 10000) / 10000;
  }

  // Memoizado (WeakMap): os mesmos anéis são medidos a cada pan/zoom.
  var ringBboxMemo = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;
  function ringBboxOf(ring) {
    if (ringBboxMemo && ring && typeof ring === 'object') {
      var hit = ringBboxMemo.get(ring);
      if (hit !== undefined) return hit;
    }
    var minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (var i = 0; i < ring.length; i++) {
      var pt = ring[i];
      if (!pt || pt.length < 2) continue;
      var lat = parseFloat(pt[0]);
      var lng = parseFloat(pt[1]);
      if (isNaN(lat) || isNaN(lng)) continue;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
    if (minLat === Infinity) return null;
    var out = { minLat: minLat, maxLat: maxLat, minLng: minLng, maxLng: maxLng };
    if (ringBboxMemo && ring && typeof ring === 'object') {
      try { ringBboxMemo.set(ring, out); } catch (e) {}
    }
    return out;
  }

  // Ponto determinístico dentro dos anéis: estável entre pans/zooms e
  // distinto por animal (seed) mesmo quando compartilham a mesma zona —
  // inclusive se o centroide cair dentro (o deslocamento inicial já usa a
  // direção da seed, ~2% do tamanho da zona). Fallback da âncora polar e do
  // submit (ponto inicial quando cria sem clicar no mapa).
  function anchorPointInRings(rings, seedStr) {
    if (!rings || rings.length === 0) return null;
    var base = rings[0];
    var bestLen = -1;
    rings.forEach(function (r) {
      if (r && r.length > bestLen) { bestLen = r.length; base = r; }
    });
    if (!base || base.length < 3) return null;
    var inside = function (lat, lng) {
      for (var i = 0; i < rings.length; i++) {
        if (isPointInsidePolygon(lat, lng, rings[i])) return true;
      }
      return false;
    };
    var b = ringBboxOf(base);
    if (!b) return [parseFloat(base[0][0]), parseFloat(base[0][1])];
    var cLat = (b.minLat + b.maxLat) / 2;
    var cLng = (b.minLng + b.maxLng) / 2;
    var span = Math.max(b.maxLat - b.minLat, b.maxLng - b.minLng) || 0.01;
    var h = hashSeed01(seedStr);
    for (var k = 0; k <= 60; k++) {
      var ang = (h * Math.PI * 2) + k * 2.39996; // ângulo dourado: espalha bem
      var rad = span * (0.02 + 0.48 * Math.sqrt(k / 60));
      var tLat = cLat + Math.sin(ang) * rad;
      var tLng = cLng + Math.cos(ang) * rad;
      if (inside(tLat, tLng)) return [tLat, tLng];
    }
    return [parseFloat(base[0][0]), parseFloat(base[0][1])];
  }

  function realLatLngOfFeature(f) {
    if (f && f.geometry && f.geometry.coordinates && f.geometry.coordinates.length >= 2) {
      var lng = parseFloat(f.geometry.coordinates[0]);
      var lat = parseFloat(f.geometry.coordinates[1]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return null;
  }

  // Recorta um anel [lat,lng] pelo retângulo da viewport (Sutherland–
  // Hodgman no plano x=lng, y=lat). Retorna anel [lat,lng] (pode esvaziar).
  function clipRingToViewport(ring, bounds) {
    var west = bounds.getWest(), east = bounds.getEast();
    var south = bounds.getSouth(), north = bounds.getNorth();
    var pts = [];
    for (var i = 0; i < ring.length; i++) {
      var q = ring[i];
      if (!q || q.length < 2) continue;
      var lat = parseFloat(q[0]);
      var lng = parseFloat(q[1]);
      if (!isNaN(lat) && !isNaN(lng)) pts.push([lng, lat]);
    }
    if (pts.length < 3) return [];
    var edges = [
      { inside: function (p) { return p[0] >= west; }, axis: 0, val: west },
      { inside: function (p) { return p[0] <= east; }, axis: 0, val: east },
      { inside: function (p) { return p[1] >= south; }, axis: 1, val: south },
      { inside: function (p) { return p[1] <= north; }, axis: 1, val: north }
    ];
    for (var e = 0; e < edges.length; e++) {
      var edge = edges[e];
      var out = [];
      for (var j = 0; j < pts.length; j++) {
        var cur = pts[j];
        var prv = pts[(j + pts.length - 1) % pts.length];
        var curIn = edge.inside(cur);
        var prvIn = edge.inside(prv);
        if (curIn) {
          if (!prvIn) {
            var hit = edgeIntersect(prv, cur, edge);
            if (hit) out.push(hit);
          }
          out.push(cur);
        } else if (prvIn) {
          var hit2 = edgeIntersect(prv, cur, edge);
          if (hit2) out.push(hit2);
        }
      }
      pts = out.filter(function (p) { return p && isFinite(p[0]) && isFinite(p[1]); });
      if (pts.length < 3) return [];
    }
    return pts.map(function (p) { return [p[1], p[0]]; });
  }

  function edgeIntersect(a, b, edge) {
    var d = (edge.axis === 0 ? b[0] - a[0] : b[1] - a[1]);
    if (Math.abs(d) < 1e-12) return null;
    var t = (edge.val - (edge.axis === 0 ? a[0] : a[1])) / d;
    if (!isFinite(t)) return null;
    return edge.axis === 0
      ? [edge.val, a[1] + t * (b[1] - a[1])]
      : [a[0] + t * (b[0] - a[0]), edge.val];
  }

  // Interseção área×viewport: anéis recortados + centro/tamanho da união
  // visível. Null se nada da área cruza a tela.
  function visibleIntersectionOfRings(rings, bounds) {
    var clipped = [];
    (rings || []).forEach(function (ring) {
      if (!ringBboxIntersectsBounds(ring, bounds)) return;
      var c = clipRingToViewport(ring, bounds);
      if (c && c.length >= 3) clipped.push(c);
    });
    if (clipped.length === 0) return null;
    var b = null;
    clipped.forEach(function (r) {
      var rb = ringBboxOf(r);
      if (!rb) return;
      b = b ? {
        minLat: Math.min(b.minLat, rb.minLat),
        maxLat: Math.max(b.maxLat, rb.maxLat),
        minLng: Math.min(b.minLng, rb.minLng),
        maxLng: Math.max(b.maxLng, rb.maxLng)
      } : rb;
    });
    if (!b) return null;
    return {
      rings: clipped,
      cxLat: (b.minLat + b.maxLat) / 2,
      cxLng: (b.minLng + b.maxLng) / 2,
      spanLat: Math.max(1e-9, b.maxLat - b.minLat),
      spanLng: Math.max(1e-9, b.maxLng - b.minLng)
    };
  }

  // Âncora polar dentro da parte visível: índice i de N distribuídos em
  // círculo ao redor do centro visível (separação natural entre ativos).
  function polarAnchorInVisible(vis, idx, total) {
    var n = Math.max(1, total);
    var ang = (idx * 2 * Math.PI) / n;
    var rad = 0.3 * Math.min(vis.spanLat, vis.spanLng);
    var cand = [vis.cxLat + Math.sin(ang) * rad, vis.cxLng + Math.cos(ang) * rad];
    for (var i = 0; i < vis.rings.length; i++) {
      if (isPointInsidePolygon(cand[0], cand[1], vis.rings[i])) return cand;
    }
    return null;
  }

  // Separação mínima em pixels entre âncoras clampadas (marcadores de 36px
  // + etiqueta). Coordenadas reais nunca são movidas (cluster cuida delas).
  var DECLUTTER_MIN_PX = 52;

  function refreshAreaViewport() {
    if (!map || !rawMarkersGeoJson || !rawMarkersGeoJson.features) return;
    var bounds;
    try { bounds = map.getBounds(); } catch (e) { return; }
    var seen = new Set();
    var plan = new Map(); // animalId -> { marker, target, clamped, rings }
    var actives = [];     // [{ animalId }] com ponto real fora da tela + área visível
    rawMarkersGeoJson.features.forEach(function (f) {
      var p = f.properties || {};
      var animalId = String(p.animal_id || p.id);
      if (seen.has(animalId)) return;
      seen.add(animalId);
      var marker = markerByAnimal.get(animalId);
      if (!marker) return;
      var real = realLatLngOfFeature(f);
      if (!real) return;
      var rings = getAreaRingsOf(p);
      var realVisible = false;
      try { realVisible = bounds.contains([real[0], real[1]]); } catch (e) {}
      // Ponto real na tela: fica nele (cluster gerencia). Sem área: idem.
      if (realVisible || rings.length === 0) {
        plan.set(animalId, { marker: marker, target: real, clamped: false, rings: rings });
        return;
      }
      var vis = visibleIntersectionOfRings(rings, bounds);
      if (!vis) {
        plan.set(animalId, { marker: marker, target: real, clamped: false, rings: rings });
        return;
      }
      actives.push({ animalId: animalId, vis: vis, p: p, real: real });
      plan.set(animalId, { marker: marker, target: real, clamped: true, rings: vis.rings });
    });
    // Distribuição polar por índice (ordem estável por id) entre os ativos.
    actives.sort(function (x, y) { return x.animalId < y.animalId ? -1 : 1; });
    actives.forEach(function (a, idx) {
      var t = plan.get(a.animalId);
      if (!t) return;
      var anchor = polarAnchorInVisible(a.vis, idx, actives.length);
      if (!anchor) anchor = anchorPointInRings(a.vis.rings, a.animalId + '|' + ((a.p && a.p.nome_cientifico) || ''));
      if (anchor) {
        t.target = anchor;
      } else {
        t.target = a.real;
        t.clamped = false;
      }
    });
    // Rede de segurança: nenhuma âncora clampada dentro da outra.
    declutterClampedAnchors(plan);
    plan.forEach(function (t, animalId) {
      if (!t.target) return;
      var cur = null;
      try { cur = t.marker.getLatLng(); } catch (e) {}
      if (cur && (Math.abs(cur.lat - t.target[0]) > 1e-9 || Math.abs(cur.lng - t.target[1]) > 1e-9)) {
        try { t.marker.setLatLng(t.target); } catch (e) {}
        try {
          if (markersCluster && typeof markersCluster.refreshClusters === 'function') markersCluster.refreshClusters(t.marker);
        } catch (e2) {}
      }
    });
  }

  // Afasta âncoras clampadas que cairiam uma dentro da outra (até 3
  // passadas). Reais ficam fixos; âncora que sair da zona volta atrás.
  function declutterClampedAnchors(plan) {
    var toPx = function (t) {
      try { return map.latLngToContainerPoint([t.target[0], t.target[1]]); } catch (e) { return null; }
    };
    var toLatLng = function (pt) {
      try { return map.containerPointToLatLng(pt); } catch (e) { return null; }
    };
    var insideRings = function (lat, lng, rings) {
      for (var i = 0; i < rings.length; i++) {
        if (isPointInsidePolygon(lat, lng, rings[i])) return true;
      }
      return false;
    };
    for (var iter = 0; iter < 3; iter++) {
      var moved = false;
      var ids = Array.from(plan.keys());
      for (var a = 0; a < ids.length; a++) {
        var ta = plan.get(ids[a]);
        if (!ta || !ta.clamped) continue;
        var pa = toPx(ta);
        if (!pa) continue;
        for (var b = 0; b < ids.length; b++) {
          if (b === a) continue;
          var tb = plan.get(ids[b]);
          if (!tb) continue;
          // Real x real o cluster resolve; só mexe se âncora envolvida.
          if (!tb.clamped && !ta.clamped) continue;
          var pb = toPx(tb);
          if (!pb) continue;
          var dx = pa.x - pb.x;
          var dy = pa.y - pb.y;
          var d2 = dx * dx + dy * dy;
          if (d2 >= DECLUTTER_MIN_PX * DECLUTTER_MIN_PX) continue;
          var d = Math.sqrt(d2);
          var ux, uy;
          if (d < 1e-6) {
            // Pontos coincidentes: direção determinística p/ desempatar.
            var fa = (a * 2.39996) % (Math.PI * 2);
            ux = Math.cos(fa);
            uy = Math.sin(fa);
            d = 0;
          } else {
            ux = dx / d;
            uy = dy / d;
          }
          var gap = DECLUTTER_MIN_PX - d;
          // Fecha o vão de uma vez: divide entre os dois se ambos móveis.
          var shareA = tb.clamped ? 0.5 : 1;
          if (nudgeAnchor(ta, pa, ux * gap * shareA, uy * gap * shareA, toPx, toLatLng, insideRings)) {
            pa = toPx(ta);
            moved = true;
          }
          // Se ambos clampados, empurra o outro na direção oposta.
          if (tb.clamped) {
            if (nudgeAnchor(tb, pb, -ux * gap * 0.5, -uy * gap * 0.5, toPx, toLatLng, insideRings)) moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  // Tenta deslocar a âncora em pixels, com recuo progressivo para continuar
  // dentro da zona. Retorna true se moveu.
  function nudgeAnchor(t, p, dpx, dpy, toPx, toLatLng, insideRings) {
    for (var k = 0; k < 5; k++) {
      var ll = toLatLng({ x: p.x + dpx, y: p.y + dpy });
      if (!ll) return false;
      if (insideRings(ll.lat, ll.lng, t.rings)) {
        t.target = [ll.lat, ll.lng];
        return true;
      }
      dpx /= 2;
      dpy /= 2;
    }
    return false;
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

  function calculateCenterOfPolygon(ring) {
    if (!ring || !Array.isArray(ring) || ring.length === 0) return [0, 0];
    let sumLat = 0, sumLng = 0, count = 0;
    for (let i = 0; i < ring.length; i++) {
      const pt = ring[i];
      if (!pt || pt.length < 2) continue;
      const lat = parseFloat(pt[0]);
      const lng = parseFloat(pt[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        sumLat += lat;
        sumLng += lng;
        count++;
      }
    }
    return count > 0 ? [sumLat / count, sumLng / count] : [0, 0];
  }

  $(document).on("change", "#toggle-layer-ocorrencias", function() {
    renderAreaPolygons();
  });

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
        if (marker) {
          markerByAnimal.set(String(id), marker);
          newMarkers.push(marker);
        }
      });

      if (newMarkers.length > 0) {
        if (clusteringEnabled) {
          markersCluster.addLayers(newMarkers);
        } else {
          newMarkers.forEach(function(m) { individualMarkersLayer.addLayer(m); });
          if (!map.hasLayer(individualMarkersLayer) && layerVisibility.animais) map.addLayer(individualMarkersLayer);
        }
      }

      // Atualiza rawMarkersGeoJson para renderAreaPolygons
      rawMarkersGeoJson = {
        type: 'FeatureCollection',
        features: Array.from(_allFeatures.values())
      };
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
        if (marker) {
          markerByAnimal.set(String(feature.properties.animal_id), marker);
          markers.push(marker);
        }
      });

      if (clusteringEnabled) {
        markersCluster.addLayers(markers);
      } else {
        markers.forEach(function(m) { individualMarkersLayer.addLayer(m); });
        if (!map.hasLayer(individualMarkersLayer) && layerVisibility.animais) map.addLayer(individualMarkersLayer);
      }
      rawMarkersGeoJson = {
        type: 'FeatureCollection',
        features: Array.from(_allFeatures.values())
      };
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
    individualMarkersLayer.clearLayers();
    markerByAnimal.clear();
    if (typeof areaPolygonsLayer !== 'undefined' && areaPolygonsLayer) areaPolygonsLayer.clearLayers();
    if (typeof debugPolygonsLayer !== 'undefined' && debugPolygonsLayer) debugPolygonsLayer.clearLayers();
    loadMarkers();
  }

  // Ao mover/zoom: carrega marcadores das novas áreas (debounced).
  // Os toggles de camadas NÃO são tocados aqui — o estado persiste.
  let _viewportTimer = null;
  let _areaViewportTimer = null;
  let _zonaLabelTimer = null;
  map.on('moveend zoomend', function () {
    clearTimeout(_viewportTimer);
    _viewportTimer = setTimeout(loadMarkersForViewport, 300);
    clearTimeout(_areaViewportTimer);
    _areaViewportTimer = setTimeout(refreshAreaViewport, 350);
    clearTimeout(_zonaLabelTimer);
    _zonaLabelTimer = setTimeout(refreshZonaLabels, 200);
  });

  // =========================================================================
  // 6. MODO ADMINISTRADOR (Login, Context Menu & Modais Split-Screen)
  // ONG e Zona usam modais fullscreen no MESMO padrão do cadastro de animais
  // (o drawer lateral foi removido do index.pug).
  // =========================================================================
  var lastClickedLatLng = null;

  // Estado dos modais de ONG e Zona. `var` (e não `let`) de propósito: este
  // bloco executa antes de updateAdminUI() chamar closeAdminDrawer().
  var ongRightMap = null;
  var ongRightMarker = null;
  var zonaRightMap = null;
  var zonaRightMarker = null;
  var zonaPolygonLayersGroup = null;
  var zonaDraftPolygonsList = [[]];
  var zonaPolygonColor = '#287f5e'; // verde da preservação (já usado no mapa)
  var zonaPolygonHistory = [];
  var zonaPolygonRedo = [];
  var isZonaDrawingPolygon = false;

  function isAdminModeActive() {
    return sessionStorage.getItem("adminMode") === "true";
  }

  function updateAdminUI() {
    if (isAdminModeActive()) {
      $("#admin-mode-badge").removeClass("d-none");
      renderAreaPolygons();
      $("#admin-btn").addClass("admin-active").attr("title", "Clique para encerrar o Modo Administrador");
      $("#admin-btn").attr("href", "#");
    } else {
      $("#admin-mode-badge").addClass("d-none");
      renderAreaPolygons();
      $("#admin-btn").removeClass("admin-active").attr("title", "Acesso Administrador");
      $("#admin-btn").attr("href", "/admin/login");
      closeAdminDrawer();
    }
    // Recarrega ONGs e zonas para mostrar/ocultar os botões de excluir
    // dos popups conforme o modo (admin ou comum).
    if (typeof loadOngs === 'function') loadOngs();
    if (typeof loadZonas === 'function') loadZonas();
  }

  $("#admin-btn").click(async function(e) {
    if (isAdminModeActive()) {
      e.preventDefault();
      if (await systemConfirm("Deseja sair do Modo Administrador e retornar ao modo normal?", { title: 'Sair do modo admin', confirmText: 'Sair', danger: false })) {
        sessionStorage.removeItem("adminMode");
        updateAdminUI();
        systemAlert("Modo Administrador encerrado.", 'info');
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
        <span>Criar Instituição</span>
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
    // Sincroniza o hidden de coordenadas com ESTE animal: sem isso o PATCH
    // reaproveitava o valor antigo (posição do animal criado/editado antes)
    // e teleportava o marcador para o lugar errado.
    $("#modal-coordenadas-json-hidden").val(JSON.stringify([{ lat: lat, lng: lng }]));
    form.find('input[name="nome_comum"]').val(props.nome_comum || "");
    form.find('input[name="nome_cientifico"]').val(props.nome_cientifico || "");
    form.find('select[name="classe"]').val(props.classe || "Mammalia");
    form.find('input[name="familia"]').val(props.familia || "");
    form.find('input[name="peso"]').val(props.peso || "");
    form.find('input[name="altura"]').val(props.altura || "");
    form.find('input[name="dieta"]').val(props.dieta || "");
    form.find('textarea[name="habitos"]').val(props.habitos || props.obs || "");

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
    modalGalleryTouched = false;
    renderModalImageGallery();

    let iconUrl = props.icone;
    // Limpa base64 antigo: ele é regenerado do preview no submit; sem isso
    // o ícone do animal editado ANTES vazava para ESTE animal.
    $('#modal-input-icon-base64').val('');
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

    isModalDrawingPolygon = false;
    try {
      $('#modal-btn-draw-polygon-mode').removeClass('btn-success text-white').addClass('btn-info text-dark')
        .html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
      if (modalRightMap) modalRightMap.getContainer().style.cursor = '';
    } catch (e) {}
    modalPolygonHistory = [];
    modalPolygonRedo = [];
    try { updateModalUndoRedoButtonsUI(); } catch (e) {}

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
    } else if (props.obs && typeof props.obs === 'string' && props.obs.includes('[[POLYGON_DATA]]')) {
      try {
        const parsed = JSON.parse(props.obs.split('[[POLYGON_DATA]]')[1].trim());
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.polygons) {
          modalPolygonColor = parsed.color || '#FFAA44';
          modalDraftPolygonsList = parsed.polygons;
        } else if (Array.isArray(parsed)) {
          modalPolygonColor = props.area_polygon_color || '#FFAA44';
          modalDraftPolygonsList = (Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) ? parsed : [parsed];
        } else {
          modalDraftPolygonsList = [[]];
        }
      } catch (e) {
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
  let isModalDrawingPolygon = false;

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
      modalGalleryTouched = false;
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
      // Modais split-screen no padrão do cadastro de animais (sem drawer).
      if (action === "preservacao") openZonaModal(latlng);
      else openOngModal(latlng);
    }
  }

  // Minimapa 100% IDÊNTICO ao Mapa Principal no Modal Split-Screen
  function initModalRightPanelMap(lat, lng) {
    setTimeout(() => {
      if (!modalRightMap) {
        modalRightMap = L.map('modal-right-panel-map', {
          center: [lat, lng],
          zoom: 7,
          zoomControl: true,
          attributionControl: false
        });
        // Base dark: igual ao mapa original.
        darkTileLayer().addTo(modalRightMap);
        // Segundo invalidate tardio: garante render mesmo se o modal ainda
        // estava animando/quase sem tamanho na criação (mapa preto).
        setTimeout(() => { try { modalRightMap.invalidateSize(); } catch (e) {} }, 700);

        const svgRenderer = L.svg({ padding: 0 });
        const pampasLayerM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#3b7ba5", fillOpacity: 0.3 } }).addTo(modalRightMap);
        const pampasPatternM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#pampa-pattern-mod)", fillOpacity: 0.6 } }).addTo(modalRightMap);
        const cerradoLayerM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#E6C140", fillOpacity: 0.4 } }).addTo(modalRightMap);
        const cerradoPatternM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#cerrado-pattern-mod)", fillOpacity: 0.6 } }).addTo(modalRightMap);
        const atlanticLayerM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#287f5e", fillOpacity: 0.1 } }).addTo(modalRightMap);
        const atlanticPatternM = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#tree-pattern-mod)", fillOpacity: 0.6 } }).addTo(modalRightMap);

        const modalMaskPaths = [[[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]]];
        const modalMask = L.polygon(modalMaskPaths, {
          interactive: false,
          color: "transparent",
          fillColor: "#000000",
          fillOpacity: 0.6,
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

              let pampaDiffM = null;
              if (rsData.features && cleanForest) {
                pampaDiffM = turf.difference(turf.simplify(turf.buffer(rsData.features[0], 0), { tolerance: 0.003 }), cleanForest);
                if (pampaDiffM) { pampasLayerM.addData(pampaDiffM); pampasPatternM.addData(pampaDiffM); }
              }
              let cerradoDiffM = null;
              if (prData.features && cleanForest) {
                cerradoDiffM = turf.difference(turf.simplify(turf.buffer(prData.features[0], 0), { tolerance: 0.003 }), cleanForest);
                if (cerradoDiffM) { cerradoLayerM.addData(cerradoDiffM); cerradoPatternM.addData(cerradoDiffM); }
              }

              // Cache preciso p/ "Usar bioma como área" (Mata recortada p/ o Sul).
              try {
                modalPreciseBiomeAreas = {
                  mata_atlantica: modalGeoJsonToLatLngRings(modalClipForestToSouth(cleanForest, prData, scData, rsData)),
                  pampa: modalGeoJsonToLatLngRings(pampaDiffM),
                  cerrado: modalGeoJsonToLatLngRings(cerradoDiffM)
                };
              } catch (e) { modalPreciseBiomeAreas = null; }
            } catch (e) {}
          }

          L.geoJson(prData, { interactive: false, style: { color: "#1E7552", weight: 2, fillOpacity: 0 } }).addTo(modalRightMap);
          L.geoJson(scData, { interactive: false, style: { color: "#FF0000", weight: 2, fillOpacity: 0 } }).addTo(modalRightMap);
          L.geoJson(rsData, { interactive: false, style: { color: "#FFFF00", weight: 2, fillOpacity: 0 } }).addTo(modalRightMap);

          [prData, scData, rsData].forEach(d => {
            (d.features || []).forEach(f => {
              if (!f.geometry) return;
              const type = f.geometry.type;
              const coords = f.geometry.coordinates;
              if (type === "Polygon") {
                coords.forEach(ring => { modalMaskPaths.push(ring.map(c => [c[1], c[0]])); });
              } else if (type === "MultiPolygon") {
                coords.forEach(poly => { poly.forEach(ring => { modalMaskPaths.push(ring.map(c => [c[1], c[0]])); }); });
              }
            });
          });
          try { modalMask.setLatLngs(modalMaskPaths); } catch (e) {}

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
                const iconSrcFallback = isFallbackLogoUrl(iconSrc);

                return L.marker(latlng, {
                  icon: L.divIcon({
                    className: 'custom-animal-marker',
                    html: `
                      <div class="marker-pin" style="border-color: ${borderColor};">
                        <div class="marker-avatar">
                          <img src="${iconSrc}" alt="${p.nome_comum}">
                          ${iconSrcFallback ? '<span class="avatar-fallback-tag" title="Imagem livre não encontrada">Imagem livre não encontrada</span>' : ''}
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
        // Modal acabou de ficar visível: adia o invalidate para depois do
        // layout (sem isso o mapa reabre cinza/0x0).
        setTimeout(() => {
          try { modalRightMap.invalidateSize(); } catch (e) {}
          try { modalRightMap.setView([lat, lng], Math.max(modalRightMap.getZoom(), 8)); } catch (e) {
            try { modalRightMap.setView([lat, lng], 8); } catch (_) {}
          }
          if (modalRightMarker) {
            modalRightMarker.setLatLng([lat, lng]);
          }
        }, 60);
      }
      redrawModalDraftPolygonLayers();
    }, 200);
  }
  let modalDraftPolygonsList = [[]];
  let modalPolygonColor = '#FFAA44';
  let modalPolygonHistory = [];
  let modalPolygonRedo = [];
  let modalPolygonLayersGroup = null;
  // Contornos precisos dos biomas (turf, iguais aos desenhados no modal).
  let modalPreciseBiomeAreas = null;

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
      systemAlert('Complete pelo menos 3 pontos no polígono atual antes de iniciar uma nova área.', 'warning');
    }
  });

  $(document).on('click', '#modal-btn-undo-polygon', function() {
    undoModalPolygonState();
  });

  $(document).on('click', '#modal-btn-redo-polygon', function() {
    redoModalPolygonState();
  });

  $(document).on('change input', '#modal-polygon-color-picker', function() {
    saveModalPolygonHistoryState();
    modalPolygonColor = $(this).val();
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

  // Usar bioma inteiro como área de ocorrência (sem desenhar manualmente).
  // Usa os contornos PRECISOS do modal (turf); API simplificada só de fallback.
  const MODAL_BIOME_AREA_META = {
    mata_atlantica: { nome: 'Mata Atlântica', color: '#1B5E20' },
    pampa: { nome: 'Pampa', color: '#9C7A2E' },
    cerrado: { nome: 'Cerrado', color: '#B8912E' }
  };
  function modalGeoJsonToLatLngRings(geo) {
    const rings = [];
    if (!geo) return rings;
    const collect = (g) => {
      if (!g) return;
      if (g.type === 'FeatureCollection') (g.features || []).forEach(collect);
      else if (g.type === 'GeometryCollection') (g.geometries || []).forEach(collect);
      else if (g.type === 'Feature') collect(g.geometry);
      else if (g.type === 'Polygon') { if (g.coordinates && g.coordinates[0]) rings.push(g.coordinates[0]); }
      else if (g.type === 'MultiPolygon') (g.coordinates || []).forEach(p => { if (p && p[0]) rings.push(p[0]); });
    };
    collect(geo);
    return rings
      .map(ring => ring.map(c => [parseFloat(c[1]), parseFloat(c[0])]).filter(pt => !isNaN(pt[0]) && !isNaN(pt[1])))
      .filter(ring => ring.length >= 3);
  }
  function modalClipForestToSouth(cleanForest, prData, scData, rsData) {
    try {
      if (!window.turf || !cleanForest) return null;
      const parts = [];
      [prData, scData, rsData].forEach(d => {
        try {
          const f = d && d.features && d.features[0];
          if (!f) return;
          let part = null;
          try {
            part = turf.intersect(cleanForest, f);
          } catch (e1) {
            try {
              part = turf.intersect({ type: 'FeatureCollection', features: [cleanForest, f] });
            } catch (e2) { part = null; }
          }
          if (part) parts.push(part);
        } catch (e) {}
      });
      if (parts.length === 0) return null;
      return { type: 'FeatureCollection', features: parts };
    } catch (e) { return null; }
  }
  let modalBiomasAreasCache = null;
  function fetchModalBiomasAreas() {
    if (modalBiomasAreasCache) return Promise.resolve(modalBiomasAreasCache);
    return fetch('/api/v1/biomas-areas/')
      .then(r => r.json())
      .then(res => {
        const arr = (res && res.data) || res || [];
        modalBiomasAreasCache = Array.isArray(arr) ? arr : [];
        return modalBiomasAreasCache;
      });
  }
  function selectModalBiomeChipByKey(key) {
    const term = key === 'mata_atlantica' ? 'mata' : key;
    const scope = $('#modal-biomes-tag-selector').length ? '#modal-biomes-tag-selector ' : '';
    let matched = false;
    $(scope + '.biome-chip').each(function() {
      const label = ($(this).text() || '').toLowerCase();
      if (label.includes(term)) {
        $(this).attr('data-selected', 'true');
        $(this).find('.chip-icon').removeClass('fa-plus').addClass('fa-check');
        matched = true;
      }
    });
    if (matched) {
      const selectedIds = [];
      $(scope + '.biome-chip[data-selected="true"]').each(function() {
        selectedIds.push($(this).attr('data-id'));
      });
      $('.select-biomas').val(selectedIds);
    }
  }
  // Ramer-Douglas-Peucker puro (sem turf, que quebra em anéis grandes):
  // afina anéis gigantes (biomas precisos têm 20k+ pontos) para ~220m de
  // desvio máx. Anéis pequenos passam intactos.
  function simplifyBigRingRDP(ring, eps) {
    var pts = ring.map(function (p) { return [parseFloat(p[0]), parseFloat(p[1])]; });
    if (pts.length <= 1000) return pts;
    eps = eps || 0.002;
    var keep = new Array(pts.length).fill(false);
    keep[0] = keep[pts.length - 1] = true;
    var segD2 = function (p, a, b) {
      var dx = b[1] - a[1], dy = b[0] - a[0];
      var L2 = dx * dx + dy * dy;
      var t = L2 > 0 ? ((p[1] - a[1]) * dx + (p[0] - a[0]) * dy) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      var ex = a[1] + t * dx - p[1], ey = a[0] + t * dy - p[0];
      return ex * ex + ey * ey;
    };
    var stack = [[0, pts.length - 1]];
    while (stack.length) {
      var seg = stack.pop();
      var i0 = seg[0], i1 = seg[1];
      var dmax = -1, imax = -1;
      for (var i = i0 + 1; i < i1; i++) {
        var d = segD2(pts[i], pts[i0], pts[i1]);
        if (d > dmax) { dmax = d; imax = i; }
      }
      if (dmax > eps * eps && imax > 0) {
        keep[imax] = true;
        stack.push([i0, imax], [imax, i1]);
      }
    }
    return pts.filter(function (_, i) { return keep[i]; });
  }
  // Seleciona os anéis representativos: descarta micro-ilhas (<~200m de
  // lado), fica com os 25 maiores e afina com RDP (tol 0.003 ≈ 330m).
  // Biomas precisos vêm com centenas de anéis — sem isso o payload vai a MBs.
  function selectRepresentativeRings(rings) {
    var scored = [];
    (rings || []).forEach(function (ring) {
      if (!ring || ring.length < 3) return;
      var b = ringBboxOf(ring);
      if (!b) return;
      var span = Math.max(b.maxLat - b.minLat, b.maxLng - b.minLng);
      if (span < 0.002) return; // micro-ilha irrelevante na tela
      scored.push({ ring: ring, area: (b.maxLat - b.minLat) * (b.maxLng - b.minLng) });
    });
    scored.sort(function (x, y) { return y.area - x.area; });
    return scored.slice(0, 25).map(function (o) { return simplifyBigRingRDP(o.ring, 0.003); });
  }
  function applyModalBiomeAreaRings(key, nome, color, rings) {
    saveModalPolygonHistoryState();
    if (color) {
      modalPolygonColor = color;
      try { $('#modal-polygon-color-picker').val(modalPolygonColor); } catch (e) {}
    }
    modalDraftPolygonsList = (modalDraftPolygonsList || []).filter(r => r && r.length > 0);
    // 5 decimais (~1m) + seleção RDP: 219 anéis/0,9 MB -> ~25 anéis/~10 KB.
    const round5 = (v) => Math.round(parseFloat(v) * 1e5) / 1e5;
    const slimRings = selectRepresentativeRings(rings.map(ring => ring.map(pt => [round5(pt[0]), round5(pt[1])])));
    slimRings.forEach(ring => {
      modalDraftPolygonsList.push(ring);
    });
    selectModalBiomeChipByKey(key);
    redrawModalDraftPolygonLayers();
    try {
      const bounds = L.latLngBounds([]);
      rings.forEach(ring => ring.forEach(pt => bounds.extend(pt)));
      if (bounds.isValid() && modalRightMap) modalRightMap.fitBounds(bounds.pad(0.1));
    } catch (e) {}
    systemAlert(`Área do bioma ${nome} aplicada (${rings.length} área(s)). Dá para ajustar ou apagar depois.`, 'success');
  }
  $(document).on('click', '#modal-btn-use-biome-area', function() {
    const key = $('#modal-biome-area-selector').val() || 'mata_atlantica';
    const meta = MODAL_BIOME_AREA_META[key] || { nome: key, color: null };
    const precise = (modalPreciseBiomeAreas && modalPreciseBiomeAreas[key]) || [];
    if (precise.length > 0) {
      applyModalBiomeAreaRings(key, meta.nome, meta.color, precise);
      return;
    }
    fetchModalBiomasAreas().then(list => {
      const found = list.find(b => b.key === key);
      if (!found || !found.polygons || found.polygons.length === 0) {
        systemAlert('Bioma não encontrado. Tente novamente.', 'warning');
        return;
      }
      applyModalBiomeAreaRings(key, found.nome || meta.nome, found.color || meta.color, found.polygons);
    }).catch(err => {
      console.error('Erro ao carregar bioma:', err);
      systemAlert('Erro ao carregar área do bioma.', 'error');
    });
  });

  $(document).on('keydown', function(e) {
    // Desfazer/refazer do editor de polígonos: vale para o modal de animais
    // e para o modal de zona (cada um com sua própria pilha de histórico).
    const animalOpen = $('#species-admin-modal').is(':visible');
    const zonaOpen = !animalOpen && $('#zona-admin-modal').is(':visible');
    if (!animalOpen && !zonaOpen) return;
    const doUndo = animalOpen ? undoModalPolygonState : undoZonaPolygonState;
    const doRedo = animalOpen ? redoModalPolygonState : redoZonaPolygonState;
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
      if (e.shiftKey) {
        doRedo();
      } else {
        doUndo();
      }
    } else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
      doRedo();
    }
  });

  // =========================================================================
  // 6b. MODAIS DE ONG E ZONA — mesmo padrão do cadastro de animais.
  // Mapas próprios (dark) + marcador arrastável; a Zona usa o MESMO editor
  // de polígonos do animal (desenhar / nova área / desfazer / refazer / cor
  // / limpar), com estado independente (prefixo zona*).
  // =========================================================================

  // Camada de contexto: marcadores de animais nos minimapas (mesmo estilo).
  function addMarkersOverlayToMiniMap(miniMap) {
    $.getJSON('/api/markers', function(data) {
      if (!data || !data.features) return;
      L.geoJSON(data, {
        pointToLayer: function(feature, latlng) {
          const p = feature.properties || {};
          const statusSigla = p.nivel_sigla ? p.nivel_sigla.toLowerCase() : 'dd';
          const borderColor = extinctionColorMap[statusSigla] || '#1a5fb4';
          const iconSrc = p.icone || (p.imagens && p.imagens.length > 0 ? p.imagens[0].imagem : '/assets/img/logotipo.png');
          const iconSrcFallback = isFallbackLogoUrl(iconSrc);
          return L.marker(latlng, {
            icon: L.divIcon({
              className: 'custom-animal-marker',
              html: `
                <div class="marker-pin" style="border-color: ${borderColor};">
                  <div class="marker-avatar">
                    <img src="${iconSrc}" alt="${p.nome_comum || ''}">
                    ${iconSrcFallback ? '<span class="avatar-fallback-tag" title="Imagem livre não encontrada">Imagem livre não encontrada</span>' : ''}
                  </div>
                  <span class="marker-name-label">${p.nome_comum || ''}</span>
                </div>
              `,
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            })
          });
        }
      }).addTo(miniMap);
    });
  }

  function darkTileLayer() {
    return L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_3l5t_1_889f4489a3fb5fb5051816e3', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '© CARTO'
    });
  }

  // Injeta os patterns de textura no SVG do minimapa indicado.
  // Cada mapa tem seu próprio <svg>, por isso o sufixo é único por mapa
  // ('mod', 'ong', 'zona') — reutilizar o mesmo id em outro SVG não renderiza.
  function injectTreePatternsFor(containerId, suffix) {
    const svg = document.querySelector('#' + containerId + ' svg');
    if (!svg) { setTimeout(function() { injectTreePatternsFor(containerId, suffix); }, 300); return; }
    const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), svg.firstChild);
    const patterns = [
      { id: 'tree-pattern-' + suffix, img: '/svg/mataatlantica.png', size: 100, icons: [[10,10,40],[60,50,30]] },
      { id: 'pampa-pattern-' + suffix, img: '/svg/pampa.png', size: 80, icons: [[10,10,35],[45,40,25]] },
      { id: 'cerrado-pattern-' + suffix, img: '/svg/cerrado.png', size: 90, icons: [[10,10,40],[55,45,30]] }
    ];
    patterns.forEach(p => {
      if (svg.querySelector('#' + CSS.escape(p.id))) return;
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
    });
  }

  // Base dos minimapas idêntica ao preview de animais: biomas + máscara +
  // contornos dos estados, nas mesmas cores/opacidades do mapa principal.
  function initMiniMapBaseLayers(miniMap, suffix) {
    const containerId = suffix === 'ong' ? 'ong-right-panel-map'
      : suffix === 'zona' ? 'zona-right-panel-map' : 'modal-right-panel-map';
    const svgRenderer = L.svg({ padding: 0 });
    const pampas = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#3b7ba5", fillOpacity: 0.3 } }).addTo(miniMap);
    const pampasPat = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#pampa-pattern-" + suffix + ")", fillOpacity: 0.6 } }).addTo(miniMap);
    const cerrado = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#E6C140", fillOpacity: 0.4 } }).addTo(miniMap);
    const cerradoPat = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#cerrado-pattern-" + suffix + ")", fillOpacity: 0.6 } }).addTo(miniMap);
    const atlantic = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "#287f5e", fillOpacity: 0.1 } }).addTo(miniMap);
    const atlanticPat = L.geoJson(null, { renderer: svgRenderer, interactive: false, style: { color: "transparent", fillColor: "url(#tree-pattern-" + suffix + ")", fillOpacity: 0.6 } }).addTo(miniMap);
    // Cópia local da máscara: não polui o maskPaths global do mapa principal.
    const localMask = [[[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]]];
    const mask = L.polygon(localMask, {
      interactive: false,
      color: "transparent",
      fillColor: "#000000",
      fillOpacity: 0.6,
      fillRule: 'evenodd'
    }).addTo(miniMap);
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
          atlantic.addData(simplifiedForest);
          atlanticPat.addData(simplifiedForest);
          let merged = simplifiedForest.features[0];
          for (let i = 1; i < simplifiedForest.features.length; i++) {
            try {
              const union = turf.union(merged, simplifiedForest.features[i]);
              if (union) merged = union;
            } catch(e) {}
          }
          const cleanForest = turf.simplify(turf.buffer(merged, 0), { tolerance: 0.003 });
          if (rsData.features && cleanForest) {
            const pampaDiff = turf.difference(turf.simplify(turf.buffer(rsData.features[0], 0), { tolerance: 0.003 }), cleanForest);
            if (pampaDiff) { pampas.addData(pampaDiff); pampasPat.addData(pampaDiff); }
          }
          if (prData.features && cleanForest) {
            const cerradoDiff = turf.difference(turf.simplify(turf.buffer(prData.features[0], 0), { tolerance: 0.003 }), cleanForest);
            if (cerradoDiff) { cerrado.addData(cerradoDiff); cerradoPat.addData(cerradoDiff); }
          }
        } catch (e) {}
      }
      L.geoJson(prData, { interactive: false, style: { color: "#1E7552", weight: 2, fillOpacity: 0 } }).addTo(miniMap);
      L.geoJson(scData, { interactive: false, style: { color: "#FF0000", weight: 2, fillOpacity: 0 } }).addTo(miniMap);
      L.geoJson(rsData, { interactive: false, style: { color: "#FFFF00", weight: 2, fillOpacity: 0 } }).addTo(miniMap);
      [prData, scData, rsData].forEach(d => {
        (d.features || []).forEach(f => {
          if (!f.geometry) return;
          const type = f.geometry.type;
          const coords = f.geometry.coordinates;
          if (type === "Polygon") {
            coords.forEach(ring => { localMask.push(ring.map(c => [c[1], c[0]])); });
          } else if (type === "MultiPolygon") {
            coords.forEach(poly => { poly.forEach(ring => { localMask.push(ring.map(c => [c[1], c[0]])); }); });
          }
        });
      });
      try { mask.setLatLngs(localMask); } catch (e) {}
      injectTreePatternsFor(containerId, suffix);
    });
  }

  function syncOngFormCoords(lat, lng) {
    const form = $("#form-create-ong");
    form.find(".coord-lat").val(lat.toFixed(6));
    form.find(".coord-lng").val(lng.toFixed(6));
    form.find(".input-lat").val(lat.toFixed(6));
    form.find(".input-lng").val(lng.toFixed(6));
  }

  function syncZonaFormCoords(lat, lng) {
    const form = $("#form-create-preservacao");
    form.find(".coord-lat").val(lat.toFixed(6));
    form.find(".coord-lng").val(lng.toFixed(6));
    form.find(".input-lat").val(lat.toFixed(6));
    form.find(".input-lng").val(lng.toFixed(6));
  }

  function openOngModal(latlng) {
    closeAdminDrawer();
    $("#ong-edit-id").val("");
    const lat = parseFloat(latlng.lat.toFixed(6));
    const lng = parseFloat(latlng.lng.toFixed(6));
    $("#ong-admin-modal").removeClass("d-none");
    const form = $("#form-create-ong");
    form[0].reset();
    syncOngFormCoords(lat, lng);
    initOngRightPanelMap(lat, lng);
  }

  // Edição de ONG: pré-preenche o modal com os dados da feature.
  function openOngModalForEdit(feature) {
    if (!isAdminModeActive()) return;
    closeAdminDrawer();
    const p = (feature && feature.properties) || {};
    let lat = -27.59, lng = -48.54;
    try {
      const c = feature.geometry && feature.geometry.coordinates;
      if (c && c.length >= 2) { lng = parseFloat(c[0]); lat = parseFloat(c[1]); }
    } catch (e) {}
    $("#ong-admin-modal").removeClass("d-none");
    const form = $("#form-create-ong");
    form[0].reset();
    $("#ong-edit-id").val(p.id || '');
    form.find('input[name="nome"]').val(p.nome || '');
    form.find('input[name="foco"]').val(p.foco || '');
    form.find('input[name="email"]').val(p.email || '');
    form.find('input[name="telefone"]').val(p.telefone || '');
    form.find('textarea[name="descricao"]').val(p.descricao || '');
    syncOngFormCoords(lat, lng);
    initOngRightPanelMap(lat, lng);
  }

  function initOngRightPanelMap(lat, lng) {
    setTimeout(() => {
      if (!ongRightMap) {
        ongRightMap = L.map('ong-right-panel-map', {
          center: [lat, lng],
          zoom: 7,
          zoomControl: true,
          attributionControl: false
        });
        darkTileLayer().addTo(ongRightMap);
        // Segundo invalidate tardio: garante render mesmo se o modal ainda
        // estava animando/quase sem tamanho na criação (mapa preto).
        setTimeout(() => { try { ongRightMap.invalidateSize(); } catch (e) {} }, 700);
        // Base idêntica ao preview de animais: biomas + máscara + estados.
        initMiniMapBaseLayers(ongRightMap, 'ong');
        addMarkersOverlayToMiniMap(ongRightMap);
        ongRightMarker = L.marker([lat, lng], { draggable: true, icon: ongIcon() }).addTo(ongRightMap);
        ongRightMarker.on('dragend', function(e) {
          const pos = e.target.getLatLng();
          syncOngFormCoords(pos.lat, pos.lng);
        });
        ongRightMap.on('click', function(e) {
          if (ongRightMarker) ongRightMarker.setLatLng(e.latlng);
          syncOngFormCoords(e.latlng.lat, e.latlng.lng);
        });
        setupMarkerDragEvents($("#form-create-ong"), ongRightMarker, ongRightMap);
      } else {
        setTimeout(() => {
          try { ongRightMap.invalidateSize(); } catch (e) {}
          try { ongRightMap.setView([lat, lng], Math.max(ongRightMap.getZoom(), 8)); } catch (e) {
            try { ongRightMap.setView([lat, lng], 8); } catch (_) {}
          }
          if (ongRightMarker) ongRightMarker.setLatLng([lat, lng]);
        }, 60);
      }
    }, 200);
  }

  function openZonaModal(latlng) {
    closeAdminDrawer();
    $("#zona-edit-id").val("");
    const lat = parseFloat(latlng.lat.toFixed(6));
    const lng = parseFloat(latlng.lng.toFixed(6));
    $("#zona-admin-modal").removeClass("d-none");
    const form = $("#form-create-preservacao");
    form[0].reset();
    syncZonaFormCoords(lat, lng);
    // Reseta o editor de polígonos (mesmo fluxo do modal de animais).
    isZonaDrawingPolygon = false;
    $('#zona-btn-draw-polygon-mode')
      .removeClass('btn-success text-white')
      .addClass('btn-info text-dark')
      .html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
    zonaDraftPolygonsList = [[]];
    zonaPolygonHistory = [];
    zonaPolygonRedo = [];
    updateZonaUndoRedoButtonsUI();
    initZonaRightPanelMap(lat, lng);
  }

  // Edição de Zona: pré-preenche o modal e carrega o polígono existente
  // no editor (convertendo GeoJSON [lng,lat] para [lat,lng] do Leaflet).
  function openZonaModalForEdit(feature) {
    if (!isAdminModeActive()) return;
    closeAdminDrawer();
    const p = (feature && feature.properties) || {};
    const g = (feature && feature.geometry) || {};
    let lat = -27.59, lng = -48.54;
    let rings = [];
    try {
      let polys = [];
      if (g.type === 'MultiPolygon') polys = g.coordinates || [];
      else if (g.type === 'Polygon') polys = [g.coordinates];
      polys.forEach(function(polyCoords) {
        (polyCoords || []).forEach(function(ring) {
          const pts = (ring || []).map(c => [parseFloat(c[1]), parseFloat(c[0])]).filter(pt => !isNaN(pt[0]) && !isNaN(pt[1]));
          if (pts.length >= 3) rings.push(pts);
        });
      });
      if (rings.length > 0) {
        let sLat = 0, sLng = 0, n = 0;
        rings[0].forEach(pt => { sLat += pt[0]; sLng += pt[1]; n++; });
        if (n > 0) { lat = sLat / n; lng = sLng / n; }
      }
    } catch (e) { rings = []; }
    $("#zona-admin-modal").removeClass("d-none");
    const form = $("#form-create-preservacao");
    form[0].reset();
    $("#zona-edit-id").val(p.id || '');
    form.find('input[name="nome"]').val(p.nome || '');
    form.find('select[name="categoria"]').val(p.categoria || 'Parque Nacional');
    form.find('textarea[name="descricao"]').val(p.descricao || '');
    zonaPolygonColor = (/^#[0-9a-fA-F]{6}$/.test(p.color || '')) ? p.color : '#287f5e';
    try { $('#zona-polygon-color-picker').val(zonaPolygonColor); } catch (e) {}
    isZonaDrawingPolygon = false;
    $('#zona-btn-draw-polygon-mode')
      .removeClass('btn-success text-white')
      .addClass('btn-info text-dark')
      .html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
    zonaDraftPolygonsList = rings.length > 0 ? rings : [[]];
    zonaPolygonHistory = [];
    zonaPolygonRedo = [];
    updateZonaUndoRedoButtonsUI();
    syncZonaFormCoords(lat, lng);
    initZonaRightPanelMap(lat, lng);
    setTimeout(() => { try { redrawZonaDraftPolygonLayers(); } catch (e) {} }, 400);
  }

  function initZonaRightPanelMap(lat, lng) {
    setTimeout(() => {
      if (!zonaRightMap) {
        zonaRightMap = L.map('zona-right-panel-map', {
          center: [lat, lng],
          zoom: 7,
          zoomControl: true,
          attributionControl: false
        });
        darkTileLayer().addTo(zonaRightMap);
        // Segundo invalidate tardio: garante render mesmo se o modal ainda
        // estava animando/quase sem tamanho na criação (mapa preto).
        setTimeout(() => { try { zonaRightMap.invalidateSize(); } catch (e) {} }, 700);
        // Base idêntica ao preview de animais: biomas + máscara + estados.
        initMiniMapBaseLayers(zonaRightMap, 'zona');
        addMarkersOverlayToMiniMap(zonaRightMap);
        zonaRightMarker = L.marker([lat, lng], {
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
        }).addTo(zonaRightMap);
        zonaRightMarker.on('dragend', function(e) {
          const pos = e.target.getLatLng();
          syncZonaFormCoords(pos.lat, pos.lng);
        });
        zonaRightMap.on('click', function(e) {
          if (isZonaDrawingPolygon) {
            saveZonaPolygonHistoryState();
            const plat = parseFloat(e.latlng.lat.toFixed(6));
            const plng = parseFloat(e.latlng.lng.toFixed(6));
            if (zonaDraftPolygonsList.length === 0) zonaDraftPolygonsList.push([]);
            zonaDraftPolygonsList[zonaDraftPolygonsList.length - 1].push([plat, plng]);
            redrawZonaDraftPolygonLayers();
          } else {
            if (zonaRightMarker) zonaRightMarker.setLatLng(e.latlng);
            syncZonaFormCoords(e.latlng.lat, e.latlng.lng);
          }
        });
        setupMarkerDragEvents($("#form-create-preservacao"), zonaRightMarker, zonaRightMap);
      } else {
        setTimeout(() => {
          try { zonaRightMap.invalidateSize(); } catch (e) {}
          try { zonaRightMap.setView([lat, lng], Math.max(zonaRightMap.getZoom(), 8)); } catch (e) {
            try { zonaRightMap.setView([lat, lng], 8); } catch (_) {}
          }
          if (zonaRightMarker) zonaRightMarker.setLatLng([lat, lng]);
        }, 60);
      }
      redrawZonaDraftPolygonLayers();
    }, 200);
  }

  // --- Editor de polígonos da Zona (espelho do editor do modal de animais) ---
  function updateZonaUndoRedoButtonsUI() {
    $('#zona-btn-undo-polygon').prop('disabled', zonaPolygonHistory.length === 0).toggleClass('opacity-50', zonaPolygonHistory.length === 0);
    $('#zona-btn-redo-polygon').prop('disabled', zonaPolygonRedo.length === 0).toggleClass('opacity-50', zonaPolygonRedo.length === 0);
  }

  function saveZonaPolygonHistoryState() {
    zonaPolygonHistory.push({
      color: zonaPolygonColor,
      polygons: JSON.parse(JSON.stringify(zonaDraftPolygonsList))
    });
    if (zonaPolygonHistory.length > 50) zonaPolygonHistory.shift();
    zonaPolygonRedo = [];
    updateZonaUndoRedoButtonsUI();
  }

  function undoZonaPolygonState() {
    if (zonaPolygonHistory.length === 0) return;
    zonaPolygonRedo.push({
      color: zonaPolygonColor,
      polygons: JSON.parse(JSON.stringify(zonaDraftPolygonsList))
    });
    const prev = zonaPolygonHistory.pop();
    zonaPolygonColor = prev.color || '#287f5e';
    $('#zona-polygon-color-picker').val(zonaPolygonColor);
    zonaDraftPolygonsList = prev.polygons || [[]];
    redrawZonaDraftPolygonLayers();
    updateZonaUndoRedoButtonsUI();
  }

  function redoZonaPolygonState() {
    if (zonaPolygonRedo.length === 0) return;
    zonaPolygonHistory.push({
      color: zonaPolygonColor,
      polygons: JSON.parse(JSON.stringify(zonaDraftPolygonsList))
    });
    const next = zonaPolygonRedo.pop();
    zonaPolygonColor = next.color || '#287f5e';
    $('#zona-polygon-color-picker').val(zonaPolygonColor);
    zonaDraftPolygonsList = next.polygons || [[]];
    redrawZonaDraftPolygonLayers();
    updateZonaUndoRedoButtonsUI();
  }

  window.editZonaPolygonRingByRef = function(ringIndex) {
    saveZonaPolygonHistoryState();
    if (ringIndex >= 0 && ringIndex < zonaDraftPolygonsList.length) {
      const target = zonaDraftPolygonsList.splice(ringIndex, 1)[0];
      zonaDraftPolygonsList.push(target);
      redrawZonaDraftPolygonLayers();
    }
    if (zonaRightMap) zonaRightMap.closePopup();
  };

  window.deleteZonaPolygonRingByRef = function(ringIndex) {
    saveZonaPolygonHistoryState();
    if (ringIndex >= 0 && ringIndex < zonaDraftPolygonsList.length) {
      zonaDraftPolygonsList.splice(ringIndex, 1);
    }
    if (zonaDraftPolygonsList.length === 0) {
      zonaDraftPolygonsList = [[]];
    }
    redrawZonaDraftPolygonLayers();
    if (zonaRightMap) zonaRightMap.closePopup();
  };

  function updateZonaPolygonHiddenInput() {
    const validPolygons = zonaDraftPolygonsList.filter(ring => ring && ring.length >= 3);
    const totalPoints = validPolygons.reduce((acc, ring) => acc + ring.length, 0);
    const currentRing = zonaDraftPolygonsList[zonaDraftPolygonsList.length - 1];
    const currentPts = (currentRing && currentRing.length > 0) ? currentRing.length : 0;

    if (validPolygons.length > 0 || currentPts > 0) {
      $('#zona-area-polygon-json-hidden').val(JSON.stringify({
        color: zonaPolygonColor,
        polygons: validPolygons
      }));

      let badgeText = `Área: ${validPolygons.length} área(s) (${totalPoints} pts)`;
      if (isZonaDrawingPolygon && currentPts < 3) {
        badgeText = `Desenhando: ${currentPts} ponto(s)... (mín 3)`;
      } else if (isZonaDrawingPolygon) {
        badgeText = `Desenhando: ${currentPts} pts na área atual`;
      }

      $('#zona-polygon-status-badge')
        .text(badgeText)
        .removeClass('bg-dark text-warning')
        .addClass('bg-success text-white');
    } else {
      $('#zona-area-polygon-json-hidden').val('');
      $('#zona-polygon-status-badge')
        .text('Nenhuma área desenhada')
        .removeClass('bg-success text-white')
        .addClass('bg-dark text-warning');
    }
  }

  function redrawZonaDraftPolygonLayers() {
    if (!zonaRightMap) return;
    if (!zonaPolygonLayersGroup) {
      zonaPolygonLayersGroup = L.layerGroup().addTo(zonaRightMap);
    } else {
      zonaPolygonLayersGroup.clearLayers();
    }

    zonaDraftPolygonsList.forEach((ring, idx) => {
      if (!ring || ring.length === 0) return;
      const isCurrentActive = (idx === zonaDraftPolygonsList.length - 1);
      let polyLayer = null;

      ring.forEach((pt) => {
        L.circleMarker(pt, {
          radius: 5,
          color: zonaPolygonColor,
          fillColor: '#FFFFFF',
          fillOpacity: 1,
          weight: 2,
          interactive: false
        }).addTo(zonaPolygonLayersGroup);
      });

      if (ring.length >= 3) {
        polyLayer = L.polygon(ring, {
          color: zonaPolygonColor,
          fillColor: zonaPolygonColor,
          fillOpacity: isCurrentActive ? 0.4 : 0.25,
          weight: isCurrentActive ? 3 : 2,
          dashArray: isCurrentActive ? '5, 5' : null,
          interactive: !isZonaDrawingPolygon
        }).addTo(zonaPolygonLayersGroup);
      } else if (ring.length > 0) {
        polyLayer = L.polyline(ring, {
          color: zonaPolygonColor,
          weight: 3,
          dashArray: '5, 5',
          interactive: !isZonaDrawingPolygon
        }).addTo(zonaPolygonLayersGroup);
      }

      if (polyLayer && !isZonaDrawingPolygon) {
        const ringIndex = idx;
        polyLayer.on('contextmenu', function(e) {
          L.DomEvent.stopPropagation(e);

          L.popup()
            .setLatLng(e.latlng)
            .setContent(`
              <div style="text-align: center; padding: 4px; min-width: 140px;">
                <strong style="color: ${zonaPolygonColor}; font-size: 13px;">Área #${ringIndex + 1} (${ring.length} pts)</strong>
                <div class="d-flex flex-column gap-2 mt-2">
                  <button type="button" class="btn btn-sm btn-info rounded-pill fw-bold text-dark" onclick="editZonaPolygonRingByRef(${ringIndex})">
                    <i class="fa-solid fa-pen me-1"></i> Editar Área
                  </button>
                  <button type="button" class="btn btn-sm btn-danger rounded-pill fw-bold" onclick="deleteZonaPolygonRingByRef(${ringIndex})">
                    <i class="fa-solid fa-trash me-1"></i> Excluir Área
                  </button>
                </div>
              </div>
            `)
            .openOn(zonaRightMap);
        });
      }
    });

    updateZonaPolygonHiddenInput();
  }

  $(document).on('click', '#zona-btn-draw-polygon-mode', function() {
    isZonaDrawingPolygon = !isZonaDrawingPolygon;
    if (isZonaDrawingPolygon) {
      $(this).removeClass('btn-info text-dark').addClass('btn-success text-white');
      $(this).html('<i class="fa-solid fa-check me-1"></i> Concluir Polígono');
      if (zonaRightMap) zonaRightMap.getContainer().style.cursor = 'crosshair';
    } else {
      $(this).removeClass('btn-success text-white').addClass('btn-info text-dark');
      $(this).html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
      if (zonaRightMap) zonaRightMap.getContainer().style.cursor = '';
    }
    redrawZonaDraftPolygonLayers();
  });

  $(document).on('click', '#zona-btn-new-polygon-area', function() {
    const lastRing = zonaDraftPolygonsList[zonaDraftPolygonsList.length - 1];
    if (lastRing && lastRing.length >= 3) {
      saveZonaPolygonHistoryState();
      zonaDraftPolygonsList.push([]);
      redrawZonaDraftPolygonLayers();
    } else {
      systemAlert('Complete pelo menos 3 pontos no polígono atual antes de iniciar uma nova área.', 'warning');
    }
  });

  $(document).on('click', '#zona-btn-undo-polygon', function() {
    undoZonaPolygonState();
  });

  $(document).on('click', '#zona-btn-redo-polygon', function() {
    redoZonaPolygonState();
  });

  $(document).on('change input', '#zona-polygon-color-picker', function() {
    saveZonaPolygonHistoryState();
    zonaPolygonColor = $(this).val();
    redrawZonaDraftPolygonLayers();
  });

  $(document).on('click', '#zona-btn-clear-polygon', function() {
    saveZonaPolygonHistoryState();
    zonaDraftPolygonsList = [[]];
    if (zonaPolygonLayersGroup) zonaPolygonLayersGroup.clearLayers();
    isZonaDrawingPolygon = false;
    $('#zona-btn-draw-polygon-mode').removeClass('btn-success text-white').addClass('btn-info text-dark')
      .html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
    if (zonaRightMap) zonaRightMap.getContainer().style.cursor = '';
    updateZonaPolygonHiddenInput();
  });

  function injectModalTreePatterns() {
    injectTreePatternsFor('modal-right-panel-map', 'mod');
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
    // Ícone NÃO entra na galeria: é exibido só no pino do mapa e no preview de edição.
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
      } else if (bId === '4' || nameLower.includes('oceano') || nameLower.includes('atlantico')) {
        cssClass = 'biome-chip-oceano-atlantico';
        bName = 'Oceano Atlântico';
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
        const imgsFallback = imgs.length > 0 && imgs.every(isFallbackLogoUrl);
        const slidesHtml = imgs.map((src, i) => `
          <img src="${src}" alt="${animal.nome_comum}${isFallbackLogoUrl(src) ? ' — imagem livre não encontrada' : ''}" class="card-slide-img ${i === 0 ? 'active' : ''}${isFallbackLogoUrl(src) ? ' img-fallback-logo' : ''}">
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
          <div class="species-card ${textureClass}" data-fav-id="${animal.id}" style="cursor: pointer; background-color: ${extinctionColor};">
            ${menuButtonHtml}
            ${(typeof favCardButtons === 'function') ? favCardButtons(animal) : ''}
            <span class="species-card-extinction-badge" style="background-color: ${extinctionColor};">${sigla}</span>
            <div class="species-card-slideshow">
              ${slidesHtml}
              ${dotsHtml}
              ${imgsFallback ? '<span class="no-photo-badge"><i class="fa-solid fa-triangle-exclamation"></i>Imagem livre não encontrada</span>' : ''}
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
      if (typeof refreshFavUI === 'function') refreshFavUI();
    });
  }

  // =========================================================================
  // 7. GALERIA DE IMAGENS E CROP CIRCULAR DO ÍCONE NO MODAL
  // =========================================================================
  // =========================================================================
  // 7. GALERIA DE IMAGENS E CROP CIRCULAR DO ÍCONE NO MODAL
  // =========================================================================
  let modalSelectedFiles = []; // Armazena objetos { id, file, currentX, currentY, scale }
  // true quando a galeria foi mexida (add/remove) desde que a edição foi
  // aberta: aí o submit sincroniza a galeria (mantidas + novas). Sem toque
  // e sem arquivo novo, o servidor preserva as fotos como estão.
  let modalGalleryTouched = false;
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
      modalGalleryTouched = true;
      renderModalImageGallery();
      this.value = ''; // Reset input para permitir re-selecionar
    }
  });

  // Reduz fotos grandes antes do upload (máx. 1000px, JPEG 0.75: ~60 KB
  // por foto em vez de 500 KB–2 MB). Arquivos pequenos e não-imagens passam
  // intactos. Nunca rejeita: em qualquer falha, usa o original.
  function downscalePhotoFile(file) {
    return new Promise(function (resolve) {
      try {
        if (!file || typeof file === 'string' || !(file instanceof Blob)) return resolve(file);
        if (!file.type || file.type.indexOf('image/') !== 0) return resolve(file);
        if (file.size <= 700 * 1024) return resolve(file);
        var url;
        try { url = URL.createObjectURL(file); } catch (e) { return resolve(file); }
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            try { URL.revokeObjectURL(url); } catch (e) {}
          if (!w || !h) return resolve(file);
          var scale = Math.min(1, 1000 / Math.max(w, h));
          if (scale >= 1) return resolve(file);
          var cv = document.createElement('canvas');
          cv.width = Math.round(w * scale);
          cv.height = Math.round(h * scale);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          var type = (file.type === 'image/png') ? 'image/png' : 'image/jpeg';
          if (cv.toBlob) {
            cv.toBlob(function (b) { resolve(b || file); }, type, 0.75);
          } else resolve(file);
          } catch (e) { resolve(file); }
        };
        img.onerror = function () { try { URL.revokeObjectURL(url); } catch (e) {} resolve(file); };
        img.src = url;
      } catch (e) { resolve(file); }
    });
  }

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
      modalGalleryTouched = true;
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

  // Gera o ícone a partir do enquadramento atual do preview.
  // 128px JPEG com fundo escuro (exibido a 30-105px com recorte circular via
  // CSS): ~8 KB em vez de ~650 KB, indistinguível na tela.
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
        const SIZE = 128;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');

        const paintCircle = function (source) {
          ctx.fillStyle = '#121118';
          ctx.fillRect(0, 0, SIZE, SIZE);

          const naturalW = source.naturalWidth || SIZE;
          const naturalH = source.naturalHeight || SIZE;
          const aspect = naturalW / naturalH;
          let drawW = SIZE, drawH = SIZE;

          if (aspect > 1) drawW = SIZE * aspect;
          else drawH = SIZE / aspect;

          const scaleRatio = SIZE / 105;
          drawW = drawW * (modalIconCropState.scale || 1.0);
          drawH = drawH * (modalIconCropState.scale || 1.0);

          const drawX = (SIZE - drawW) / 2 + (modalIconCropState.currentX * scaleRatio);
          const drawY = (SIZE - drawH) / 2 + (modalIconCropState.currentY * scaleRatio);

          ctx.drawImage(source, drawX, drawY, drawW, drawH);
          return canvas.toDataURL('image/jpeg', 0.8);
        };

        // Atalho rápido: o preview já está decodificado no DOM — desenha
        // direto, sem recarregar da rede (evita travar o submit em CORS lento).
        try {
          if (img.complete && img.naturalWidth > 0) {
            const dataUrl = paintCircle(img);
            $('#modal-input-icon-base64').val(dataUrl);
            clearTimeout(timer);
            done(dataUrl);
            return;
          }
        } catch (e) {
          // Canvas "tainted" ou preview quebrado: cai no fluxo com recarga.
        }

        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.onload = function() {
          try {
            const dataUrl = paintCircle(tempImg);
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

  // Sincroniza marcador arrastável <-> inputs de lat/lng do formulário.
  // `targetMap` é o mapa que deve centralizar (padrão: mapa principal).
  // Reutilizado pelos modais de animal (implícito), ONG e Zona.
  function setupMarkerDragEvents(form, marker, targetMap) {
    const refMap = targetMap || map;
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
        refMap.panTo(newLatLng);
      }
    });
  }

  // Fecha os modais de cadastro (ONG e Zona). Mantém o nome original pois é
  // chamado por updateAdminUI() e openAdminDrawer(), como antes com o drawer.
  function closeAdminDrawer() {
    $("#ong-admin-modal").addClass("d-none");
    $("#zona-admin-modal").addClass("d-none");
    isZonaDrawingPolygon = false;
    const zonaBtn = $('#zona-btn-draw-polygon-mode');
    if (zonaBtn.length) {
      zonaBtn.removeClass('btn-success text-white').addClass('btn-info text-dark')
        .html('<i class="fa-solid fa-draw-polygon me-1"></i> Desenhar Área');
    }
    if (zonaRightMap) {
      try { zonaRightMap.getContainer().style.cursor = ''; } catch (e) {}
    }
  }

  $("#close-ong-modal-btn, .btn-cancel-ong-modal").click(function() {
    $("#ong-admin-modal").addClass("d-none");
  });
  $("#close-zona-modal-btn, .btn-cancel-zona-modal").click(closeAdminDrawer);

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
          const ordered = [...niveis].sort((a, b) => {
            const ia = extinctionSeverityOrder.indexOf(String(a.sigla || '').toLowerCase());
            const ib = extinctionSeverityOrder.indexOf(String(b.sigla || '').toLowerCase());
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
          });
          ordered.forEach(item => {
            const sigla = String(item.sigla || '').toLowerCase();
            const color = extinctionColorMap[sigla] || extinctionColorMap[String(item.id)] || '#383642';
            const textColor = sigla === 'vu' ? '#111111' : '#FFFFFF';
            selectNiveis.append(`<option value="${item.id}" data-sigla="${sigla}" style="background-color: ${color}; color: ${textColor}; font-weight: bold; padding: 8px;">${item.nome}</option>`);
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

  // Mudar cor dinamicamente ao selecionar Nível de Extinção no Modal.
  // Usa a sigla da option selecionada (fonte canônica); o ID é só fallback.
  $(document).on('change', '.select-nivel-extincao', function() {
    const val = $(this).val();
    const sigla = String($(this).find('option:selected').data('sigla') || '').toLowerCase();
    const color = extinctionColorMap[sigla] || extinctionColorMap[val] || '#383642';
    const textColor = sigla === 'vu' ? '#111111' : '#FFFFFF';
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
    var saveBtn = $('#modal-btn-save-species');
    var saveBtnHtml = saveBtn.length ? saveBtn.html() : null;
    if (saveBtn.length) {
      saveBtn.prop('disabled', true);
      saveBtn.html('<i class="fa-solid fa-spinner fa-spin me-2"></i>Salvando espécie...');
    }
    var restoreSaveBtn = function () {
      if (saveBtn.length) { saveBtn.prop('disabled', false); saveBtn.html(saveBtnHtml); }
    };
    // Garante que o recorte atual do ícone foi gerado antes de montar o FormData
    try { await generateModalIconBase64(); } catch (err) {}
    const formData = new FormData(this);

    // Anexar todos os arquivos ativos da galeria (reduzidos antes de subir).
    // Fotos já salvas que continuam na galeria vão como `manter_imagem`
    // (exceto a logotipo de fallback) para ACUMULAR com as novas no servidor.
    formData.delete('animal_imagem');
    var galleryFiles = [];
    var keptGallery = [];
    modalSelectedFiles.forEach(item => {
      const fileObj = item.file || item;
      if (typeof fileObj !== 'string') {
        galleryFiles.push(fileObj);
      } else if (fileObj && !fileObj.includes('logotipo.png') && !fileObj.includes('falta_imagem') && !fileObj.includes('Falta_imagem')) {
        keptGallery.push(fileObj);
      }
    });
    try {
      var smallGallery = await Promise.all(galleryFiles.map(downscalePhotoFile));
      smallGallery.forEach(f => { if (f && typeof f !== 'string') formData.append('animal_imagem', f); });
    } catch (err) {
      galleryFiles.forEach(f => formData.append('animal_imagem', f));
    }
    if (galleryFiles.length > 0 || modalGalleryTouched) {
      formData.append('galeria_sync', '1');
      keptGallery.forEach(u => formData.append('manter_imagem', u));
    }

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

    // Se desenhou área mas não clicou no mapa, ancora o ponto DENTRO da área
    // para ponto e polígono não ficarem desconectados. O ponto é sorteado de
    // forma determinística por animal (seed = nome científico): dois animais
    // na mesma zona NÃO caem na mesma coordenada (era o centroide único).
    try {
      var polyHidden = $('#modal-area-polygon-json-hidden').val();
      var coordHidden = $('#modal-coordenadas-json-hidden').val();
      if (polyHidden && polyHidden.trim().length > 0 && (!coordHidden || coordHidden.trim().length === 0)) {
        var polyPayload = JSON.parse(polyHidden);
        var polyRings = ((polyPayload && polyPayload.polygons) || []).filter(function (r) { return r && r.length >= 3; });
        if (polyRings.length > 0) {
          var seedName = formData.get('nome_cientifico') || String(Date.now());
          var anchor = anchorPointInRings(polyRings, 'submit|' + seedName);
          if (anchor) {
            formData.set('lat', String(anchor[0]));
            formData.set('lng', String(anchor[1]));
            formData.set('coordenadas_json', JSON.stringify([{ lat: anchor[0], lng: anchor[1] }]));
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
      restoreSaveBtn();
      if (data.success) {
        systemAlert(editId ? "Espécie atualizada com sucesso!" : "Espécie cadastrada com sucesso!", 'success');
        $("#species-admin-modal").addClass("d-none");
        reloadMarkers();
      } else {
        systemAlert('Erro ao salvar espécie: ' + formatErrorMessage(data, 'Tente novamente.'), 'error');
      }
    })
    .catch(err => {
      restoreSaveBtn();
      console.error(err);
      systemAlert("Erro ao salvar espécie: " + (err.message || 'Falha de comunicação com o servidor.'), 'error');
    });
  });

  // Submissão do Formulário de Área de Preservação (POST criar / PUT editar).
  // O polígono é OBRIGATÓRIO (igual ao desenho de área dos animais):
  // sem ao menos 3 pontos o salvamento é bloqueado com alerta.
  $("#form-create-preservacao").submit(function(e) {
    e.preventDefault();
    const form = $(this);
    const editId = ($("#zona-edit-id").val() || '').trim();
    const nome = (form.find('input[name="nome"]').val() || '').trim();
    const categoria = form.find('select[name="categoria"]').val();
    const descricao = form.find('textarea[name="descricao"]').val();
    let lat = parseFloat(form.find('.coord-lat').val());
    let lng = parseFloat(form.find('.coord-lng').val());

    // Polígono obrigatório: exige ao menos um anel válido (mín. 3 pontos).
    let polyRings = [];
    try {
      const polyHidden = $('#zona-area-polygon-json-hidden').val();
      if (polyHidden && polyHidden.trim().length > 0) {
        const polyPayload = JSON.parse(polyHidden);
        polyRings = ((polyPayload && polyPayload.polygons) || []).filter(r => Array.isArray(r) && r.length >= 3);
      }
    } catch (err) { polyRings = []; }
    if (polyRings.length === 0) {
      systemAlert('Desenhe a área no mapa antes de salvar (mínimo 3 pontos com a ferramenta "Desenhar Área").', 'warning');
      return;
    }

    // Como no cadastro de animais: se desenhou área mas o ponto ficou vazio,
    // ancora o ponto no centroide da primeira área válida.
    try {
      const polyHidden = $('#zona-area-polygon-json-hidden').val();
      if ((!isNaN(lat) && !isNaN(lng)) === false && polyHidden && polyHidden.trim().length > 0) {
        const polyPayload = JSON.parse(polyHidden);
        const polyRings = (polyPayload && polyPayload.polygons) || [];
        for (let ri = 0; ri < polyRings.length; ri++) {
          if (polyRings[ri] && polyRings[ri].length >= 3) {
            const centroid = getPolygonCentroid(polyRings[ri]);
            if (centroid) {
              lat = centroid[0]; lng = centroid[1];
              form.find('.coord-lat').val(lat.toFixed(6));
              form.find('.coord-lng').val(lng.toFixed(6));
              form.find('.input-lat').val(lat.toFixed(6));
              form.find('.input-lng').val(lng.toFixed(6));
            }
            break;
          }
        }
      }
    } catch (err) {}

    fetch(editId ? `/api/v1/zonas-preservacao/${editId}/` : '/api/v1/zonas-preservacao/', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome,
        categoria: categoria,
        descricao: descricao,
        lat: lat,
        lng: lng,
        color: zonaPolygonColor,
        area_polygon_json: $('#zona-area-polygon-json-hidden').val()
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        systemAlert(editId ? `Área de Preservação "${nome}" atualizada com sucesso!` : `Área de Preservação "${nome}" criada com sucesso!`, 'success');
        $("#zona-edit-id").val('');
        $("#zona-admin-modal").addClass("d-none");
        loadZonas();
      } else {
        systemAlert('Erro ao salvar área: ' + formatErrorMessage(data, 'Tente novamente.'), 'error');
      }
    })
    .catch(err => {
      console.error(err);
      systemAlert("Erro ao salvar área: " + (err.message || 'Falha de comunicação com o servidor.'), 'error');
    });
  });

  // Submissão do Formulário de ONG (POST criar / PUT editar).
  // `foco` não existe no modelo api_ong: é enviado e usado no popup local,
  // sem alterar nenhuma regra de negócio do backend.
  $("#form-create-ong").submit(function(e) {
    e.preventDefault();
    const form = $(this);
    const editId = ($("#ong-edit-id").val() || '').trim();
    const nome = (form.find('input[name="nome"]').val() || '').trim();
    const foco = form.find('input[name="foco"]').val();
    const email = form.find('input[name="email"]').val();
    const telefone = form.find('input[name="telefone"]').val();
    const descricao = form.find('textarea[name="descricao"]').val();
    const lat = parseFloat(form.find('.coord-lat').val());
    const lng = parseFloat(form.find('.coord-lng').val());

    fetch(editId ? `/api/v1/ongs/${editId}/` : '/api/v1/ongs/', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome,
        foco: foco,
        email: email,
        telefone: telefone,
        descricao: descricao,
        lat: lat,
        lng: lng
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        systemAlert(editId ? `Instituição "${nome}" atualizada com sucesso!` : `Instituição "${nome}" cadastrada com sucesso!`, 'success');
        $("#ong-edit-id").val('');
        $("#ong-admin-modal").addClass("d-none");
        loadOngs();
      } else {
        systemAlert('Erro ao salvar Instituição: ' + formatErrorMessage(data, 'Tente novamente.'), 'error');
      }
    })
    .catch(err => {
      console.error(err);
      systemAlert("Erro ao salvar Instituição: " + (err.message || 'Falha de comunicação com o servidor.'), 'error');
    });
  });

  // Modal de Detalhes do Animal
  window.showDetails = function(id) {
    const animal = markersData.find(a => a.animal_id == id);
    if (!animal) return;

    const statusSigla = animal.nivel_sigla ? animal.nivel_sigla.toLowerCase() : 'dd';
    const statusConfig = {
      'ex': { color: '#403E4C', icon: 'fa-skull' },
      'ew': { color: '#831F34', icon: 'fa-skull-crossbones' },
      're': { color: '#B0214F', icon: 'fa-eye-slash' },
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
    // Ícone fora do carrossel: só pino do mapa e edição (nunca como foto).
    allImgs = allImgs.map(url => (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:') ? url : `/media/${url}`));
    // De preferência de 1 a 3 fotos
    allImgs = allImgs.slice(0, 3);
    if (allImgs.length === 0) allImgs.push('/assets/img/logotipo.png');
    const modalImgFallback = allImgs.length > 0 && allImgs.every(isFallbackLogoUrl);

    let biomas = (animal.biomas || []).map(b => b.nome).join(', ') || 'Não informado';

    let html = `
      <div class="container-fluid p-0">
        <div class="row g-0">
          <div class="col-md-5">
            <div class="modal-img-container" style="overflow: hidden; position: relative; border-left: 5px solid ${statusColor}; height: 100%; min-height: 280px;">
              <img id="modalCarouselImg" src="${allImgs[0]}" alt="${animal.nome_comum || ''}${modalImgFallback ? ' — imagem livre não encontrada' : ''}" class="modal-img-pan${isFallbackLogoUrl(allImgs[0]) ? ' img-fallback-logo' : ''}" data-current="0" data-imgs='${JSON.stringify(allImgs)}'>
              ${modalImgFallback ? '<span class="no-photo-badge"><i class="fa-solid fa-triangle-exclamation"></i>Imagem livre não encontrada</span>' : ''}
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
                      <div class="fw-bold" style="color: ${statusColor}; font-size: 0.95rem;">${animal.peso ? animal.peso + ' g' : '0 g'}</div>
                  </div>
                  <div class="col-4 border-start border-secondary">
                      <span class="mb-1 text-muted small"><i class="fas fa-arrows-alt-v me-1"></i> Altura</span>
                      <div class="fw-bold" style="color: ${statusColor}; font-size: 0.95rem;">${animal.altura ? animal.altura + ' cm' : '0 cm'}</div>
                  </div>
              </div>
              <hr style="border-color: ${statusColor}; opacity: 0.3;" class="my-2">
              <div class="mt-2 text-white">
                  <h6 class="fst-italic text-muted small mb-1">Biomas</h6>
                  <p class="mb-2 fw-bold" style="color: #FFFFFF;">${biomas}</p>
                  <h6 class="fst-italic text-muted small mb-1">Descrição / Curiosidade</h6>
                  <p class="mb-0 small text-light" style="line-height: 1.5; text-align: justify;">${animal.habitos || animal.obs || 'Descrição detalhada não disponível.'}</p>
              </div>
              <div class="d-flex justify-content-end mt-3 gap-2 align-items-center flex-wrap">
                <a class="btn btn-sm btn-outline-warning rounded-pill px-3" href="https://salve.icmbio.gov.br/" target="_blank" rel="noopener noreferrer" title="Abrir ficha oficial no SALVE/ICMBio">
                  <i class="fa-solid fa-arrow-up-right-from-square me-1"></i>Fonte Oficial: SALVE (ICMBio)
                </a>
                ${animal.fonte && animal.fonte.trim() !== '' && animal.fonte !== 'https://salve.icmbio.gov.br/' ? `
                  <a class="btn btn-sm btn-outline-info rounded-pill px-3" href="${animal.fonte}" target="_blank" rel="noopener noreferrer" title="Abrir fonte adicional">
                    <i class="fa-solid fa-link me-1"></i>Fonte Adicional
                  </a>
                ` : ''}
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
    if (typeof favModalButtons === 'function') $('#modalAnimalName').append(' ', favModalButtons(animal));
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
    try {
      const badge = imgTag.closest('.modal-img-container').find('.no-photo-badge');
      if (badge.length) badge.toggle(isFallbackLogoUrl(imgs[targetIndex]));
      imgTag.toggleClass('img-fallback-logo', isFallbackLogoUrl(imgs[targetIndex]));
    } catch (e) {}

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

  // Exclusão de ONG — confirmação dupla igual à de animais.
  window.deleteOngWithConfirmation = async function(id, nome) {
    if (typeof isAdminModeActive === 'function' && !isAdminModeActive()) return;
    nome = nome || 'esta Instituição';
    if (!id) return;
    if (!await systemConfirm(`Tem certeza que deseja excluir "${nome}"?`, { title: 'Excluir Instituição' })) return;
    if (!await systemConfirm(`CONFIRMAÇÃO FINAL DE SEGURANÇA:\n\nEsta ação é permanente e removerá "${nome}" do mapa.\n\nDeseja REALMENTE EXCLUIR?`, { title: 'Confirmação final' })) return;
    fetch(`/api/v1/ongs/${id}/`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        systemAlert(`Instituição "${nome}" excluída com sucesso!`, 'success');
        if (typeof loadOngs === 'function') loadOngs();
      } else {
        systemAlert('Erro ao excluir: ' + formatErrorMessage(data, 'Erro no servidor.'), 'error');
      }
    })
    .catch(err => {
      console.error(err);
      systemAlert(`Erro de conexão ao tentar excluir "${nome}": ${err.message || 'Falha de rede.'}`, 'error');
    });
  };

  // Exclusão de área de preservação — confirmação dupla igual à de animais.
  window.deleteZonaWithConfirmation = async function(id, nome) {
    if (typeof isAdminModeActive === 'function' && !isAdminModeActive()) return;
    nome = nome || 'esta área';
    if (!id) return;
    if (!await systemConfirm(`Tem certeza que deseja excluir "${nome}"?`, { title: 'Excluir área' })) return;
    if (!await systemConfirm(`CONFIRMAÇÃO FINAL DE SEGURANÇA:\n\nEsta ação é permanente e removerá "${nome}" do mapa.\n\nDeseja REALMENTE EXCLUIR?`, { title: 'Confirmação final' })) return;
    fetch(`/api/v1/zonas-preservacao/${id}/`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        systemAlert(`Área "${nome}" excluída com sucesso!`, 'success');
        if (typeof loadZonas === 'function') loadZonas();
      } else {
        systemAlert('Erro ao excluir: ' + formatErrorMessage(data, 'Erro no servidor.'), 'error');
      }
    })
    .catch(err => {
      console.error(err);
      systemAlert(`Erro de conexão ao tentar excluir "${nome}": ${err.message || 'Falha de rede.'}`, 'error');
    });
  };

  // Exclusão de ONG via botão do popup (somente admin).
  $(document).on('click', '.btn-del-ong', function(e) {
    e.stopPropagation();
    deleteOngWithConfirmation($(this).data('id'), $(this).data('nome') || 'esta Instituição');
  });

  // Edição de ONG via botão do popup (somente admin).
  $(document).on('click', '.btn-edit-ong', function(e) {
    e.stopPropagation();
    if (typeof isAdminModeActive === 'function' && !isAdminModeActive()) return;
    const id = String($(this).data('id') || '');
    const f = (window.ongFeaturesById || {})[id];
    if (f) openOngModalForEdit(f);
  });

  // Exclusão de área de preservação via botão do popup (somente admin).
  $(document).on('click', '.btn-del-zona', function(e) {
    e.stopPropagation();
    deleteZonaWithConfirmation($(this).data('id'), $(this).data('nome') || 'esta área');
  });

  // Edição de área via botão do popup (somente admin).
  $(document).on('click', '.btn-edit-zona', function(e) {
    e.stopPropagation();
    if (typeof isAdminModeActive === 'function' && !isAdminModeActive()) return;
    const id = String($(this).data('id') || '');
    const f = (window.zonaFeaturesById || {})[id];
    if (f) openZonaModalForEdit(f);
  });

  window.deleteEntityWithConfirmation = async function(entity) {
    const props = entity.properties || entity;
    const animalId = props.animal_id || props.id;
    const nome = props.nome_comum || props.nome || 'esta entidade';

    if (!await systemConfirm(`Tem certeza que deseja excluir "${nome}"?`, { title: 'Excluir espécie' })) return;
    if (!await systemConfirm(`CONFIRMAÇÃO FINAL DE SEGURANÇA:\n\nEsta ação é permanente e removerá "${nome}" do mapa e do catálogo.\n\nDeseja REALMENTE EXCLUIR?`, { title: 'Confirmação final' })) return;

    fetch(`/api/v1/animais/${animalId}/`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        systemAlert(`"${nome}" foi excluído com sucesso!`, 'success');
        const modalEl = document.getElementById('animalModal');
        if (modalEl) {
          const bsModal = bootstrap.Modal.getInstance(modalEl);
          if (bsModal) bsModal.hide();
        }
        reloadMarkers();
      } else {
        systemAlert(`Erro ao excluir: ${formatErrorMessage(data, 'Erro no servidor.')}`, 'error');
      }
    })
    .catch(err => {
      console.error(err);
      systemAlert(`Erro de conexão ao tentar excluir "${nome}": ${err.message || 'Falha de rede.'}`, 'error');
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
      systemAlert('Por favor, selecione um arquivo .csv válido.', 'warning');
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
  loadOngs();
  loadZonas();
  setTimeout(function() { map.invalidateSize(); }, 400);
});

