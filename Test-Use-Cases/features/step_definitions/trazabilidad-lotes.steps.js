'use strict';

const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { lista } = require('../support/world');

// Bounded Context Trazabilidad de Lotes: HU-08 (y apoyo a HU-06, HU-07, HU-09 y HU-10)

Given('que la captura {string} forma parte del lote {string} en estado {string}', function (codigo, lote, estado) {
  const captura = this.s.registro.captura(this.capturaId(codigo));
  this.s.lotes.sembrar({ codigo: lote, cooperativa: captura.cooperativa, especie: captura.especie, capturas: [captura.id], estado });
  this.aliasLotes.set(lote, lote);
});

Given('que el Coordinador consolidó las capturas {string} en el lote {string}', function (codigos, alias) {
  const lote = this.s.api.consolidarLote(this.coordinador, lista(codigos).map((c) => this.capturaId(c)));
  this.aliasLotes.set(alias, lote.codigo);
});

When('el Coordinador selecciona las capturas {string} y confirma la consolidación', function (codigos) {
  this.lotesAntes = this.s.lotes.lotes.size;
  this.intentar(() => this.s.api.consolidarLote(this.coordinador, lista(codigos).map((c) => this.capturaId(c))));
  if (this.ultimo.ok) this.loteActual = this.ultimo.valor.codigo;
});

Then('el sistema agrupa las capturas {string} en un lote de {string}', function (codigos, especie) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  const lote = this.s.lotes.lote(this.loteActual);
  assert.deepStrictEqual(lote.capturas, lista(codigos).map((c) => this.capturaId(c)));
  assert.strictEqual(lote.especie, especie);
});

Then('el lote queda en estado {string}', function (estado) {
  assert.strictEqual(this.s.lotes.lote(this.loteActual).estado, estado);
});

Then('el sistema no consolida el lote', function () {
  assert.strictEqual(this.ultimo.ok, false, 'La consolidación debía rechazarse');
  assert.strictEqual(this.s.lotes.lotes.size, this.lotesAntes);
});

When('el Coordinador arma un nuevo lote', function () {
  this.intentar(() => this.s.api.capturasDisponiblesParaLote(this.coordinador));
});

Then('las capturas {string} no aparecen entre las capturas disponibles para consolidar', function (codigos) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  for (const codigo of lista(codigos)) {
    assert.ok(!this.ultimo.valor.includes(this.capturaId(codigo)), `${codigo} sigue disponible`);
  }
});

Then('el lote {string} pasa de {string} a {string}', function (alias, estadoInicial, estadoFinal) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  assert.strictEqual(this.estadoLoteAntes, estadoInicial);
  assert.strictEqual(this.s.lotes.lote(this.loteCodigo(alias)).estado, estadoFinal);
});

Then('el lote {string} sigue en estado {string}', function (alias, estado) {
  assert.strictEqual(this.s.lotes.lote(this.loteCodigo(alias)).estado, estado);
});
