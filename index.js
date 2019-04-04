const { PNG } = require('pngjs');
const JPEG = require('jpeg-js');
const fetch = require('node-fetch');

module.exports = function epsg3395proxy(url_template) {
  return function (req, res, next) {
    const z = +req.params.z;
    const y = +req.params.y;
    const x = +req.params.x;

    const EX = 0.081819790992114408;
    const a = 2 ** z / (2 * Math.PI);
    const tan = Math.exp(Math.PI - (y / a));
    const φ = 2 * (Math.atan(tan) - Math.PI / 4);
    const comp = ((1 - EX * Math.sin(φ)) / (1 + EX * Math.sin(φ))) ** (EX / 2);
    const reproj_y = a * (Math.PI - Math.log(tan * comp));
    const epsg3395y = Math.floor(reproj_y);

    Promise.all([epsg3395y, epsg3395y + 1].map(async ny => {
      const resp = await fetch(
        url_template
        .replace(/{z}/g, z)
        .replace(/{x}/g, x)
        .replace(/{y}/g, ny)
      );

      const data = await resp.buffer();

      if (!resp.ok) {
        return {
          status: resp.status,
          content_type: resp.headers.get('content-type'),
          url: resp.url,
          data,
        };
      }

      const PNG_SIGNATURE_HEX = '89504e470d0a1a0a';
      const [content_type, decoded_img] = (
        data.hexSlice(0, 8) == PNG_SIGNATURE_HEX
        ? ['image/png', PNG.sync.read(data)]
        : ['image/jpeg', JPEG.decode(data)]
      );
      return {
        status: 200,
        content_type,
        url: resp.url,
        size: decoded_img.width,
        data: decoded_img.data,
      };
    }))
    .then(([tile, tile2]) => {

      if (!(tile.status == 200 && tile2.status == 200)) {
        res.writeHead(Math.max(tile.status, tile.status), {
          'content-type': tile.content_type,
          'x-original-urls': tile.url + ' ' + tile2.url,
        });
        res.end(tile.data);
        return;
      }

      const y_offset_px = Math.round((reproj_y % 1) * tile.size);
      tile.data.copy(tile.data, 0, tile.size * 4 * y_offset_px);
      tile2.data.copy(tile.data, tile.size * 4 * (tile.size - y_offset_px));
      const combined_img = {
        width: tile.size,
        height: tile.size,
        data: tile.data,
      };

      const combined_img_encoded = (
        tile.content_type == 'image/png'
        ? PNG.sync.write(combined_img)
        : JPEG.encode(combined_img).data
      );
    
      res.writeHead(200, {
        'content-type': tile.content_type,
        'x-original-urls': tile.url + ' ' + tile2.url,
      });
      res.end(combined_img_encoded);
    })
    .catch(next);
  };
};
