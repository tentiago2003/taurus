/** Router HTTP minimalista (sem dependências externas), com suporte a parâmetros ":nome" no caminho. */
class Router {
  constructor() {
    this.routes = [];
  }

  add(method, routePath, handler) {
    const segments = routePath.split('/').filter(Boolean);
    this.routes.push({ method, segments, handler });
  }

  get(routePath, handler) {
    this.add('GET', routePath, handler);
  }

  post(routePath, handler) {
    this.add('POST', routePath, handler);
  }

  put(routePath, handler) {
    this.add('PUT', routePath, handler);
  }

  delete(routePath, handler) {
    this.add('DELETE', routePath, handler);
  }

  /** Retorna { handler, params } para a primeira rota compatível, ou null. */
  find(method, pathname) {
    const pathSegments = pathname.split('/').filter(Boolean);

    for (const route of this.routes) {
      if (route.method !== method || route.segments.length !== pathSegments.length) {
        continue;
      }

      const params = {};
      const matched = route.segments.every((segment, index) => {
        if (segment.startsWith(':')) {
          params[segment.slice(1)] = pathSegments[index];
          return true;
        }
        return segment === pathSegments[index];
      });

      if (matched) {
        return { handler: route.handler, params };
      }
    }

    return null;
  }
}

module.exports = { Router };
