'use strict';

const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { ESTADOS } = require('../../src/verificacion-capturas');

// Bounded Context Verificación de Capturas: HU-02, HU-03 y HU-07

// ---------- HU-02 Verificación automática ----------

Given('que la Talla Mínima de Captura del {string} es {int} cm', function (especie, centimetros) {
  this.s.verificacion.definirTallaMinima(especie, centimetros);
});

Given('que el Patrón registró una captura de {string} con foto, ubicación GPS y metadatos EXIF', function (especie) {
  const app = this.app;
  const resultado = app.enviarRegistro({ especie, cantidad: '120 kg', metodo: this.metodoPara(especie), fotos: [app.tomarFoto()] });
  this.capturaActual = resultado.captura.id;
});

Given(/^que el servicio de verificación responde en (\d+) segundos con la especie "([^"]*)", una talla de (\d+) cm, una cantidad (coherente|no coherente) y una confianza de (\d+) %$/,
  function (segundos, especie, talla, cantidad, confianza) {
    this.s.ia.responder({
      latenciaSegundos: Number(segundos),
      especie,
      tallaCm: Number(talla),
      cantidadCoherente: cantidad === 'coherente',
      confianza: Number(confianza),
    });
  });

Given('que el servicio de verificación no responde', function () {
  this.s.ia.noResponder();
});

Given('que el servicio de verificación responde después de {int} segundos', function (segundos) {
  this.s.ia.responder({ latenciaSegundos: segundos, especie: 'Perico', tallaCm: 85, confianza: 95 });
});

Given('que la captura tiene una discrepancia entre el GPS del celular y los metadatos EXIF de la foto', function () {
  const captura = this.s.registro.captura(this.capturaActual);
  captura.exif = { lat: -12.05, lon: -77.04, fechaHora: '2026-11-20T06:00:00' };
  captura.inconsistencia = this.s.registro.contrastarConExif(captura);
});

When('el sistema ejecuta la verificación automática', function () {
  this.intentar(() => this.s.verificacion.verificar(this.capturaActual));
});

Then('el resultado se entrega en un máximo de {int} segundos', function (segundos) {
  const ciclo = this.s.verificacion.ciclo(this.capturaActual);
  assert.ok(ciclo.segundosHastaResultado <= segundos, `Demoró ${ciclo.segundosHastaResultado} s`);
});

Then('la captura queda en estado {string} con el motivo {string}', function (estado, motivo) {
  assert.strictEqual(this.s.verificacion.estadoDe(this.capturaActual), estado);
  assert.strictEqual(this.s.verificacion.motivoDe(this.capturaActual), motivo);
});

Then('la captura no pasa directamente a {string}', function (estado) {
  const historial = this.s.verificacion.ciclo(this.capturaActual).historial.map((h) => h.estado);
  assert.ok(!historial.includes(estado), `La verificación automática asignó "${estado}"`);
});

Then('la captura permanece en estado {string} mientras el sistema reintenta la verificación {int} veces',
  function (estado, reintentos) {
    const ciclo = this.s.verificacion.ciclo(this.capturaActual);
    assert.strictEqual(ciclo.intentos.length, 1 + reintentos, 'Cantidad de intentos distinta');
    assert.ok(ciclo.intentos.every((i) => i.estadoDurante === estado));
  });

Then('la decisión de aprobar o rechazar la captura queda a cargo del Coordinador', function () {
  const ciclo = this.s.verificacion.ciclo(this.capturaActual);
  assert.strictEqual(ciclo.estado.nombre, ESTADOS.PENDIENTE_REVISION);
  const historial = ciclo.historial.map((h) => h.estado);
  assert.ok(!historial.includes(ESTADOS.APROBADA) && !historial.includes(ESTADOS.RECHAZADA));
});

// ---------- HU-03 Revisión manual ----------

When('el Coordinador accede a la bandeja de revisión manual', function () {
  this.intentar(() => this.s.api.bandejaDeRevision(this.coordinador));
});

function itemDeBandeja(mundo, codigo) {
  assert.ok(mundo.ultimo.ok, mundo.ultimo.mensaje);
  const item = mundo.ultimo.valor.find((i) => i.id === mundo.capturaId(codigo));
  assert.ok(item, `La captura ${codigo} no está en la bandeja`);
  return item;
}

Then('ve la captura {string} con su foto, especie, talla, cantidad y ubicación', function (codigo) {
  const item = itemDeBandeja(this, codigo);
  for (const campo of ['foto', 'especie', 'talla', 'cantidad', 'ubicacion']) {
    assert.ok(item[campo] !== undefined, `Falta ${campo}`);
  }
});

Then('ve el resultado de la verificación automática con el motivo {string}', function (motivo) {
  const item = this.ultimo.valor[0];
  assert.strictEqual(item.resultadoVerificacion.motivo, motivo);
});

Then('ve que la captura {string} está afectada por el cierre de la resolución {string}', function (codigo, resolucion) {
  assert.strictEqual(itemDeBandeja(this, codigo).afectadaPorCierre, resolucion);
});

When('el Coordinador aprueba la captura {string}', function (codigo) {
  this.intentar(() => this.s.api.aprobarCaptura(this.coordinador, this.capturaId(codigo)));
});

When('el Coordinador rechaza la captura {string} con el motivo {string}', function (codigo, motivo) {
  this.intentar(() => this.s.api.rechazarCaptura(this.coordinador, this.capturaId(codigo), motivo));
});

When('el Coordinador intenta rechazar la captura {string} sin indicar un motivo', function (codigo) {
  this.intentar(() => this.s.api.rechazarCaptura(this.coordinador, this.capturaId(codigo), ''));
});

Then('la captura {string} ya puede formar parte de un lote', function (codigo) {
  assert.strictEqual(this.s.verificacion.puedeIncluirseEnLote(this.capturaId(codigo)), true);
});

Then('el sistema bloquea la acción y solicita indicar el motivo antes de confirmar', function () {
  assert.strictEqual(this.ultimo.ok, false);
  assert.strictEqual(this.ultimo.error.codigo, 'MOTIVO_REQUERIDO');
});

// ---------- HU-07 Confirmar validez ----------

function revisarConCierre(mundo, codigo, esValida) {
  mundo.intentar(() => {
    const id = mundo.capturaId(codigo);
    const detalle = mundo.s.api.detallePendienteDeConfirmacion(mundo.coordinador, id);
    assert.ok(detalle.cierre && detalle.cierre.especies && detalle.cierre.inicio, 'No se mostró el cierre que la afectó');
    return mundo.s.api.confirmarValidez(mundo.coordinador, id, esValida);
  });
}

When('el Coordinador revisa la captura {string} junto con el cierre que la afectó y confirma que sigue siendo válida',
  function (codigo) {
    revisarConCierre(this, codigo, true);
  });

When('el Coordinador revisa la captura {string} junto con el cierre que la afectó y determina que ya no es válida',
  function (codigo) {
    revisarConCierre(this, codigo, false);
  });

Then('la captura {string} queda en estado {string} con el motivo {string}', function (codigo, estado, motivo) {
  assert.strictEqual(this.estadoDe(codigo), estado);
  assert.strictEqual(this.s.verificacion.motivoDe(this.capturaId(codigo)), motivo);
});

Then('después de {int} horas la captura {string} sigue en estado {string}, porque solo el Coordinador decide su validez',
  function (horas, codigo, estado) {
    this.s.reloj.avanzarMinutos(horas * 60);
    assert.strictEqual(this.estadoDe(codigo), estado);
  });
