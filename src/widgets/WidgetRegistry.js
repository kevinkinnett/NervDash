class WidgetRegistry {
  constructor(configLoader) {
    this.configLoader = configLoader;
  }

  list() {
    return this.configLoader.getWidgets();
  }

  getById(id) {
    const widget = this.list().find((entry) => entry.id === id);
    if (!widget) {
      const error = new Error(`Widget with id ${id} was not found.`);
      error.code = 'WidgetNotFound';
      throw error;
    }
    return widget;
  }
}

module.exports = { WidgetRegistry };
