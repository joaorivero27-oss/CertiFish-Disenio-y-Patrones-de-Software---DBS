'use strict';

const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { MINUTO } = require('../../src/compartido');
const { lista } = require('../support/world');

// Bounded Context Registro de Capturas: HU-01, HU-04, HU-15 y HU-16

// ---------- HU-01 Registrar una captura ----------

Given('que el permiso de pesca de la embarcación {string} está vigente', function (matricula) {
  this.s.cooperativas.embarcacion(matricula).permisoVigenteHasta = '2027-12-31';
});

Given('que el permiso de pesca de la embarcación {string} ya no está vigente', function (matricula) {
  this.s.cooperativas.embarcacion(matricula).permisoVigenteHasta = '2026-11-25';
});

Given('que el celular del Patrón tiene GPS y conexión estable', function () {
  this.app.celular.gpsDisponible = true;
  this.app.celular.conexion = 'estable';
});

Given('que el celular del Patrón no puede obtener su ubicación', function () {
  this.app.celular.gpsDisponible = false;
});

Given('que el celular del Patrón está sin conexión a internet', function () {
  this.app.celular.conexion = 'sin conexión';
});

Given('que el celular del Patrón está con una conexión de baja velocidad de {int} kbps', function (kbps) {
  this.app.celular.conexion = 'baja velocidad';
  this.app.celular.kbps = kbps;
});

Given('que los metadatos EXIF de la foto no coinciden con la ubicación y la hora del celular', function () {
  this.exifDistinto = { lat: -12.05, lon: -77.04, fechaHora: '2026-11-20T06:00:00' }; // Lima, seis días antes
});

Given('que el Patrón completó la especie {string}, la cantidad {string}, el método {string} y adjuntó {int} foto',
  function (especie, cantidad, metodo, numeroFotos) {
    const fotos = Array.from({ length: numeroFotos }, () => this.app.tomarFoto());
    if (this.exifDistinto) fotos[0].exif = this.exifDistinto;
    this.borrador = { especie, cantidad, metodo, fotos };
  });

Given('que el Patrón completó la captura sin el campo {string}', function (campo) {
  const borrador = { especie: 'Pota', cantidad: '350 kg', metodo: 'Potera', fotos: [this.app.tomarFoto()] };
  const claves = { especie: 'especie', cantidad: 'cantidad', 'método de captura': 'metodo', foto: 'fotos' };
  if (campo === 'foto') borrador.fotos = [];
  else delete borrador[claves[campo]];
  this.borrador = borrador;
});

When('el Patrón envía el registro de la captura', function () {
  this.capturasAntes = this.s.registro.capturas.size;
  this.intentar(() => this.app.enviarRegistro(this.borrador));
  if (this.ultimo.ok && this.ultimo.valor.captura) this.capturaActual = this.ultimo.valor.captura.id;
});

Then('la captura queda en estado {string}', function (estado) {
  assert.ok(this.capturaActual, 'No hay una captura registrada en el escenario');
  assert.strictEqual(this.s.verificacion.estadoDe(this.capturaActual), estado);
});

Then('la captura guarda la ubicación GPS y la fecha y hora del celular', function () {
  const captura = this.s.registro.captura(this.capturaActual);
  assert.deepStrictEqual(captura.gps, this.app.celular.ubicacion);
  assert.strictEqual(captura.fechaHora, this.app.fechaHoraDelCelular());
});

Then('la captura guarda los metadatos EXIF de la foto', function () {
  const captura = this.s.registro.captura(this.capturaActual);
  assert.ok(captura.exif && captura.exif.fechaHora, 'No se extrajeron los metadatos EXIF');
  assert.strictEqual(captura.inconsistencia.hay, false);
});

Then('el sistema no guarda la captura', function () {
  assert.strictEqual(this.ultimo.ok, false, 'El registro debía rechazarse');
  assert.strictEqual(this.s.registro.capturas.size, this.capturasAntes);
  assert.strictEqual(this.app.colaLocal.length, 0);
});

Then('la captura se guarda en el celular para sincronizarla después', function () {
  assert.ok(this.ultimo.ok && this.ultimo.valor.guardadaEnCelular, 'La captura debía guardarse en el celular');
  assert.strictEqual(this.app.colaLocal.length, 1);
  assert.strictEqual(this.s.registro.capturas.size, this.capturasAntes);
});

When('el celular recupera una conexión estable', function () {
  this.app.recuperarConexion();
});

When('el primer envío se interrumpe y la aplicación lo vuelve a intentar', function () {
  this.app.interrumpirSiguienteEnvio = true;
  this.s.reloj.avanzarMinutos(60);
});

Then('la captura se sincroniza en un máximo de {int} minutos desde que se recuperó la conexión', function (minutos) {
  assert.strictEqual(this.app.colaLocal.length, 0, 'Quedaron capturas sin sincronizar');
  const sincronizada = this.app.sincronizadas[0];
  const demora = (sincronizada.en - this.app.conexionRecuperadaEn) / MINUTO;
  assert.ok(demora <= minutos, `Se sincronizó en ${demora} minutos`);
  this.capturaActual = sincronizada.captura.id;
});

Then('el sistema guarda una sola vez la captura, en estado {string}', function (estado) {
  const delPatron = [...this.s.registro.capturas.values()].filter((c) => c.patron === this.patronActual);
  assert.strictEqual(delPatron.length, 1, 'La captura se duplicó');
  assert.strictEqual(this.s.verificacion.estadoDe(delPatron[0].id), estado);
});

