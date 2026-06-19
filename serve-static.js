var h = require('http');
var f = require('fs');
var p = require('path');
var m = { html: 'text/html', css: 'text/css', js: 'application/javascript', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', xml: 'text/xml', ico: 'image/x-icon', json: 'application/json', txt: 'text/plain' };
h.createServer(function(req, res) {
  var u = req.url.split('?')[0];
  if (u === '/') u = '/index.html';
  var fp = p.join('dist', u.replace(/\/$/, ''));
  f.stat(fp, function(err, stat) {
    if (!err && stat.isFile()) {
      var ct = m[p.extname(fp).slice(1)] || 'text/plain';
      res.writeHead(200, { 'Content-Type': ct });
      return f.createReadStream(fp).pipe(res);
    }
    var f2 = fp + '.html';
    f.stat(f2, function(e2, s2) {
      if (!e2 && s2.isFile()) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return f.createReadStream(f2).pipe(res);
      }
      f.readFile(p.join('dist', '404.html'), function(e3, d3) {
        res.writeHead(e3 ? 404 : 404, { 'Content-Type': 'text/html' });
        res.end(d3 || 'Not found');
      });
    });
  });
}).listen(3000, '127.0.0.1');
