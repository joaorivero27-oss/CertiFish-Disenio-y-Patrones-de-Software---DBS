'use strict';

const assert = require('assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { lista } = require('../support/world');
const { ROLES, MENSAJE_CREDENCIALES } = require('../../src/usuarios-acceso');
const { MINUTO } = require('../../src/compartido');

// Bounded Context Usuarios y Acceso: HU-13 y HU-14

// ---------- HU-13 Registro y autenticación ----------

When('{string} se registra con el correo {string}, una contraseña válida, el rol {string} y la vinculación a {string}',
  function (nombre, correo, rol, vinculacion) {
    this.intentar(() => this.s.usuarios.registrar({ nombre, correo, contrasena: 'Pesca2026*', rol, vinculacion }));
  });

Then('el sistema crea la cuenta con el rol {string}', function (rol) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  assert.strictEqual(this.s.usuarios.cuenta(this.ultimo.valor.correo).rol, rol);
});

Given('que {string} tiene una cuenta de Patrón de embarcación con el correo {string} y la contraseña {string}',
  function (nombre, correo, contrasena) {
    this.s.usuarios.registrar({ nombre, correo, contrasena, rol: ROLES.PATRON, vinculacion: 'PT-0101' });
  });

When('inicia sesión con el correo {string} y la contraseña {string}', function (correo, contrasena) {
  this.intentar(() => this.s.usuarios.autenticar(correo, contrasena));
  if (this.ultimo.ok) this.sesion = this.ultimo.valor;
});

Then('el sistema le concede acceso a las funcionalidades del rol {string}', function (rol) {
  assert.ok(this.ultimo.ok, this.ultimo.mensaje);
  assert.strictEqual(this.sesion.rol, rol);
  assert.deepStrictEqual(this.s.interfaz.menu(this.sesion), this.s.usuarios.funcionalidadesDe({ rol }));
});

Then('el mensaje no indica si el error está en el usuario o en la contraseña', function () {
  assert.strictEqual(this.ultimo.mensaje, MENSAJE_CREDENCIALES);
  assert.strictEqual(this.ultimo.error.codigo, 'CREDENCIALES_INCORRECTAS');
});

Then('el sistema impide el registro y explica que el correo ya está registrado', function () {
  assert.strictEqual(this.ultimo.ok, false);
  assert.strictEqual(this.ultimo.mensaje, 'El correo ya está registrado.');
});

Then('el sistema impide el registro y explica que la {word} indicada no existe', function (entidad) {
  assert.strictEqual(this.ultimo.ok, false);
  assert.strictEqual(this.ultimo.mensaje, `La ${entidad} indicada no existe.`);
});

When('{string} intenta registrarse sin completar el correo ni la contraseña', function (nombre) {
  this.intentar(() => this.s.usuarios.registrar({ nombre, rol: ROLES.PATRON, vinculacion: 'PT-0101' }));
});

Then('el sistema impide el registro e indica que faltan {string}', function (datos) {
  assert.strictEqual(this.ultimo.ok, false);
  assert.deepStrictEqual(this.ultimo.error.datos.faltantes, lista(datos));
});

Given('que falló la autenticación {int} veces seguidas con el correo {string}', function (veces, correo) {
  this.correoBloqueado = correo;
  for (let i = 0; i < veces; i += 1) {
    this.intentar(() => this.s.usuarios.autenticar(correo, 'ClaveEquivocada'));
    assert.strictEqual(this.ultimo.mensaje, MENSAJE_CREDENCIALES);
  }
  this.quintoIntento = this.s.reloj.ahora();
});

When('vuelve a intentarlo {int} minutos después del quinto intento fallido', function (minutos) {
  const transcurrido = this.s.reloj.ahora() - this.quintoIntento;
  this.s.reloj.avanzar(minutos * MINUTO - transcurrido);
  this.intentar(() => this.s.usuarios.autenticar(this.correoBloqueado, 'Pesca2026*'));
});

Then('la cuenta sigue bloqueada hasta {int} minutos después del quinto intento fallido, sin ampliar el plazo', function (minutos) {
  assert.strictEqual(this.ultimo.error.codigo, 'CUENTA_BLOQUEADA');
  const cuenta = this.s.usuarios.cuenta(this.correoBloqueado);
  assert.strictEqual(cuenta.bloqueadaHasta, this.quintoIntento.getTime() + minutos * MINUTO);
});

When('pasan {int} minutos desde el quinto intento fallido', function (minutos) {
  const transcurrido = this.s.reloj.ahora() - this.quintoIntento;
  this.s.reloj.avanzar(minutos * MINUTO - transcurrido);
});

Then('el contador de intentos fallidos vuelve a cero', function () {
  const cuenta = this.s.usuarios.cuenta(this.correoBloqueado);
  assert.strictEqual(cuenta.intentosFallidos, 0);
  assert.strictEqual(cuenta.bloqueadaHasta, null);
});

