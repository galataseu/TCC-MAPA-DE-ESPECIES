var map;
var maskLayer;
var maskPaths = [[[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]]];
var atlanticLayer;
var pampasLayer;
var rsGeometry = null;
var forestGeometry = null;

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
    maxBoundsViscosity: 1.0,
    minZoom: 5
  });

  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.control.locate({ position: "bottomright" }).addTo(map);

  /* 2. Camada dos Pampas (Azul) */
  pampasLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "#3b7ba5", fillOpacity: 0.3, clickable: false }
  }).addTo(map);

  /* 3. Camada da Mata Atlântica (Verde) */
  atlanticLayer = L.geoJson(null, {
    style: { color: "transparent", fillColor: "#287f5e", fillOpacity: 0.3, clickable: false }
  }).addTo(map);

  /* 4. Máscara Global */
  maskLayer = L.polygon(maskPaths, {
    color: "transparent",
    fillColor: "#000000",
    fillOpacity: 0.6,
    pointerEvents: "none"
  }).addTo(map);

  /* Lógica de Clipping para Biomas */
  function updateBiomes() {
    if (rsGeometry && forestGeometry) {
      try {
        console.log("Calculando separação de biomas...");
        
        // 1. Limpar geometrias
        var cleanRS = turf.buffer(rsGeometry, 0);
        var cleanForest = turf.buffer(forestGeometry, 0);
        
        // 2. O Pampa é o RS MENOS a Mata Atlântica (Diferença)
        var pampaDiff = turf.difference(cleanRS, cleanForest);
        
        // 3. A Mata Atlântica no Sul é a união da floresta interceptada com os estados
        // (Já estamos carregando a floresta simplificada, vamos apenas garantir o RS)
        var forestInRS = turf.intersect(cleanForest, cleanRS);

        if (pampaDiff) {
          pampasLayer.clearLayers();
          pampasLayer.addData(pampaDiff);
        }
        
        // Mantemos a mata atlântica original (ela já fica por cima no topo do código se necessário)
        // mas aqui garantimos que não haja sobreposição de cores se as opacidades forem altas
      } catch (e) {
        console.error("Erro no cálculo dos biomas:", e);
      }
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
    maskLayer.bringToFront();
  }

  function loadState(file, borderColor, isRS) {
    var layer = L.geoJson(null, {
      style: { color: borderColor, weight: 3, fillOpacity: 0, clickable: true },
      onEachFeature: function (f, l) { 
        l.on('click', function(e) { map.fitBounds(e.target.getBounds()); }); 
      }
    }).addTo(map);

    $.getJSON(file, function (data) { 
      layer.addData(data); 
      addHolesToMask(data);
      if (isRS) {
        rsGeometry = data.features[0];
        updateBiomes();
      }
      layer.bringToFront();
    });
  }

  /* Carregar Dados */
  $.getJSON("data/ATLANTIC_FOREST_LAW.json", function (data) {
    atlanticForestData = data;
    atlanticLayer.addData(data);
    
    // Unificar todas as feições da floresta em uma única geometria para o cálculo
    var merged = data.features[0];
    for (var i = 1; i < data.features.length; i++) {
      merged = turf.union(merged, data.features[i]);
    }
    forestGeometry = merged;
    
    updateBiomes();
    if (maskLayer) maskLayer.bringToFront();
  });

  loadState("data/br_pr.json", "#1E7552", false);
  loadState("data/br_sc.json", "#FF0000", false);
  loadState("data/br_rs.json", "#FFFF00", true);

  /* Busca e Modais */
  var geonamesBH = new Bloodhound({
    name: "GeoNames",
    datumTokenizer: Bloodhound.tokenizers.whitespace,
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
      url: "http://api.geonames.org/searchJSON?username=bootleaf&featureClass=P&maxRows=5&countryCode=BR&name_startsWith=%QUERY",
      filter: function (data) {
        return $.map(data.geonames, function (result) {
          return { name: result.name + ", " + result.adminCode1, lat: result.lat, lng: result.lng };
        });
      }
    }
  });
  geonamesBH.initialize();

  $("#searchbox").typeahead({ minLength: 3, highlight: true, hint: false }, {
    name: "GeoNames", displayKey: "name", source: geonamesBH.ttAdapter(),
    templates: { header: "<h4 class='typeahead-header'><i class='fa-solid fa-location-dot'></i>&nbsp;Locais</h4>" }
  }).on("typeahead:selected", function (obj, datum) { map.setView([datum.lat, datum.lng], 14); });

  $("#about-btn").click(function() { $("#aboutModal").modal("show"); return false; });
  $("#legend-btn").click(function() { $("#legendModal").modal("show"); return false; });
  $("#login-btn").click(function() { $("#loginModal").modal("show"); return false; });

  setTimeout(function() { map.invalidateSize(); }, 300);
});