Then('la captura queda marcada con una inconsistencia para resolverla en la verificación automática', function () {
  const captura = this.s.registro.captura(this.capturaActual);
  assert.strictEqual(captura.inconsistencia.hay, true);
});

// ---------- HU-04 Resumen acumulado ----------

When('el Coordinador solicita el resumen de capturas del periodo {string}', function (periodo) {
  this.intentar(() => this.s.api.resumenDeCapturas(this.coordinador, periodo));
});

Then('el resumen muestra estos totales:', function (tabla) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  const obtenido = Object.fromEntries(this.ultimo.valor.porEspecie.map((f) => [f.especie, `${f.totalKg} kg`]));
  const esperado = Object.fromEntries(tabla.hashes().map((f) => [f.especie, f.total]));
  assert.deepStrictEqual(obtenido, esperado);
});

Then('el resumen no muestra un saldo disponible ni el cumplimiento del límite nacional', function () {
  const resumen = this.ultimo.valor;
  const claves = Object.keys(resumen).join(' ').toLowerCase();
  assert.ok(!/saldo|cumplimiento|limite|límite/.test(claves), `El resumen incluye un veredicto: ${claves}`);
});

Then('el resumen solo incluye las capturas de la cooperativa {string}', function (cooperativa) {
  const resumen = this.ultimo.valor;
  assert.strictEqual(resumen.cooperativa, cooperativa);
  const propias = this.s.registro.delaCooperativa(cooperativa)
    .filter((c) => c.fecha.startsWith(resumen.periodo))
    .reduce((suma, c) => suma + c.cantidadKg, 0);
  assert.strictEqual(resumen.totalKg, propias);
});

Then('el resumen muestra un total de {int} kg en lugar de un error', function (kg) {
  assert.ok(this.ultimo.ok, 'El resumen no debía fallar');
  assert.strictEqual(this.ultimo.valor.totalKg, kg);
});

// ---------- HU-15 y HU-16 Historiales ----------

function comparar(filasObtenidas, tablaEsperada, columnas) {
  const normalizar = (filas) => filas.map((f) => columnas.map((c) => f[c]).join(' | ')).sort();
  assert.deepStrictEqual(normalizar(filasObtenidas), normalizar(tablaEsperada));
}

When('{string} consulta su historial de capturas', function (nombre) {
  this.intentar(() => this.s.api.misCapturas(this.usuario(nombre)));
});

Then('ve estas capturas con su fecha, especie, cantidad y estado actual:', function (tabla) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  const filas = this.ultimo.valor.filas.map((f) => ({ 'código': f.id, fecha: f.fecha, especie: f.especie, cantidad: f.cantidad, estado: f.estado }));
  comparar(filas, tabla.hashes(), ['código', 'fecha', 'especie', 'cantidad', 'estado']);
});

Then('no ve la captura {string}, que registró otro Patrón', function (codigo) {
  assert.ok(!this.ultimo.valor.filas.some((f) => f.id === this.capturaId(codigo)));
});

When('{string} abre el detalle de la captura {string}', function (nombre, codigo) {
  this.intentar(() => this.s.api.detalleDeMiCaptura(this.usuario(nombre), this.capturaId(codigo)));
});

Then('ve el motivo del rechazo {string}', function (motivo) {
  assert.strictEqual(this.ultimo.valor.estado, 'Rechazada');
  assert.strictEqual(this.ultimo.valor.motivoRechazo, motivo);
});

Then('el sistema muestra un mensaje de error y ofrece reintentar la carga', function () {
  assert.strictEqual(this.ultimo.ok, false);
  assert.ok(this.ultimo.mensaje, 'Falta el mensaje de error');
  assert.strictEqual(this.ultimo.error.datos.reintentar, true);
});

Then('el sistema indica que todavía no hay capturas registradas', function () {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  assert.strictEqual(this.ultimo.valor.vacio, true);
  assert.strictEqual(this.ultimo.valor.mensaje, 'Todavía no hay capturas registradas.');
});

When('el Coordinador consulta el historial de capturas de su cooperativa', function () {
  this.intentar(() => this.s.api.historialDeCooperativa(this.coordinador, this.cooperativaActual));
});

Then('ve estas capturas con su fecha, Patrón, especie, cantidad y estado actual:', function (tabla) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  const filas = this.ultimo.valor.filas.map((f) => ({
    'código': f.id, fecha: f.fecha, 'Patrón': f.patron, especie: f.especie, cantidad: f.cantidad, estado: f.estado,
  }));
  comparar(filas, tabla.hashes(), ['código', 'fecha', 'Patrón', 'especie', 'cantidad', 'estado']);
});

When('el Coordinador filtra el historial por {word} {string}', function (criterio, valor) {
  const claves = { especie: 'especie', 'embarcación': 'embarcacion', estado: 'estado' };
  const filtro = { [claves[criterio]]: valor };
  this.intentar(() => this.s.api.historialDeCooperativa(this.coordinador, this.cooperativaActual, filtro));
});

Then('solo ve las capturas {string}', function (codigos) {
  const obtenidas = this.ultimo.valor.filas.map((f) => f.id).sort();
  assert.deepStrictEqual(obtenidas, lista(codigos).map((c) => this.capturaId(c)).sort());
});
