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

$(document).ready(function () {
  /* 1. Mapa Base */
  var darkFull = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  });

  /* Map Initialization */
  map = L.map("map", {
    center: [-27.5, -51.5],
    zoom: 6,
    layers: [darkFull],
    zoomControl: false,
    attributionControl: false,
    maxBounds: [[-34.0, -58.0], [-22.0, -47.0]],
    maxBoundsViscosity: 0.7,
    minZoom: 5,
    preferCanvas: false // Padrões SVG não funcionam bem com preferCanvas: true
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.control.locate({ position: "bottomright" }).addTo(map);

  /* 2. Camadas de Biomas */
  pampasLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "#3b7ba5", fillOpacity: 0.3, clickable: false }
  }).addTo(map);

  pampasPatternLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "url(#pampa-pattern)", fillOpacity: 0.6, clickable: false }
  }).addTo(map);

  cerradoLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "#E6C140", fillOpacity: 0.4, clickable: false }
  }).addTo(map);

  cerradoPatternLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "url(#cerrado-pattern)", fillOpacity: 0.6, clickable: false }
  }).addTo(map);

  /* 3. Camada da Mata Atlântica (Verde) */
  atlanticLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "#287f5e", fillOpacity: 0.1, clickable: false }
  }).addTo(map);

  atlanticPatternLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "url(#tree-pattern)", fillOpacity: 0.6, clickable: false }
  }).addTo(map);

  /* 3. Máscara Global */
  maskLayer = L.polygon(maskPaths, {
    color: "transparent",
    fillColor: "#000000",
    fillOpacity: 0.6,
    pointerEvents: "none"
  }).addTo(map);

  /* Função para injetar as texturas dos biomas */
  function injectTreePattern() {
    var svg = document.getElementsByTagName('svg')[0];
    if (!svg) {
      setTimeout(injectTreePattern, 100);
      return;
    }
    
    var defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), svg.firstChild);
    
    // 1. Textura da Mata Atlântica (PNG)
    if (!document.getElementById('tree-pattern')) {
      var pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pattern.setAttribute('id', 'tree-pattern');
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.setAttribute('width', '100'); 
      pattern.setAttribute('height', '100');
      
      var img1 = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img1.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'svg/mataatlantica.png');
      img1.setAttribute('x', '10');
      img1.setAttribute('y', '10');
      img1.setAttribute('width', '40');
      img1.setAttribute('height', '40');
      img1.setAttribute('opacity', '0.7');
      pattern.appendChild(img1);

      var img2 = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img2.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'svg/mataatlantica.png');
      img2.setAttribute('x', '60');
      img2.setAttribute('y', '50');
      img2.setAttribute('width', '30');
      img2.setAttribute('height', '30');
      img2.setAttribute('opacity', '0.7');
      pattern.appendChild(img2);
      
      defs.appendChild(pattern);
    }

    // 2. Textura dos Pampas (PNG)
    if (!document.getElementById('pampa-pattern')) {
      var pampaPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pampaPattern.setAttribute('id', 'pampa-pattern');
      pampaPattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pampaPattern.setAttribute('width', '80'); 
      pampaPattern.setAttribute('height', '80');
      
      var pimg1 = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      pimg1.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'svg/pampa.png');
      pimg1.setAttribute('x', '10');
      pimg1.setAttribute('y', '10');
      pimg1.setAttribute('width', '35');
      pimg1.setAttribute('height', '35');
      pimg1.setAttribute('opacity', '0.7');
      pampaPattern.appendChild(pimg1);

      var pimg2 = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      pimg2.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'svg/pampa.png');
      pimg2.setAttribute('x', '45');
      pimg2.setAttribute('y', '40');
      pimg2.setAttribute('width', '25');
      pimg2.setAttribute('height', '25');
      pimg2.setAttribute('opacity', '0.7');
      pampaPattern.appendChild(pimg2);
      
      defs.appendChild(pampaPattern);
    }

    // 3. Textura do Cerrado (PNG)
    if (!document.getElementById('cerrado-pattern')) {
      var cerradoPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      cerradoPattern.setAttribute('id', 'cerrado-pattern');
      cerradoPattern.setAttribute('patternUnits', 'userSpaceOnUse');
      cerradoPattern.setAttribute('width', '90'); 
      cerradoPattern.setAttribute('height', '90');
      
      var cimg1 = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      cimg1.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'svg/cerrado.png');
      cimg1.setAttribute('x', '10');
      cimg1.setAttribute('y', '10');
      cimg1.setAttribute('width', '40');
      cimg1.setAttribute('height', '40');
      cimg1.setAttribute('opacity', '0.7');
      cerradoPattern.appendChild(cimg1);

      var cimg2 = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      cimg2.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'svg/cerrado.png');
      cimg2.setAttribute('x', '55');
      cimg2.setAttribute('y', '45');
      cimg2.setAttribute('width', '30');
      cimg2.setAttribute('height', '30');
      cimg2.setAttribute('opacity', '0.7');
      cerradoPattern.appendChild(cimg2);
      
      defs.appendChild(cerradoPattern);
    }
  }

  /* Função Central de Ordenação (Sem Panes) */
  function reorderLayers() {
    // 1. Sólidos no fundo
    if (atlanticLayer && map.hasLayer(atlanticLayer)) atlanticLayer.bringToBack();
    if (pampasLayer && map.hasLayer(pampasLayer)) pampasLayer.bringToBack();
    if (cerradoLayer && map.hasLayer(cerradoLayer)) cerradoLayer.bringToBack();
    
    // 2. Texturas logo acima dos sólidos
    if (atlanticPatternLayer && map.hasLayer(atlanticPatternLayer)) atlanticPatternLayer.bringToFront();
    if (pampasPatternLayer && map.hasLayer(pampasPatternLayer)) pampasPatternLayer.bringToFront();
    if (cerradoPatternLayer && map.hasLayer(cerradoPatternLayer)) cerradoPatternLayer.bringToFront();
    
    // 3. Máscara acima de tudo (para escurecer o resto)
    if (maskLayer && map.hasLayer(maskLayer)) maskLayer.bringToFront();
    
    // 4. Bordas no topo absoluto
    stateLayers.forEach(function(l) { 
      if (map.hasLayer(l)) l.bringToFront(); 
    });
  }

  /* Lógica de Clipping para Biomas */
  function updateBiomes() {
    try {
      // Simplificar a floresta para cálculos mais rápidos
      var cleanForest = forestGeometry ? turf.simplify(turf.buffer(forestGeometry, 0), {tolerance: 0.005, highPrecision: false}) : null;

      if (rsGeometry && cleanForest) {
        var cleanRS = turf.simplify(turf.buffer(rsGeometry, 0), {tolerance: 0.005, highPrecision: false});
        var pampaDiff = turf.difference(cleanRS, cleanForest);
        if (pampaDiff) {
          pampasLayer.clearLayers();
          pampasLayer.addData(pampaDiff);
          pampasPatternLayer.clearLayers();
          pampasPatternLayer.addData(pampaDiff);
        }
      }

      if (prGeometry && cleanForest) {
        var cleanPR = turf.simplify(turf.buffer(prGeometry, 0), {tolerance: 0.005, highPrecision: false});
        var cerradoDiff = turf.difference(cleanPR, cleanForest);
        if (cerradoDiff) {
          cerradoLayer.clearLayers();
          cerradoLayer.addData(cerradoDiff);
          cerradoPatternLayer.clearLayers();
          cerradoPatternLayer.addData(cerradoDiff);
        }
      }
      reorderLayers();
    } catch (e) {
      console.error("Erro no cálculo dos biomas:", e);
    }
  }

  function addHolesToMask(data) {
    data.features.forEach(function(feature) {
      if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates.forEach(function(ring) {
          maskPaths.push(ring.map(function(coord) { return [coord[1], coord[0]]; }));
        });
      } else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach(function(polygon) {
          polygon.forEach(function(ring) {
            maskPaths.push(ring.map(function(coord) { return [coord[1], coord[0]]; }));
          });
        });
      }
    });
    maskLayer.setLatLngs(maskPaths);
    reorderLayers();
  }

  function loadState(file, borderColor, stateCode) {
    var layer = L.geoJson(null, {
      style: { color: borderColor, weight: 3, fillOpacity: 0, clickable: false }
    }).addTo(map);
    stateLayers.push(layer);

    $.getJSON(file, function (data) { 
      layer.addData(data); 
      addHolesToMask(data);
      if (stateCode === "RS") {
        rsGeometry = data.features[0];
      } else if (stateCode === "PR") {
        prGeometry = data.features[0];
      }
      updateBiomes();
    });
  }

  /* Carregar Dados */
  $.getJSON("data/ATLANTIC_FOREST_LAW.json", function (data) {
    // Simplificar dados de entrada
    var simplifiedData = turf.simplify(data, {tolerance: 0.005, highPrecision: false});
    atlanticLayer.addData(simplifiedData);
    atlanticPatternLayer.addData(simplifiedData);
    
    var merged = simplifiedData.features[0];
    for (var i = 1; i < simplifiedData.features.length; i++) {
      try {
        merged = turf.union(merged, simplifiedData.features[i]);
      } catch(e) {}
    }
    forestGeometry = merged;
    
    updateBiomes();
  });

  loadState("data/br_pr.json", "#1E7552", "PR");
  loadState("data/br_sc.json", "#FF0000", "SC");
  loadState("data/br_rs.json", "#FFFF00", "RS");

  /* Busca e Modais */
  var geonamesBH = new Bloodhound({
    name: "GeoNames",
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace("name"),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: [
      { name: "Curitiba, PR", lat: -25.429, lng: -49.267, source: "Local" },
      { name: "Florianópolis, SC", lat: -27.595, lng: -48.548, source: "Local" },
      { name: "Porto Alegre, RS", lat: -30.033, lng: -51.23, source: "Local" }
    ],
    remote: {
      url: "https://secure.geonames.org/searchJSON?username=bootleaf&featureClass=P&maxRows=20&countryCode=BR&name_startsWith=%QUERY",
      wildcard: "%QUERY",
      filter: function (data) {
        if (!data || !data.geonames) return [];
        var southStates = ["PR", "SC", "RS"];
        return $.map(data.geonames, function (result) {
          if (southStates.indexOf(result.adminCode1) !== -1) {
            return { 
              name: result.name + ", " + result.adminCode1, 
              lat: result.lat, 
              lng: result.lng,
              source: "GeoNames"
            };
          }
        });
      }
    }
  });
  geonamesBH.initialize();

  $("#searchbox").typeahead({
    minLength: 2, // Reduzido para 2 para facilitar testes
    highlight: true,
    hint: false
  }, {
    name: "GeoNames",
    displayKey: "name",
    source: geonamesBH.ttAdapter(),
    templates: {
      header: "<h4 class='typeahead-header'><i class='fa-solid fa-location-dot'></i>&nbsp;Locais</h4>",
      empty: function(context) {
        return "<div class='tt-suggestion'>Nenhum local encontrado para '" + context.query + "' no Sul.</div>";
      }
    }
  }).on("typeahead:selected", function (obj, datum) {
    if (datum.lat && datum.lng) {
      map.setView([datum.lat, datum.lng], 14);
    }
  });

  /* Suporte para tecla Enter e clique no ícone */
  $("#searchbox").keypress(function (e) {
    if (e.which == 13) {
      $(".tt-suggestion:first-child").click();
    }
  });

  $("#searchicon").click(function() {
    $(".tt-suggestion:first-child").click();
  });

  $("#about-btn").click(function() { $("#aboutModal").modal("show"); return false; });
  $("#config-btn").click(function() { $("#configModal").modal("show"); return false; });
  $("#legend-btn").click(function() { $("#legendModal").modal("show"); return false; });
  $("#login-btn").click(function() { $("#loginModal").modal("show"); return false; });

  $("#toggle-textures, #toggle-textures-legend").change(function() {
    var isChecked = $(this).is(":checked");
    
    // Sincronizar os dois checkboxes
    $("#toggle-textures, #toggle-textures-legend").prop("checked", isChecked);

    if (isChecked) {
      map.addLayer(atlanticPatternLayer);
      map.addLayer(pampasLayer); 
      map.addLayer(pampasPatternLayer);
      map.addLayer(cerradoLayer);
      map.addLayer(cerradoPatternLayer);
      reorderLayers();
    } else {
      map.removeLayer(atlanticPatternLayer);
      map.removeLayer(pampasPatternLayer);
      map.removeLayer(cerradoPatternLayer);
    }
  });

  setTimeout(function() { map.invalidateSize(); }, 300);
  injectTreePattern();
});