// ---------- HU-14 Restricción por rol ----------

function iniciarSesion(mundo, nombre) {
  const usuario = mundo.usuario(nombre);
  mundo.sesion = mundo.s.usuarios.autenticar(usuario.correo, 'Pesca2026*');
}

When('{string} inicia sesión y accede al sistema', function (nombre) {
  iniciarSesion(this, nombre);
  this.menu = this.s.interfaz.menu(this.sesion);
});

Then('solo ve estas funcionalidades:', function (tabla) {
  assert.deepStrictEqual(this.menu, tabla.hashes().map((f) => f.funcionalidad));
});

Given('que {string} inició sesión', function (nombre) {
  iniciarSesion(this, nombre);
});

/** Acción real que se intenta ejecutar con la sesión actual. */
function accion(mundo, funcionalidad) {
  const api = mundo.s.api;
  const sesion = mundo.sesion;
  const acciones = {
    'Consolidar lote': () => api.consolidarLote(sesion, ['C-01']),
    'Registrar cierre normativo': () => api.registrarCierre(sesion, {
      tipo: 'cierre de emergencia', especies: ['Pota'], inicio: '2026-11-20', fin: '2026-12-20', resolucion: 'RM-0001-2026-PRODUCE',
    }),
    'Emitir certificado': () => api.emitirCertificado(sesion, 'L-001'),
    'Registrar captura': () => api.registrarCaptura(sesion, {
      idLocal: 'x-1', especie: 'Pota', cantidad: '100 kg', metodo: 'Potera', fotos: [{ nombre: 'f.jpg' }],
      gps: { lat: -5.08, lon: -81.11 }, fechaHora: '2026-11-26T08:00:00',
    }),
  };
  if (!acciones[funcionalidad]) throw new Error(`Acción no definida en la prueba: ${funcionalidad}`);
  return acciones[funcionalidad];
}

function contarEfectos(mundo) {
  return {
    lotes: mundo.s.lotes.lotes.size,
    cierres: mundo.s.cierres.cierres.length,
    certificados: mundo.s.certificacion.certificados.size,
    capturas: mundo.s.registro.capturas.size,
  };
}

When('intenta {string} desde la interfaz', function (funcionalidad) {
  this.efectosAntes = contarEfectos(this);
  this.intentar(() => this.s.interfaz.abrir(this.sesion, funcionalidad, accion(this, funcionalidad)));
});

When('invoca directamente la operación {string} sin pasar por la interfaz', function (operacion) {
  this.efectosAntes = contarEfectos(this);
  this.intentar(accion(this, operacion));
});

Then('el servidor rechaza la solicitud con el mensaje {string}', function (mensaje) {
  assert.strictEqual(this.ultimo.ok, false);
  assert.strictEqual(this.ultimo.error.codigo, 'NO_AUTORIZADO');
  assert.strictEqual(this.ultimo.mensaje, mensaje);
});

Then('no se ejecuta la acción {string}', function (funcionalidad) {
  assert.strictEqual(this.ultimo.ok, false, `Se ejecutó "${funcionalidad}"`);
  assert.deepStrictEqual(contarEfectos(this), this.efectosAntes);
});

Given('que la cooperativa {string} tiene capturas, embarcaciones y lotes registrados', function (cooperativa) {
  this.crearOtraCooperativa(cooperativa, { conLote: true });
});

When('intenta consultar las capturas, embarcaciones y lotes de la cooperativa {string}', function (cooperativa) {
  const api = this.s.api;
  this.consultas = [
    () => api.historialDeCooperativa(this.sesion, cooperativa),
    () => api.embarcacionesDe(this.sesion, cooperativa),
    () => api.lotesDe(this.sesion, cooperativa),
  ].map((consulta) => this.intentar(consulta));
});

Given('que el Patrón {string} tiene capturas registradas', function (nombre) {
  this.sembrarCaptura({ 'código': 'C-21', 'Patrón': nombre, especie: 'Pota', fecha: '2026-11-20', estado: 'Verificada' });
  this.sembrarCaptura({ 'código': 'C-22', 'Patrón': nombre, especie: 'Pota', fecha: '2026-11-21', estado: 'Registrada' });
});

When('intenta consultar las capturas de {string}', function (patron) {
  this.consultas = [this.intentar(() => this.s.api.capturasDePatron(this.sesion, patron))];
});

Then('el sistema deniega el acceso y no muestra esos datos', function () {
  for (const resultado of this.consultas) {
    assert.strictEqual(resultado.ok, false, 'Se mostraron datos ajenos');
    assert.strictEqual(resultado.error.codigo, 'NO_AUTORIZADO');
    assert.strictEqual(resultado.valor, undefined);
  }
});
