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
var currentTheme = "dark";
var markersData = []; // Store markers data for details

/* Camadas de Base */
var darkFull = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19,
  updateWhenIdle: true,
  keepBuffer: 4
});

var lightFull = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19,
  updateWhenIdle: true,
  keepBuffer: 4
});

$(document).ready(function () {
  /* 1. Configuração do Mapa */
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
  L.control.locate({ position: "bottomright" }).addTo(map);

  /* 2. Inicialização das Camadas */
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
    var isLight = currentTheme === "light";
    
    // Cores mais fortes para o modo claro para não "sumirem" no fundo branco
    pampasLayer.setStyle({
      color: "transparent",
      fillColor: isLight ? "#2e86c1" : "#3b7ba5", // Azul bem definido no claro
      fillOpacity: isLight ? 0.7 : 0.3
    });

    cerradoLayer.setStyle({
      color: "transparent",
      fillColor: isLight ? "#d4ac0d" : "#E6C140", // Amarelo queimado no claro
      fillOpacity: isLight ? 0.7 : 0.4
    });

    atlanticLayer.setStyle({
      color: "transparent",
      fillColor: isLight ? "#27ae60" : "#287f5e", // Verde esmeralda no claro
      fillOpacity: isLight ? 0.6 : 0.1
    });

    // A máscara fora do sul deve ser escura sempre
    maskLayer.setStyle({
      fillColor: "#000000",
      fillOpacity: isLight ? 0.4 : 0.6
    });

    // Ajustar opacidade das "árvores"
    var patterns = ["tree-pattern", "pampa-pattern", "cerrado-pattern"];
    patterns.forEach(function(id) {
      var pat = document.getElementById(id);
      if (pat) {
        var images = pat.getElementsByTagName("image");
        for (var i = 0; i < images.length; i++) {
          images[i].setAttribute("opacity", isLight ? "0.3" : "0.7");
        }
      }
    });
  }

  /* 3. Lógica de Carregamento de Dados */
  var loadData = function() {
    var requests = [
      $.getJSON("data/ATLANTIC_FOREST_LAW.json"),
      $.getJSON("data/br_pr.json"),
      $.getJSON("data/br_sc.json"),
      $.getJSON("data/br_rs.json")
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
            coords.forEach(function(poly) { poly.forEach(function(ring) { maskPaths.push(ring.map(function(c) { return [c[1], c[0]]; })); }); });
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
      { id: 'tree-pattern', img: 'svg/mataatlantica.png', size: 100, icons: [[10,10,40],[60,50,30]] },
      { id: 'pampa-pattern', img: 'svg/pampa.png', size: 80, icons: [[10,10,35],[45,40,25]] },
      { id: 'cerrado-pattern', img: 'svg/cerrado.png', size: 90, icons: [[10,10,40],[55,45,30]] }
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

  /* 4. Alternar Temas */
  $("#theme-toggle").click(function() {
    var icon = $(this).find("i");
    if (currentTheme === "dark") {
      currentTheme = "light";
      map.removeLayer(darkFull);
      map.addLayer(lightFull);
      $("#main-layout").addClass("light-mode");
      icon.removeClass("fa-moon").addClass("fa-sun");
    } else {
      currentTheme = "dark";
      map.removeLayer(lightFull);
      map.addLayer(darkFull);
      $("#main-layout").removeClass("light-mode");
      icon.removeClass("fa-sun").addClass("fa-moon");
    }
    updateLayerStyles();
    
    // Forçar atualização dos padrões SVG
    if (map.hasLayer(atlanticPatternLayer)) { map.removeLayer(atlanticPatternLayer); map.addLayer(atlanticPatternLayer); }
    if (map.hasLayer(pampasPatternLayer)) { map.removeLayer(pampasPatternLayer); map.addLayer(pampasPatternLayer); }
    if (map.hasLayer(cerradoPatternLayer)) { map.removeLayer(cerradoPatternLayer); map.addLayer(cerradoPatternLayer); }
    
    reorderLayers();
    return false;
  });

  /* Busca */
  var geonamesBH = new Bloodhound({
    name: "GeoNames", datumTokenizer: Bloodhound.tokenizers.obj.whitespace("name"),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: [
      { name: "Curitiba, PR", lat: -25.429, lng: -49.267 },
      { name: "Florianópolis, SC", lat: -27.595, lng: -48.548 },
      { name: "Porto Alegre, RS", lat: -30.033, lng: -51.23 }
    ],
    remote: {
      url: "https://secure.geonames.org/searchJSON?username=bootleaf&featureClass=P&maxRows=20&countryCode=BR&name_startsWith=%QUERY",
      wildcard: "%QUERY",
      filter: function (data) {
        var southStates = ["PR", "SC", "RS"];
        return $.map(data.geonames, function (result) {
          if (southStates.indexOf(result.adminCode1) !== -1) {
            return { name: result.name + ", " + result.adminCode1, lat: result.lat, lng: result.lng };
          }
        });
      }
    }
  });
  geonamesBH.initialize();

  $("#searchbox").typeahead({ minLength: 2, highlight: true }, {
    name: "GeoNames", displayKey: "name", source: geonamesBH.ttAdapter(),
    templates: { header: "<h4 class='typeahead-header'><i class='fa-solid fa-location-dot'></i>&nbsp;Locais</h4>" }
  }).on("typeahead:selected", function (obj, datum) {
    if (datum.lat && datum.lng) map.setView([datum.lat, datum.lng], 14);
  });

  $("#about-btn").click(function() { $("#aboutModal").modal("show"); return false; });
  $("#config-btn").click(function() { $("#configModal").modal("show"); return false; });
  $("#legend-btn").click(function() { $("#legendModal").modal("show"); return false; });

  $("#toggle-textures, #toggle-textures-legend").change(function() {
    var isChecked = $(this).is(":checked");
    $("#toggle-textures, #toggle-textures-legend").prop("checked", isChecked);
    if (isChecked) {
      map.addLayer(atlanticPatternLayer); map.addLayer(pampasLayer); 
      map.addLayer(pampasPatternLayer); map.addLayer(cerradoLayer);
      map.addLayer(cerradoPatternLayer); reorderLayers();
    } else {
      map.removeLayer(atlanticPatternLayer); map.removeLayer(pampasPatternLayer); map.removeLayer(cerradoPatternLayer);
    }
  });

  /* 5. Integração com Backend Django (Login/Registro) */
  const API_URL = "http://localhost:8000/api";

  $("#login-btn").click(function() {
    $("#loginModal").modal("show");
    return false;
  });

  $("#go-to-register").click(function(e) {
    e.preventDefault();
    $("#loginModal").modal("hide");
    $("#registerModal").modal("show");
  });

  $("#go-to-login").click(function(e) {
    e.preventDefault();
    $("#registerModal").modal("hide");
    $("#loginModal").modal("show");
  });

  $("#login-form").submit(function(e) {
    e.preventDefault();
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    fetch(`${API_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        alert("Login realizado com sucesso! Bem-vindo, " + data.user.username);
        $("#loginModal").modal("hide");
        location.reload(); // Recarrega para aplicar estado de logado
      } else {
        alert("Erro no login: " + (data.detail || data.message || "Credenciais inválidas"));
      }
    })
    .catch(error => {
      console.error("Erro:", error);
      alert("Não foi possível conectar ao servidor Django (Porta 8000). Verifique se ele está rodando.");
    });
  });

  $("#register-form").submit(function(e) {
    e.preventDefault();
    const username = $("#reg-username").val();
    const password = $("#reg-password").val();

    fetch(`${API_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert("Cadastro realizado com sucesso! Agora faça login.");
        $("#registerModal").modal("hide");
        $("#loginModal").modal("show");
      } else {
        alert("Erro no cadastro: " + (data.error || "Verifique os dados e tente novamente."));
      }
    })
    .catch(error => {
      console.error("Erro:", error);
      alert("Erro ao conectar com o servidor.");
    });
  });

  // Verificar estado de login ao carregar
  const user = localStorage.getItem("user");
  if (user) {
    const userData = JSON.parse(user);
    $("#login-btn").html('<i class="fa-solid fa-user-check"></i>&nbsp;&nbsp;' + userData.username);
    $("#login-btn").attr("title", "Você está logado como " + userData.username);
  }

  /* 6. Marcadores e Cadastro de Animais */
  var markersLayer = L.geoJson(null, {
    pointToLayer: function (feature, latlng) {
      const classe = feature.properties.classe ? feature.properties.classe.toLowerCase() : '';
      const iconMap = {
        'mammalia': 'icons/mamiferos.png',
        'aves': 'icons/aves.png',
        'reptilia': 'icons/repteis.png',
        'amphibia': 'icons/anfibios.png',
        'chondrichthyes': 'icons/peixes cartilaginosos.png',
        'osteichthyes': 'icons/peixes osseos.png'
      };
      
      const iconUrl = iconMap[classe] || 'icons/logotipo.png';
      
      const statusSigla = feature.properties.nivel_sigla ? feature.properties.nivel_sigla.toLowerCase() : 'dd';
      const colorMap = {
        'ex': '#000000', 'ew': '#831F34', 'cr': '#FF4068', 'en': '#ff6426',
        'vu': '#FFA63A', 'nt': '#217757', 'lc': '#1a5fb4', 'dd': '#555555'
      };
      const borderColor = colorMap[statusSigla] || '#1a5fb4';

      return L.marker(latlng, {
        icon: L.divIcon({
          className: 'custom-animal-marker',
          html: `<div class="marker-pin" style="border-color: ${borderColor};"><img src="${iconUrl}"></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        })
      });
    },
    onEachFeature: function (feature, layer) {
      const props = feature.properties;
      layer.on('click', function() {
        showDetails(props.animal_id);
      });
    }
  }).addTo(map);

  function loadMarkers() {
    $.getJSON("/api/markers", function (data) {
      markersLayer.clearLayers();
      markersLayer.addData(data);
      markersData = data.features.map(f => f.properties);
    });
  }

  map.on('contextmenu', function(e) {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      if (userData.role === 'admin' || userData.is_superuser) {
        L.popup()
          .setLatLng(e.latlng)
          .setContent(`<button class="btn btn-primary btn-sm" onclick="openAnimalCreateModal(${e.latlng.lat}, ${e.latlng.lng})">Adicionar Animal Aqui</button>`)
          .openOn(map);
      }
    }
  });

  window.openAnimalCreateModal = function(lat, lng) {
    $("#animal-lat").val(lat);
    $("#animal-lng").val(lng);
    $("#animalCreateModal").modal("show");
    map.closePopup();
  };

  $('#animalCreateModal').on('shown.bs.modal', function () {
    // Fetch data for selects - Using correct V1 API prefix
    fetch(`${API_URL}/v1/niveis-extincao/`)
      .then(res => res.text()) // Get as text first
      .then(text => {
        console.log("Raw Niveis Extincao response:", text);
        return JSON.parse(text);
      })
      .then(response => {
        const select = $("#nivel_extincao_id");
        select.empty();
        const items = response.data || response;
        items.forEach(item => select.append(`<option value="${item.id}">${item.nome}</option>`));
      })
      .catch(err => console.error("Error fetching niveis:", err));
    
    fetch(`${API_URL}/v1/biomas/`)
      .then(res => res.text()) // Get as text first
      .then(text => {
        console.log("Raw Biomas response:", text);
        return JSON.parse(text);
      })
      .then(response => {
        const select = $("#biomas_ids");
        select.empty();
        const items = response.data || response;
        items.forEach(item => select.append(`<option value="${item.id}">${item.nome}</option>`));
      })
      .catch(err => console.error("Error fetching biomas:", err));

    fetch(`${API_URL}/v1/regioes/`)
      .then(res => res.text())
      .then(text => {
        console.log("Raw Regioes response:", text);
        return JSON.parse(text);
      })
      .then(response => {
        const select = $("#regiao_id");
        select.empty();
        const items = response.data || response;
        items.forEach(item => select.append(`<option value="${item.id}">${item.nome}</option>`));
      })
      .catch(err => console.error("Error fetching regioes:", err));
  });

  $("#animal-create-form").submit(function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    // Convert biomas_ids array to individual values for FormData
    const biomas = Array.from(document.getElementById('biomas_ids').selectedOptions).map(option => option.value);
    formData.delete('biomas_ids');
    biomas.forEach(b => formData.append('biomas_ids', b));

    fetch(`${API_URL}/v1/animais/`, {
      method: "POST",
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert("Animal cadastrado com sucesso!");
        $("#animalCreateModal").modal("hide");
        loadMarkers(); // Refresh markers on map
      } else {
        alert("Erro ao cadastrar: " + JSON.stringify(data));
      }
    });
  });

  window.showDetails = function(id) {
    const animal = markersData.find(a => a.animal_id == id);
    if (!animal) return;

    const statusSigla = animal.nivel_sigla ? animal.nivel_sigla.toLowerCase() : 'dd';
    
    // Mapeamento de Cores e Ícones
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

    let allImgs = (animal.imagens || []).map(img => img.imagem);
    if (allImgs.length === 0) allImgs.push('https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=800&auto=format&fit=crop');

    let biomas = (animal.biomas || []).map(b => b.nome).join(', ') || 'Não informado';

    $('#modalAnimalName').text(animal.nome_comum).css('color', statusColor);

    let html = `
      <div class="container-fluid p-0">
        <div class="row g-0">
          <div class="col-md-5">
            <div class="modal-img-container" style="overflow: hidden; position: relative; border-left: 5px solid ${statusColor};">
              <img id="modalCarouselImg" src="${allImgs[0]}" class="modal-img-pan" data-current="0" data-imgs='${JSON.stringify(allImgs)}'>
              ${allImgs.length > 1 ? `
                <button class="carousel-btn carousel-prev" onclick="changeModalImg(-1)" style="position: absolute; top: 50%; left: 10px; z-index: 10; border: none; background: ${statusColor}; color: white; border-radius: 50%; width: 40px; height: 40px; cursor: pointer;">
                  <i class="fas fa-chevron-left"></i>
                </button>
                <button class="carousel-btn carousel-next" onclick="changeModalImg(1)" style="position: absolute; top: 50%; right: 10px; z-index: 10; border: none; background: ${statusColor}; color: white; border-radius: 50%; width: 40px; height: 40px; cursor: pointer;">
                  <i class="fas fa-chevron-right"></i>
                </button>
              ` : ''}
            </div>
          </div>
          <div class="col-md-7 p-4" style="max-height: 400px; overflow-y: auto;">
            <div class="mb-4">
              <span class="badge px-3 py-2 rounded-pill me-2" style="background-color: ${statusColor};">${animal.classe || 'Classe não informada'}</span>
              <span class="badge bg-secondary px-3 py-2 rounded-pill">${animal.familia || 'Família não informada'}</span>
            </div>
            <div class="row mb-4">
              <div class="col-6">
                <h6 style="color: ${statusColor};" class="fw-bold text-uppercase small mb-1">Nome Científico</h6>
                <p class="fst-italic text-white">${animal.nome_cientifico}</p>
              </div>
              <div class="col-6">
                <h6 style="color: ${statusColor};" class="fw-bold text-uppercase small mb-1">Status de Extinção</h6>
                <p class="text-white"><i class="fas ${statusIcon} me-2" style="color: ${statusColor};"></i>${animal.nivel_extincao}</p>
              </div>
            </div>
            <div class="bg-dark p-4 rounded-3 mt-4" style="border-top: 3px solid ${statusColor}; border-bottom: 3px solid ${statusColor};">
              <h5 class="fst-italic text-white mb-3 text-center">${animal.nome_cientifico}</h5>
              <hr style="border-color: ${statusColor}; opacity: 0.5;">
              
              <div class="row text-center mb-1 gy-3 text-white">
                  <div class="col-6 col-md-3 d-flex flex-column align-items-center justify-content-center">
                      <span class="mb-1 text-muted small"><i class="fas fa-utensils me-1"></i> Dieta</span>
                      <span class="fw-bold" style="color: ${statusColor}; font-size: 1.1rem;">${animal.dieta || 'N/A'}</span>
                  </div>
                  <div class="col-6 col-md-3 d-flex flex-column align-items-center justify-content-center border-start border-secondary">
                      <span class="mb-1 text-muted small"><i class="fas fa-weight-hanging me-1"></i> Peso</span>
                      <span class="fw-bold" style="color: ${statusColor}; font-size: 1.1rem;">${animal.peso ? animal.peso + ' Kg' : '00 Kg'}</span>
                  </div>
                  <div class="col-6 col-md-3 d-flex flex-column align-items-center justify-content-center border-start border-secondary">
                      <span class="mb-1 text-muted small"><i class="fas fa-arrows-alt-h me-1"></i> Comprimento</span>
                      <span class="fw-bold" style="color: ${statusColor}; font-size: 1.1rem;">${animal.comprimento ? animal.comprimento + ' Cm' : '00 Cm'}</span>
                  </div>
                  <div class="col-6 col-md-3 d-flex flex-column align-items-center justify-content-center border-start border-secondary">
                      <span class="mb-1 text-muted small"><i class="fas fa-arrows-alt-v me-1"></i> Altura</span>
                      <span class="fw-bold" style="color: ${statusColor}; font-size: 1.1rem;">${animal.altura ? animal.altura + ' m' : '00 Cm'}</span>
                  </div>
              </div>
              
              <hr style="border-color: ${statusColor}; opacity: 0.5;">
              
              <div class="row text-center mb-1 gy-3 text-white">
                  <div class="col-12 col-md-4 d-flex flex-column align-items-center justify-content-center">
                      <h6 class="mb-1 text-muted small">Biomas</h6>
                      <p class="mb-0 fw-bold" style="color: ${statusColor}; font-size: 1.1rem;">${biomas}</p>
                  </div>
                  <div class="col-6 col-md-4 border-start border-secondary d-flex flex-column align-items-center justify-content-center">
                      <h6 class="mb-1 text-muted small">Regiões</h6>
                      <p class="mb-0 fw-bold" style="color: ${statusColor}; font-size: 1.1rem;">Sul</p>
                  </div>
                  <div class="col-6 col-md-4 border-start border-secondary d-flex flex-column align-items-center justify-content-center">
                      <h6 class="mb-1 text-muted small">Estados</h6>
                      <p class="mb-0 fw-bold" style="color: ${statusColor}; font-size: 1.1rem;">PR, SC, RS</p>
                  </div>
              </div>

              <hr style="border-color: ${statusColor}; opacity: 0.5;">
              
              <div class="mt-3 text-white">
                  <h6 class="fst-italic text-muted small mb-2 text-center">Descrição</h6>
                  <p class="mb-0" style="font-size: 1rem; line-height: 1.6; text-align: justify; color: #ccc;">${animal.habitos || 'Descrição detalhada não disponível.'}</p>
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
                    <div class="modal-content border-0 shadow-lg" style="background-color: #2B2A33;">
                        <div class="modal-header border-bottom border-secondary">
                            <h5 class="modal-title fw-bold" id="modalAnimalName"></h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-0" id="modalBody"></div>
                        <div class="modal-footer border-top border-secondary">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    } else {
        modalEl.find('.modal-dialog').removeClass('modal-lg').addClass('modal-xl');
    }

    $('#modalAnimalName').text(animal.nome_comum).css('color', statusColor);
    $('#modalBody').html(html);
    new bootstrap.Modal(document.getElementById('animalModal')).show();
  };

  window.changeModalImg = function(step) {
    const imgTag = $('#modalCarouselImg');
    const imgs = JSON.parse(imgTag.attr('data-imgs'));
    let current = parseInt(imgTag.attr('data-current'));
    let next = (current + step + imgs.length) % imgs.length;
    
    const nextImg = $('<img>').attr('src', imgs[next]).css({
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      'object-fit': 'cover',
      opacity: 0
    });
    
    imgTag.parent().append(nextImg);
    nextImg.animate({ opacity: 1 }, 800, function() {
      imgTag.attr('src', imgs[next]);
      imgTag.css('opacity', 1);
      nextImg.remove();
      imgTag.attr('data-current', next);
    });
  };

  loadData();
  loadMarkers();
  setTimeout(function() { map.invalidateSize(); }, 400);
});
