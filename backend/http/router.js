/** Router HTTP minimalista (sem dependências externas), casamento exato de método + caminho. */
class Router {
  constructor() {
    this.routes = new Map();
  }

  add(method, routePath, handler) {
    this.routes.set(`${method} ${routePath}`, handler);
  }

  get(routePath, handler) {
    this.add('GET', routePath, handler);
  }

  post(routePath, handler) {
    this.add('POST', routePath, handler);
  }

  find(method, routePath) {
    return this.routes.get(`${method} ${routePath}`);
  }
}

module.exports = { Router };
