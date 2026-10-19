function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var host = request.headers.host.value;
  var keys = Object.keys(request.querystring);
  var query = '';
  if (keys.length > 0) {
    query = '?' + keys.map(function (k) {
      var q = request.querystring[k];
      return q.value === '' ? k : k + '=' + q.value;
    }).join('&');
  }
  function redirect(code, location) {
    return {
      statusCode: code,
      statusDescription: code === 301 ? 'Moved Permanently' : 'Found',
      headers: { location: { value: location } }
    };
  }
  if (uri === '/' || uri === '/index.html') {
    return redirect(302, 'https://read.p.apyr.us/information' + query);
  }
  if (uri === '/newsroom' || uri.indexOf('/newsroom/') === 0) {
    return redirect(302, 'https://p.apyr.us' + uri + query);
  }
  var publication = uri === '/information' || uri.indexOf('/information/') === 0 ||
    uri.indexOf('/_next/') === 0 || uri.indexOf('/api/') === 0 ||
    uri === '/feed.xml' || uri === '/rss.xml' || uri === '/atom.xml' || uri === '/sitemap.xml' ||
    uri === '/robots.txt' || uri === '/favicon.ico' || uri === '/papyrus-plant.png' ||
    uri.indexOf('/.well-known/') === 0;
  if (!publication) {
    return redirect(302, 'https://read.p.apyr.us/information' + query);
  }
  request.headers['x-forwarded-host'] = { value: host };
  return request;
}
