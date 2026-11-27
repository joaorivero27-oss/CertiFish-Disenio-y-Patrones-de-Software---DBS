'use strict';

const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { lista } = require('../support/world');
const { MINUTO } = require('../../src/compartido');

// Bounded Context Cierres Normativos: HU-05 y HU-06

function datosDeCierre({ tipo = 'cierre de emergencia', especie, inicio, fin, resolucion, zona, bodega }) {
  return {
    tipo,
    especies: especie ? [especie] : [],
    inicio,
    fin,
    resolucion,
    zona,
    capacidadBodegaMax: bodega,
  };
}

function registrarCierre(mundo, datos) {
  mundo.intentar(() => mundo.s.api.registrarCierre(mundo.coordinador, datos));
  if (mundo.ultimo.ok) mundo.cierreActual = mundo.ultimo.valor;
}

// ---------- HU-05 Registrar un cierre ----------

When('el Coordinador ingresa el tipo {string}, la especie {string}, el periodo del {string} al {string} y la resolución {string}',
  function (tipo, especie, inicio, fin, resolucion) {
    this.intentar(() => this.s.api.evaluarDatosDeCierre(this.coordinador, datosDeCierre({ tipo, especie, inicio, fin, resolucion })));
  });

Then('el sistema permite continuar con el registro', function () {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  assert.strictEqual(this.ultimo.valor.puedeContinuar, true);
});

Then('el sistema exige también la zona regulatoria y la capacidad de bodega como datos obligatorios', function () {
  const obligatorios = this.ultimo.valor.obligatorios;
  assert.ok(obligatorios.includes('zona regulatoria') && obligatorios.includes('capacidad de bodega'), obligatorios.join(', '));
});

Given('que el Coordinador completó todos los datos obligatorios de un cierre de emergencia de {string}', function (especie) {
  this.borradorCierre = datosDeCierre({ especie, inicio: '2026-11-20', fin: '2026-12-20', resolucion: 'RM-0001-2026-PRODUCE' });
});

Given('que el Coordinador completó los datos de un cierre de {string} sin el dato {string}', function (especie, dato) {
  const datos = datosDeCierre({
    especie, inicio: '2026-11-20', fin: '2026-12-20', resolucion: 'RM-0001-2026-PRODUCE', zona: 'Norte', bodega: 10,
  });
  const quitar = {
    tipo: () => { delete datos.tipo; },
    periodo: () => { delete datos.inicio; delete datos.fin; },
    'resolución': () => { delete datos.resolucion; },
    'zona regulatoria': () => { delete datos.zona; },
    'capacidad de bodega': () => { delete datos.capacidadBodegaMax; },
  };
  quitar[dato]();
  this.borradorCierre = datos;
});

When('el Coordinador confirma el registro del cierre', function () {
  registrarCierre(this, this.borradorCierre);
});

Then('el sistema guarda el cierre normativo asociado a la fecha, la hora y el Coordinador {string}', function (nombre) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  const guardado = this.s.cierres.porResolucion(this.borradorCierre.resolucion);
  assert.ok(guardado, 'No se guardó el cierre');
  assert.strictEqual(guardado.coordinador, nombre);
  assert.ok(guardado.registradoEn instanceof Date);
});

Then('el sistema no guarda el cierre normativo', function () {
  assert.strictEqual(this.ultimo.ok, false);
  assert.strictEqual(this.s.cierres.cierres.length, 0);
});

Given('que el Coordinador registró un cierre de emergencia de {string} del {string} al {string} con la resolución {string}',
  function (especie, inicio, fin, resolucion) {
    registrarCierre(this, datosDeCierre({ especie, inicio, fin, resolucion }));
    assert.ok(this.ultimo.ok, this.ultimo.mensaje);
    this.copiaOriginal = JSON.stringify(this.s.cierres.porResolucion(resolucion));
  });

When('el Coordinador registra la resolución {string} que extiende ese cierre hasta el {string}', function (resolucion, fin) {
  const anterior = this.cierreActual.resolucion;
  this.intentar(() => this.s.api.registrarModificacionDeCierre(this.coordinador, anterior, { resolucion, fin }));
});

Then('el sistema guarda la resolución {string} como un registro adicional', function (resolucion) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  assert.strictEqual(this.s.cierres.cierres.length, 2);
  assert.strictEqual(this.s.cierres.porResolucion(resolucion).modificaA, this.cierreActual.resolucion);
});

Then('la resolución {string} se conserva sin cambios en el historial', function (resolucion) {
  assert.strictEqual(JSON.stringify(this.s.cierres.porResolucion(resolucion)), this.copiaOriginal);
});

// ---------- HU-06 Identificar capturas afectadas ----------

When('el Coordinador registra un cierre de emergencia de {string} del {string} al {string} con la resolución {string}',
  function (especie, inicio, fin, resolucion) {
    registrarCierre(this, datosDeCierre({ especie, inicio, fin, resolucion }));
  });

