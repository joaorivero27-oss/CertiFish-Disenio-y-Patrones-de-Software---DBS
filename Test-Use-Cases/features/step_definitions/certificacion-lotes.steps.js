'use strict';

const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { lista } = require('../support/world');

// Bounded Context Certificación de Lotes: HU-09, HU-10 y HU-11

// ---------- HU-09 Emitir el certificado ----------

Given('que el Coordinador emitió el certificado del lote {string}', function (alias) {
  this.s.api.emitirCertificado(this.coordinador, this.loteCodigo(alias));
});

Given('que la captura {string} pasó a estado {string} después de la consolidación', function (codigo, estado) {
  assert.strictEqual(estado, 'Pendiente de confirmación');
  this.s.verificacion.forzarPendienteConfirmacion(this.capturaId(codigo), 'RM-0009-2026-PRODUCE');
});

Given('que la generación del certificado falla', function () {
  this.s.certificacion.falloAlEmitir = true;
});

When('el Coordinador solicita emitir el certificado del lote {string}', function (alias) {
  const codigo = this.loteCodigo(alias);
  this.estadoLoteAntes = this.s.lotes.lote(codigo).estado;
  this.intentar(() => this.s.api.emitirCertificado(this.coordinador, codigo));
  if (this.ultimo.ok) this.certificadoActual = this.ultimo.valor;
});

Then('el sistema genera el certificado con un código de verificación', function () {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  assert.match(this.certificadoActual.codigoVerificacion, /^CF-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
});

Then('el certificado incluye la cooperativa {string}, la especie {string} y las matrículas {string}',
  function (cooperativa, especie, matriculas) {
    const contenido = this.certificadoActual.contenido;
    assert.strictEqual(contenido.cooperativa, cooperativa);
    assert.strictEqual(contenido.especie, especie);
    assert.deepStrictEqual(contenido.capturas.map((c) => c.matricula).sort(), lista(matriculas).sort());
  });

Then('el certificado incluye el método de captura, la fecha, la hora, la ubicación y el estado de cada captura', function () {
  for (const linea of this.certificadoActual.contenido.capturas) {
    for (const campo of ['metodo', 'fecha', 'hora', 'ubicacion', 'estado']) {
      assert.ok(linea[campo], `Falta ${campo} en una captura del certificado`);
    }
  }
});

Then('el sistema impide la emisión porque la captura {string} está en estado {string}', function (codigo, estado) {
  assert.strictEqual(this.ultimo.ok, false, 'La emisión debía impedirse');
  assert.strictEqual(this.ultimo.error.codigo, 'CAPTURA_NO_VALIDA');
  assert.strictEqual(this.ultimo.error.datos.captura, this.capturaId(codigo));
  assert.strictEqual(this.ultimo.error.datos.estado, estado);
  assert.ok(this.ultimo.mensaje.includes(estado), 'El mensaje no explica el motivo');
});

Then('el sistema impide la emisión porque el lote {string} no está en estado {string}', function (alias, estado) {
  assert.strictEqual(this.ultimo.ok, false);
  assert.strictEqual(this.ultimo.error.codigo, 'LOTE_NO_CONSOLIDADO');
  assert.ok(this.ultimo.mensaje.includes(this.loteCodigo(alias)) && this.ultimo.mensaje.includes(estado));
});

Then('el sistema no emite el certificado', function () {
  assert.strictEqual(this.ultimo.ok, false);
  assert.strictEqual(this.s.certificacion.certificados.size, 0);
});

// ---------- HU-10 Descargar el certificado y preparar CATCH o SIMP ----------

const MERCADO_DE = { CATCH: 'Unión Europea', SIMP: 'Estados Unidos' };

function solicitarDocumento(mundo, documento, alias) {
  const codigo = mundo.loteCodigo(alias);
  mundo.entregasAntes = mundo.s.certificacion.entregas.length;
  mundo.intentar(() => (documento === 'PDF'
    ? mundo.s.api.descargarCertificadoPDF(mundo.coordinador, codigo)
    : mundo.s.api.generarDocumentoExportacion(mundo.coordinador, codigo, MERCADO_DE[documento])));
}

When('el Coordinador solicita el documento {string} del lote {string}', function (documento, alias) {
  solicitarDocumento(this, documento, alias);
});

When('el Coordinador prepara los datos de exportación del lote {string} para el mercado {string}', function (alias, mercado) {
  const codigo = this.loteCodigo(alias);
  this.entregasAntes = this.s.certificacion.entregas.length;
  this.intentar(() => this.s.api.generarDocumentoExportacion(this.coordinador, codigo, mercado));
});

Then('el sistema entrega un PDF que incluye el código de verificación del certificado', function () {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  const pdf = this.ultimo.valor;
  assert.strictEqual(pdf.formato, 'PDF');
  assert.ok(pdf.texto.includes(`Código de verificación: ${pdf.codigoVerificacion}`));
});

Then('el sistema entrega los datos en la estructura de {string} con el código de verificación', function (formato) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  assert.strictEqual(this.ultimo.valor.formato, formato);
  assert.match(this.ultimo.valor.datos.codigoVerificacion, /^CF-/);
});

Then('los datos se validaron contra el esquema vigente de {string} antes de entregarlos', function (formato) {
  assert.strictEqual(this.ultimo.valor.validadoContra, formato);
  for (const campo of this.s.certificacion.esquemas[formato]) {
    assert.ok(this.ultimo.valor.datos[campo] !== undefined, `Falta el campo ${campo}`);
  }
});

