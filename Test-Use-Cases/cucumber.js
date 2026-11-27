// Configuración de Cucumber para CertiFish.
// Los escenarios con la etiqueta @manual se validan fuera de la prueba automatizada (RNF08).
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/**/*.js'],
    tags: 'not @manual',
    format: ['progress', 'html:reportes/cucumber-report.html'],
  },
};
