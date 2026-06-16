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

  /* 6. Cadastro de Animais */
  map.on('contextmenu', function(e) {
    $("#animal-lat").val(e.latlng.lat);
    $("#animal-lng").val(e.latlng.lng);
    $("#animalCreateModal").modal("show");
  });

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
      } else {
        alert("Erro ao cadastrar: " + JSON.stringify(data));
      }
    });
  });

  loadData();
  setTimeout(function() { map.invalidateSize(); }, 400);
});
