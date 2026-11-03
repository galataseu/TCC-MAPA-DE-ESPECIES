var express = require('express');
var router = express.Router();
var path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Gralha dos Ventos | Mapa Interativo de Espécies Ameaçadas do Sul do Brasil',
    description: 'Explore o mapa interativo de espécies ameaçadas de extinção na região Sul do Brasil (PR, SC e RS). Conheça a fauna, biomas e áreas de conservação com dados do ICMBio e SALVE.',
    canonicalUrl: 'https://tcc-mapa-de-especies.vercel.app/'
  });
});

module.exports = router;