When('el Coordinador registra un cierre de emergencia de {string} en la zona {string} para embarcaciones de hasta {int} m³ del {string} al {string} con la resolución {string}',
  function (especie, zona, bodega, inicio, fin, resolucion) {
    registrarCierre(this, datosDeCierre({ especie, inicio, fin, resolucion, zona, bodega }));
  });

Given('que la embarcación de {string} opera en la zona {string} y tiene {int} m³ de capacidad de bodega',
  function (patron, zona, bodega) {
    const embarcacion = this.s.cooperativas.embarcacionDe(patron);
    embarcacion.zona = zona;
    embarcacion.capacidadBodega = bodega;
  });

Then('en un máximo de {int} horas las capturas {string} quedan en estado {string}', function (horas, codigos, estado) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  const identificacion = this.cierreActual.identificacion;
  assert.ok(identificacion.minutos <= horas * 60, `La identificación tomó ${identificacion.minutos} minutos`);
  for (const codigo of lista(codigos)) assert.strictEqual(this.estadoDe(codigo), estado, codigo);
});

Then('no cambia el estado de las capturas {string}', function (codigos) {
  for (const codigo of lista(codigos)) {
    assert.strictEqual(this.estadoDe(codigo), this.estadosSembrados.get(codigo), codigo);
  }
});

Given('que el Patrón {string} registró sin señal la captura {string} de {string} del {string}',
  function (nombre, alias, especie, fecha) {
    const app = this.appDe(nombre);
    app.celular.conexion = 'sin conexión';
    app.celular.fechaHoraFija = `${fecha}T10:00:00`;
    app.enviarRegistro({ especie, cantidad: '180 kg', metodo: this.metodoPara(especie), fotos: [app.tomarFoto()] });
    this.capturaSinSenal = { nombre, alias };
  });

function sincronizar(mundo, alias) {
  const app = mundo.appDe(mundo.capturaSinSenal.nombre);
  app.recuperarConexion();
  mundo.s.reloj.avanzarMinutos(20);
  const id = app.sincronizadas[app.sincronizadas.length - 1].captura.id;
  mundo.aliasCapturas.set(alias, id);
  return id;
}

When('la captura {string} se sincroniza y queda {string} en la verificación automática', function (alias, estado) {
  const id = sincronizar(this, alias);
  const especie = this.s.registro.captura(id).especie;
  this.s.ia.responder({ especie, tallaCm: 80, confianza: 95 });
  this.s.verificacion.verificar(id);
  assert.ok(this.s.verificacion.ciclo(id).historial.some((h) => h.estado === estado));
});

When('la captura {string} se sincroniza y el Coordinador la aprueba en la revisión manual', function (alias) {
  const id = sincronizar(this, alias);
  const especie = this.s.registro.captura(id).especie;
  this.s.ia.responder({ especie, tallaCm: 80, confianza: 50 });
  this.s.verificacion.verificar(id);
  this.intentar(() => this.s.api.aprobarCaptura(this.coordinador, id));
});

Then('los Patrones {string} reciben una notificación push con alerta sonora y un correo electrónico en un máximo de {int} minuto',
  function (nombres, minutos) {
    const registradoEn = this.cierreActual.registradoEn;
    for (const patron of lista(nombres)) {
      const push = this.s.notificaciones.recibidas(patron, { canal: 'push', tipo: 'CIERRE_NORMATIVO' });
      const correo = this.s.notificaciones.recibidas(patron, { canal: 'correo', tipo: 'CIERRE_NORMATIVO' });
      assert.strictEqual(push.length, 1, `${patron} no recibió la notificación push`);
      assert.strictEqual(push[0].sonido, true, 'La notificación push no tiene alerta sonora');
      assert.strictEqual(correo.length, 1, `${patron} no recibió el correo`);
      assert.ok((push[0].en - registradoEn) / MINUTO <= minutos);
    }
  });

Then('el Coordinador recibe la confirmación de que se notificó a los Patrones', function () {
  const avisos = this.s.notificaciones.avisosEnPantalla.filter((a) => a.destinatario === this.coordinadorActual && a.tipo === 'PATRONES_NOTIFICADOS');
  assert.strictEqual(avisos.length, 1);
});

Then('el Coordinador recibe el aviso de que no hay capturas afectadas', function () {
  const avisos = this.s.notificaciones.avisosEnPantalla.filter((a) => a.destinatario === this.coordinadorActual && a.tipo === 'SIN_CAPTURAS_AFECTADAS');
  assert.strictEqual(avisos.length, 1);
});

Then('los Patrones {string} reciben el aviso del cierre por correo electrónico como respaldo', function (nombres) {
  for (const patron of lista(nombres)) {
    const fallidas = this.s.notificaciones.fallidas.filter((n) => n.destinatario === patron && n.canal === 'push');
    const correos = this.s.notificaciones.recibidas(patron, { canal: 'correo', tipo: 'CIERRE_NORMATIVO' });
    assert.strictEqual(fallidas.length, 1, `No se registró la falla del push para ${patron}`);
    assert.strictEqual(correos.length, 1, `${patron} no recibió el correo de respaldo`);
    assert.strictEqual(correos[0].respaldo, true);
  }
});