Given('que la generación de archivos falla', function () {
  this.s.certificacion.falloAlGenerarArchivos = true;
});

Then('la falla no se registra como una descarga', function () {
  assert.strictEqual(this.s.certificacion.entregas.length, this.entregasAntes);
});

Given('que el esquema oficial vigente de {string} ahora exige el campo {string}', function (formato, campo) {
  this.s.certificacion.esquemas[formato].push(campo);
});

Then('el sistema no entrega el archivo', function () {
  assert.strictEqual(this.ultimo.ok, false);
  assert.strictEqual(this.s.certificacion.entregas.length, this.entregasAntes);
});

Then('el sistema impide la operación porque el lote {string} no está en estado {string}', function (alias, estado) {
  assert.strictEqual(this.ultimo.ok, false);
  assert.strictEqual(this.ultimo.error.codigo, 'LOTE_NO_CERTIFICADO');
  assert.ok(this.ultimo.mensaje.includes(this.loteCodigo(alias)) && this.ultimo.mensaje.includes(estado));
});

Then('el sistema registra {int} entregas independientes del lote {string}, cada una con fecha, hora y responsable',
  function (cantidad, alias) {
    const entregas = this.s.certificacion.entregas.filter((e) => e.lote === this.loteCodigo(alias));
    assert.strictEqual(entregas.length, cantidad);
    assert.ok(entregas.every((e) => e.en instanceof Date && e.responsable === this.coordinadorActual));
  });

// ---------- HU-11 Verificación pública ----------

Given('que la cooperativa {string} tiene el lote {string} de {string} con su certificado emitido',
  function (cooperativa, alias, especie) {
    this.asegurarCoordinador('Carlos Ruiz', cooperativa);
    this.coordinadorActual = 'Carlos Ruiz';
    this.cooperativaActual = cooperativa;
    this.sembrarCaptura({ 'código': 'C-01', 'Patrón': 'Juan Quispe', especie, fecha: '2026-11-22', estado: 'Verificada' });
    this.sembrarCaptura({ 'código': 'C-02', 'Patrón': 'Luis Ramos', especie, fecha: '2026-11-24', estado: 'Aprobada' });
    const lote = this.s.api.consolidarLote(this.coordinador, ['C-01', 'C-02']);
    this.aliasLotes.set(alias, lote.codigo);
    this.s.api.emitirCertificado(this.coordinador, lote.codigo);
  });

Given('que el tercero interesado tiene el código de verificación del certificado del lote {string}', function (alias) {
  this.codigoConsultado = this.s.certificacion.certificadoDelLote(this.loteCodigo(alias)).codigoVerificacion;
});

When('ingresa ese código en la consulta pública, sin iniciar sesión', function () {
  this.intentar(() => this.s.api.verificarCertificado(this.codigoConsultado));
});

When('el tercero interesado ingresa el código {string} en la consulta pública', function (codigo) {
  this.verificacionesAntes = this.s.bus.publicados.filter((e) => e.evento === 'CERTIFICADO_VERIFICADO').length;
  this.intentar(() => this.s.api.verificarCertificado(codigo));
});

Then('el sistema confirma que el certificado es auténtico y no fue alterado desde su emisión', function () {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  assert.strictEqual(this.ultimo.valor.valido, true);
  assert.strictEqual(this.ultimo.valor.integro, true);
});

Then('muestra la cooperativa, la matrícula de cada embarcación, la especie, el método de captura y la fecha, hora, ubicación y estado de cada captura',
  function () {
    const contenido = this.ultimo.valor.contenido;
    assert.ok(contenido.cooperativa && contenido.especie);
    for (const linea of contenido.capturas) {
      for (const campo of ['matricula', 'metodo', 'fecha', 'hora', 'ubicacion', 'estado']) assert.ok(linea[campo], `Falta ${campo}`);
    }
  });

Then('no muestra datos personales de los Patrones de embarcación', function () {
  const texto = JSON.stringify(this.ultimo.valor);
  for (const nombre of ['Juan Quispe', 'Luis Ramos', 'correo.pe']) {
    assert.ok(!texto.includes(nombre), `La consulta pública muestra ${nombre}`);
  }
});

Then('el sistema no realiza la consulta', function () {
  assert.strictEqual(this.ultimo.ok, false);
  assert.strictEqual(this.ultimo.error.codigo, 'FORMATO_INVALIDO');
  const despues = this.s.bus.publicados.filter((e) => e.evento === 'CERTIFICADO_VERIFICADO').length;
  assert.strictEqual(despues, this.verificacionesAntes);
});

Given('que el contenido del certificado del lote {string} fue modificado después de su emisión', function (alias) {
  const certificado = this.s.certificacion.certificadoDelLote(this.loteCodigo(alias));
  certificado.contenido.capturas[0].fecha = '2026-10-01'; // alteración posterior a la emisión
  this.codigoConsultado = certificado.codigoVerificacion;
});

When('el tercero interesado verifica ese certificado con su código', function () {
  this.intentar(() => this.s.api.verificarCertificado(this.codigoConsultado));
});

Then('el sistema detecta la discrepancia e indica que el certificado no es íntegro', function () {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  assert.strictEqual(this.ultimo.valor.integro, false);
  assert.ok(this.ultimo.valor.mensaje.includes('no es íntegro'));
});

Then('no lo confirma como válido', function () {
  assert.strictEqual(this.ultimo.valor.valido, false);
  assert.strictEqual(this.ultimo.valor.contenido, undefined);
});
