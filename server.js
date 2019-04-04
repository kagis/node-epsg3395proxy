const express = require('express');
const epsg3395proxy = require('./index.js');

const app = (
  express()
  .use('/yandex-map/:z/:x/:y', epsg3395proxy('http://vec01.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}'))
  .use('/yandex-sat/:z/:x/:y', epsg3395proxy('https://sat02.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}'))
  .listen(80)
);

process.on('SIGINT', function() {
  app.close();
});

// http://localhost:8000/yandex-map/8/181/90
// http://localhost:8000/yandex-sat/8/181/90
