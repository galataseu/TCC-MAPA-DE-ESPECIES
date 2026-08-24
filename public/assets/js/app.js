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
var stateLayers = [];
var markersData = [];

/* Camadas de Base */
var darkFull = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19,
  updateWhenIdle: true,
  keepBuffer: 4
});

// Mapa de cores para níveis de extinção
const extinctionColorMap = {
  'ex': '#000000', 'ew': '#831F34', 'cr': '#FF4068', 'en': '#ff6426',
  'vu': '#FFA63A', 'nt': '#217757', 'lc': '#1a5fb4', 'dd': '#555555',
  '1': '#FF4068', '2': '#ff6426', '3': '#FFA63A',
  '4': '#217757', '5': '#1a5fb4', '6': '#555555'
};

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
  L.control.locate({ position: "bottomright", icon: 'fa-solid fa-location-arrow' }).addTo(map);

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
          if (pampaDiff) { pampasLayer.addData(pampaDiff); pampasPatternLayer.addData(pampaDiff); }
        }
        if (prGeometry && cleanForest) {
          var cerradoDiff = turf.difference(turf.simplify(turf.buffer(prGeometry, 0), {tolerance: 0.003}), cleanForest);
          if (cerradoDiff) { cerradoLayer.addData(cerradoDiff); cerradoPatternLayer.addData(cerradoDiff); }
        }
      } catch (e) {}

      updateLayerStyles();
      reorderLayers();
      injectTreePattern();
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
  // 5. MARCADORES PERSONALIZADOS & HOVER EXPANSÍVEL
  // =========================================================================
  var markersLayer = L.geoJson(null, {
    pointToLayer: function (feature, latlng) {
      const p = feature.properties;
      const statusSigla = p.nivel_sigla ? p.nivel_sigla.toLowerCase() : 'dd';
      const borderColor = extinctionColorMap[statusSigla] || '#1a5fb4';
      const iconUrl = p.icone || (p.imagens && p.imagens.length > 0 ? p.imagens[0].imagem : '/assets/img/logotipo.png');

      return L.marker(latlng, {
        icon: L.divIcon({
          className: 'custom-animal-marker',
          html: `
            <div class="marker-container">
              <div class="marker-pin" style="border-color: ${borderColor};">
                <div class="marker-avatar">
                  <img src="${iconUrl}" alt="${p.nome_comum}">
                </div>
                <span class="marker-name-label">${p.nome_comum}</span>
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        })
      });
    },
    onEachFeature: function (feature, layer) {
      const props = feature.properties;
      layer.on('click', function() {
        showDetails(props.animal_id);
      });

      // Clique direito no marcador para editar no Modo Administrador
      layer.on('contextmenu', function(e) {
        if (isAdminModeActive()) {
          L.DomEvent.stopPropagation(e);
          var containerPoint = map.latLngToContainerPoint(e.latlng);
          var menu = $("#admin-context-menu");
          
          menu.html(`
            <div class="admin-menu-item" id="menu-edit-entity">
              <i class="fa-solid fa-pen-to-square text-warning me-2"></i>
              <span>Editar ${props.nome_comum || 'Entidade'}</span>
            </div>
            <div class="admin-menu-item text-danger" id="menu-delete-entity">
              <i class="fa-solid fa-trash me-2"></i>
              <span>Excluir ${props.nome_comum || 'Entidade'}</span>
            </div>
          `);

          menu.css({
            left: containerPoint.x + "px",
            top: containerPoint.y + "px"
          }).removeClass("d-none");

          $("#menu-edit-entity").off("click").on("click", function() {
            menu.addClass("d-none");
            openAdminDrawerForEdit(feature);
          });

          $("#menu-delete-entity").off("click").on("click", function() {
            menu.addClass("d-none");
            deleteEntityWithConfirmation(feature);
          });
        }
      });
    }
  }).addTo(map);

  function loadMarkers() {
    $.getJSON("/api/markers", function (data) {
      markersLayer.clearLayers();
      markersLayer.addData(data);
      markersData = data.features.map(f => {
        const p = f.properties;
        if (f.geometry && f.geometry.coordinates) {
          p.lng = f.geometry.coordinates[0];
          p.lat = f.geometry.coordinates[1];
        }
        return p;
      });
    });
  }

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
      $("#admin-btn").addClass("admin-active").attr("title", "Clique para encerrar o Modo Administrador");
      $("#admin-btn").attr("href", "#");
    } else {
      $("#admin-mode-badge").addClass("d-none");
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

    let imgUrl = props.icone || (props.imagens && props.imagens.length > 0 ? props.imagens[0].imagem : (props.imagem || ''));
    if (imgUrl) {
      $('#modal-image-preview-img').attr('src', imgUrl).removeClass('d-none');
      $('#modal-image-preview-content').addClass('d-none');
      $('#modal-icon-preview-img').attr('src', imgUrl).removeClass('d-none').css('transform', 'none');
      $('#modal-icon-preview-content').addClass('d-none');
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

      $("#modal-toggle-map").addClass("active");
      $("#modal-toggle-list").removeClass("active");
      $("#modal-panel-map").removeClass("d-none");
      $("#modal-panel-list").addClass("d-none");

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
        const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
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
        const pampasLayerM = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "#3b7ba5", fillOpacity: 0.3 } }).addTo(modalRightMap);
        const pampasPatternM = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "url(#pampa-pattern-mod)", fillOpacity: 0.6 } }).addTo(modalRightMap);
        const cerradoLayerM = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "#E6C140", fillOpacity: 0.4 } }).addTo(modalRightMap);
        const cerradoPatternM = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "url(#cerrado-pattern-mod)", fillOpacity: 0.6 } }).addTo(modalRightMap);
        const atlanticLayerM = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "#287f5e", fillOpacity: 0.1 } }).addTo(modalRightMap);
        const atlanticPatternM = L.geoJson(null, { renderer: svgRenderer, style: { color: "transparent", fillColor: "url(#tree-pattern-mod)", fillOpacity: 0.6 } }).addTo(modalRightMap);

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

        modalRightMarker.on('dragend', function(e) {
          const pos = e.target.getLatLng();
          $("#form-create-animal").find(".coord-lat").val(pos.lat.toFixed(6));
          $("#form-create-animal").find(".coord-lng").val(pos.lng.toFixed(6));
        });
      } else {
        modalRightMap.invalidateSize();
        modalRightMap.setView([lat, lng], 8);
        if (modalRightMarker) {
          modalRightMarker.setLatLng([lat, lng]);
        }
      }
    }, 200);
  }

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

  // Renderizar cards no modal com menu de 3 pontinhos e badge de extinção
  function loadModalSpeciesCards() {
    $.getJSON("/api/animals", function(data) {
      const grid = $("#modalAnimalCardsGrid");
      grid.empty();
      if (!data || data.length === 0) {
        grid.html('<div class="col-12 text-center text-muted py-4"><p>Nenhum animal cadastrado.</p></div>');
        return;
      }
      const colorClasses = ['card-color-brown', 'card-color-crimson', 'card-color-slate', 'card-color-green'];
      data.forEach((animal, index) => {
        const cardColor = colorClasses[index % colorClasses.length];
        const formattedId = String(animal.id).padStart(4, '0');
        const dataFormatted = animal.created_at ? new Date(animal.created_at).toLocaleDateString('pt-BR') : '00/00/0000';
        const autor = animal.api_user ? (animal.api_user.username || 'adm123') : 'adm123';
        const sigla = (animal.api_nivelextincao ? animal.api_nivelextincao.sigla : (animal.nivel_sigla || 'CR')).toUpperCase();
        const extinctionColor = extinctionColorMap[sigla.toLowerCase()] || extinctionColorMap[String(animal.nivel_extincao_id)] || '#FF4068';

        let imgUrl = animal.icone || (animal.imagens && animal.imagens.length > 0 ? animal.imagens[0].imagem : '/assets/img/logotipo.png');

        const card = $(`
          <div class="species-card ${cardColor}" style="cursor: pointer;">
            <button type="button" class="species-card-menu-btn" title="Opções">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
            <div class="species-card-avatar">
              <img src="${imgUrl}" alt="${animal.nome_comum}">
            </div>
            <div class="species-card-name-wrapper">
              <span class="species-card-name" title="${animal.nome_comum}">${animal.nome_comum}</span>
              <span class="species-card-extinction-badge" style="background-color: ${extinctionColor};">${sigla}</span>
            </div>
            <div class="species-card-footer">
              <span class="species-card-id-pill">${formattedId}</span>
              <div class="species-card-meta">
                <div>@${autor}</div>
                <div>${dataFormatted}</div>
              </div>
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
    });
  }

  // =========================================================================
  // 7. UPLOAD E RECORTE INTERATIVO DO ÍCONE NO MODAL
  // =========================================================================
  let modalIconCropState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  };

  $("#modal-image-stack-trigger").click(function() {
    $("#modal-input-file-image").click();
  });

  $("#modal-icon-circle-trigger").click(function(e) {
    if (e.target.tagName !== 'IMG') {
      $("#modal-input-file-icon").click();
    }
  });

  $("#modal-input-file-image").change(function() {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        $("#modal-image-preview-img").attr("src", e.target.result).removeClass("d-none");
        $("#modal-image-preview-content").addClass("d-none");
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  $("#modal-input-file-icon").change(function() {
    if (this.files && this.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = $("#modal-icon-preview-img");
        img.attr("src", e.target.result).removeClass("d-none");
        $("#modal-icon-preview-content").addClass("d-none");
        modalIconCropState.currentX = 0;
        modalIconCropState.currentY = 0;
        img.css('transform', 'translate(0px, 0px)');
        generateModalIconBase64();
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  const modalIconWrapper = document.getElementById('modal-icon-circle-trigger');
  const modalIconImg = document.getElementById('modal-icon-preview-img');

  if (modalIconWrapper && modalIconImg) {
    modalIconWrapper.addEventListener('mousedown', function(e) {
      if (modalIconImg.classList.contains('d-none')) return;
      modalIconCropState.isDragging = true;
      modalIconCropState.startX = e.clientX - modalIconCropState.currentX;
      modalIconCropState.startY = e.clientY - modalIconCropState.currentY;
      e.preventDefault();
    });

    window.addEventListener('mousemove', function(e) {
      if (!modalIconCropState.isDragging) return;
      modalIconCropState.currentX = e.clientX - modalIconCropState.startX;
      modalIconCropState.currentY = e.clientY - modalIconCropState.startY;
      modalIconImg.style.transform = `translate(${modalIconCropState.currentX}px, ${modalIconCropState.currentY}px)`;
    });

    window.addEventListener('mouseup', function() {
      if (modalIconCropState.isDragging) {
        modalIconCropState.isDragging = false;
        generateModalIconBase64();
      }
    });
  }

  function generateModalIconBase64() {
    const img = document.getElementById('modal-icon-preview-img');
    if (!img || img.classList.contains('d-none') || !img.src) return;

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
    let drawW = 500;
    let drawH = 500;

    if (aspect > 1) {
      drawW = 500 * aspect;
    } else {
      drawH = 500 / aspect;
    }

    const scaleRatio = 500 / 170;
    const drawX = (500 - drawW) / 2 + (modalIconCropState.currentX * scaleRatio);
    const drawY = (500 - drawH) / 2 + (modalIconCropState.currentY * scaleRatio);

    const tempImage = new Image();
    tempImage.crossOrigin = 'anonymous';
    tempImage.onload = function() {
      ctx.drawImage(tempImage, drawX, drawY, drawW, drawH);
      ctx.restore();
      const dataUrl = canvas.toDataURL('image/png');
      $('#modal-input-icon-base64').val(dataUrl);
    };
    tempImage.src = img.src;
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
  $("#form-create-animal").submit(function(e) {
    e.preventDefault();
    const formData = new FormData(this);

    // Gerar crop do ícone imediatamente
    const iconImg = document.getElementById('modal-icon-preview-img');
    if (iconImg && !iconImg.classList.contains('d-none') && iconImg.src) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 500;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(250, 250, 250, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        const naturalW = iconImg.naturalWidth || 500;
        const naturalH = iconImg.naturalHeight || 500;
        const aspect = naturalW / naturalH;
        let drawW = 500, drawH = 500;
        if (aspect > 1) drawW = 500 * aspect;
        else drawH = 500 / aspect;
        const scaleRatio = 500 / 170;
        const drawX = (500 - drawW) / 2 + (modalIconCropState.currentX * scaleRatio);
        const drawY = (500 - drawH) / 2 + (modalIconCropState.currentY * scaleRatio);
        ctx.drawImage(iconImg, drawX, drawY, drawW, drawH);
        const dataUrl = canvas.toDataURL('image/png');
        formData.set('icone_base64', dataUrl);
      } catch(e) {
        console.error('Error cropping modal icon:', e);
      }
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

    const editId = $("#animal-edit-id").val();
    const url = editId ? `/api/v1/animais/${editId}/` : `/api/v1/animais/`;
    const method = editId ? "PATCH" : "POST";

    fetch(url, { method: method, body: formData })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(editId ? "Espécie atualizada com sucesso!" : "Espécie cadastrada com sucesso!");
        $("#species-admin-modal").addClass("d-none");
        loadMarkers();
      } else {
        alert('Erro: ' + (data.error || 'Tente novamente.'));
      }
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao salvar espécie.");
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
      'ex': { color: '#000000', icon: 'fa-skull' },
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
    if (animal.icone) allImgs.push(animal.icone);
    const sourceImgs = animal.imagens || [];
    if (Array.isArray(sourceImgs)) {
      sourceImgs.forEach(img => {
        if (typeof img === 'string') allImgs.push(img);
        else if (img && img.imagem) allImgs.push(img.imagem);
      });
    }
    if (allImgs.length === 0) allImgs.push('/assets/img/logotipo.png');

    allImgs = allImgs.map(url => (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:') ? url : `/media/${url}`));

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

  window.changeModalImg = function(step) {
    const imgTag = $('#modalCarouselImg');
    const imgs = JSON.parse(imgTag.attr('data-imgs'));
    let current = parseInt(imgTag.attr('data-current'));
    let next = (current + step + imgs.length) % imgs.length;
    
    imgTag.fadeOut(200, function() {
      imgTag.attr('src', imgs[next]);
      imgTag.attr('data-current', next);
      imgTag.fadeIn(200);
    });
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
        loadMarkers();
      } else {
        alert(`Erro ao excluir: ${data.error || 'Erro no servidor.'}`);
      }
    })
    .catch(err => {
      console.error(err);
      alert(`Erro de conexão ao tentar excluir "${nome}".`);
    });
  };

  loadData();
  loadMarkers();
  setTimeout(function() { map.invalidateSize(); }, 400);
});
