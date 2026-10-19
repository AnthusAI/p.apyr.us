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
  if (host === 'apyr.us') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://p.apyr.us' + uri + query } }
    };
  }
  var target = null;
  if (uri === '/information' || uri.indexOf('/information/') === 0) {
    target = uri;
  } else if (/^\/\d{4}\/[a-z]+\/\d{2}(\/|$)/.test(uri) || uri === '/archive' || uri === '/settings' || uri === '/articles' || uri.indexOf('/articles/') === 0) {
    target = '/information' + uri;
  }
  if (target === null) {
    return request;
  }
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: 'https://read.p.apyr.us' + target + query } }
  };
}
