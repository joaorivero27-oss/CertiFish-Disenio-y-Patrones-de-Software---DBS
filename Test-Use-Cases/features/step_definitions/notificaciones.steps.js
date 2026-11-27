'use strict';

const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { MINUTO } = require('../../src/compartido');

// Bounded Context Notificaciones: avisos de HU-02, HU-03, HU-06 y HU-12

Given('que el servicio de notificaciones push no está disponible', function () {
  this.s.clienteFirebase.disponible = false;
});

Then('el Coordinador {string} recibe una alerta de la captura pendiente de revisión', function (nombre) {
  const alertas = this.s.notificaciones.recibidas(nombre, { tipo: 'REVISION_MANUAL' });
  assert.ok(alertas.some((a) => a.capturas.includes(this.capturaActual)), `${nombre} no recibió la alerta`);
});

Then('el Patrón {string} recibe una notificación con el motivo {string}', function (patron, motivo) {
  const recibidas = this.s.notificaciones.recibidas(patron, { tipo: 'CAPTURA_RECHAZADA' });
  assert.ok(recibidas.length > 0, `${patron} no recibió la notificación`);
  assert.ok(recibidas.every((n) => n.mensaje === motivo));
});

Then('el Coordinador recibe por notificación push y correo electrónico el aviso de que tiene {int} capturas {string}',
  function (cantidad, estado) {
    for (const canal of ['push', 'correo']) {
      const avisos = this.s.notificaciones.recibidas(this.coordinadorActual, { canal, tipo: 'PENDIENTES_DE_CONFIRMACION' });
      assert.strictEqual(avisos.length, 1, `Falta el aviso por ${canal}`);
      assert.strictEqual(avisos[0].cantidad, cantidad);
      assert.ok(avisos[0].asunto.includes(estado));
    }
  });

Then('el Coordinador recibe por notificación push y correo electrónico el aviso de capturas {string}', function (estado) {
  for (const canal of ['push', 'correo']) {
    const avisos = this.s.notificaciones.recibidas(this.coordinadorActual, { canal, tipo: 'PENDIENTES_DE_CONFIRMACION' });
    assert.ok(avisos.length >= 1 && avisos.every((a) => a.asunto.includes(estado)), `Falta el aviso por ${canal}`);
  }
});

Then('el Coordinador recibe por correo electrónico, como respaldo, el aviso de capturas {string}', function (estado) {
  const correos = this.s.notificaciones.recibidas(this.coordinadorActual, { canal: 'correo', tipo: 'PENDIENTES_DE_CONFIRMACION' });
  const fallidas = this.s.notificaciones.fallidas.filter((n) => n.destinatario === this.coordinadorActual && n.tipo === 'PENDIENTES_DE_CONFIRMACION');
  assert.strictEqual(fallidas.length, 1, 'No se registró la falla del push');
  assert.strictEqual(correos.length, 1);
  assert.ok(correos[0].respaldo && correos[0].asunto.includes(estado));
});

// ---------- HU-12 Alerta de revisión manual ----------

Then('en un máximo de {int} minuto el Coordinador recibe por notificación push y correo electrónico la alerta de la captura con el motivo {string}',
  function (minutos, motivo) {
    const pendienteDesde = this.s.verificacion.ciclo(this.capturaActual).historial.at(-1).en;
    for (const canal of ['push', 'correo']) {
      const alertas = this.s.notificaciones.recibidas(this.coordinadorActual, { canal, tipo: 'REVISION_MANUAL' });
      assert.strictEqual(alertas.length, 1, `Falta la alerta por ${canal}`);
      assert.strictEqual(alertas[0].motivo, motivo);
      assert.ok(alertas[0].capturas.includes(this.capturaActual));
      assert.ok((alertas[0].en - pendienteDesde) / MINUTO <= minutos);
    }
  });

Then('el Coordinador recibe la alerta por correo electrónico como respaldo', function () {
  const correos = this.s.notificaciones.recibidas(this.coordinadorActual, { canal: 'correo', tipo: 'REVISION_MANUAL' });
  const push = this.s.notificaciones.recibidas(this.coordinadorActual, { canal: 'push', tipo: 'REVISION_MANUAL' });
  assert.strictEqual(push.length, 0);
  assert.strictEqual(correos.length, 1);
  assert.strictEqual(correos[0].respaldo, true);
});

When('{int} capturas de la cooperativa quedan en estado {string} en un lapso de {int} minutos', function (cantidad, estado, lapso) {
  const app = this.app;
  const paso = Math.floor((lapso - 1) / (cantidad - 1));
  this.capturasDelLapso = [];
  for (let i = 0; i < cantidad; i += 1) {
    const { captura } = app.enviarRegistro({ especie: 'Pota', cantidad: '90 kg', metodo: 'Potera', fotos: [app.tomarFoto()] });
    this.s.verificacion.verificar(captura.id);
    assert.strictEqual(this.s.verificacion.estadoDe(captura.id), estado);
    this.capturasDelLapso.push(captura.id);
    if (i < cantidad - 1) this.s.reloj.avanzarMinutos(paso);
  }
  this.s.reloj.avanzarMinutos(lapso); // se cierra la ventana de agrupación
});

Then('el Coordinador no recibe una notificación separada por cada captura', function () {
  const push = this.s.notificaciones.recibidas(this.coordinadorActual, { canal: 'push' })
    .filter((n) => n.tipo.startsWith('REVISION_MANUAL'));
  assert.ok(push.length < this.capturasDelLapso.length, `Recibió ${push.length} notificaciones`);
});

Then('las {int} capturas que quedaron pendientes después de la primera le llegan agrupadas en una sola notificación consolidada',
  function (cantidad) {
    const consolidadas = this.s.notificaciones.recibidas(this.coordinadorActual, { canal: 'push', tipo: 'REVISION_MANUAL_CONSOLIDADA' });
    assert.strictEqual(consolidadas.length, 1);
    assert.deepStrictEqual(consolidadas[0].capturas, this.capturasDelLapso.slice(1));
    assert.strictEqual(consolidadas[0].capturas.length, cantidad);
  });
