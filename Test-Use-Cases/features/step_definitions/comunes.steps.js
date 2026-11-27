'use strict';

const assert = require('assert');
const { Given, Then } = require('@cucumber/cucumber');

// ---------- Contexto común: cooperativas, usuarios y capturas existentes ----------

Given('que existe la cooperativa {string}', function (cooperativa) {
  this.asegurarCooperativa(cooperativa);
  this.cooperativaActual = cooperativa;
});

Given('que existe la embarcación {string} de la cooperativa {string}', function (matricula, cooperativa) {
  this.asegurarEmbarcacion(matricula, cooperativa);
});

Given('que el Coordinador {string} gestiona la cooperativa {string}', function (nombre, cooperativa) {
  this.asegurarCoordinador(nombre, cooperativa);
  this.coordinadorActual = nombre;
  this.cooperativaActual = cooperativa;
});

Given('que el Patrón de embarcación {string} opera la embarcación {string} de la cooperativa {string}',
  function (nombre, matricula, cooperativa) {
    this.asegurarPatron(nombre, { matricula, cooperativa });
    this.patronActual = nombre;
    this.cooperativaActual = this.cooperativaActual || cooperativa;
  });

Given('que la cooperativa tiene estas capturas:', function (tabla) {
  for (const fila of tabla.hashes()) this.sembrarCaptura(fila);
});

Given('que la cooperativa {string} registró {int} kg de {string} en el periodo {string}',
  function (cooperativa, kg, especie, periodo) {
    this.crearOtraCooperativa(cooperativa, { kg, especie, periodo });
  });

Given('que el servicio de capturas no está disponible', function () {
  this.s.registro.disponible = false;
});

// ---------- Resultados comunes ----------

Then('el sistema muestra el mensaje {string}', function (mensaje) {
  assert.ok(this.ultimo, 'No se ejecutó ninguna acción');
  assert.strictEqual(this.ultimo.mensaje, mensaje);
});

Then('la captura {string} queda en estado {string}', function (codigo, estado) {
  assert.strictEqual(this.estadoDe(codigo), estado);
});

Then('la captura {string} sigue en estado {string}', function (codigo, estado) {
  assert.strictEqual(this.estadoDe(codigo), estado);
});

Then('la auditoría registra {string} con fecha, hora y el responsable {string}', function (descripcion, responsable) {
  const registros = this.s.auditoria.buscar(descripcion).filter((r) => r.responsable === responsable);
  assert.ok(registros.length > 0, `La auditoría no tiene "${descripcion}" de ${responsable}`);
  assert.ok(registros.every((r) => r.en instanceof Date && !Number.isNaN(r.en.getTime())), 'Falta la fecha y hora');
});
