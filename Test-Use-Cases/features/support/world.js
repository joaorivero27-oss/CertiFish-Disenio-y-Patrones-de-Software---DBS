'use strict';

const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { crearSistema } = require('../../src/certifish');
const { AplicacionMovil } = require('../../src/app-movil');
const { ROLES } = require('../../src/usuarios-acceso');

const CONTRASENA_DE_PRUEBA = 'Pesca2026*';
const MATRICULAS_CONOCIDAS = { 'Juan Quispe': 'PT-0101', 'Luis Ramos': 'PT-0102', 'Pedro Flores': 'PT-0103' };
const METODO_POR_ESPECIE = { Pota: 'Potera', Perico: 'Espinel', Bonito: 'Cortina', 'Tiburón martillo': 'Espinel' };

function correoDe(nombre) {
  const base = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/\s+/).join('.');
  return `${base}@correo.pe`;
}

/** Convierte "C-01, C-02 y C-03" en ["C-01", "C-02", "C-03"]. */
function lista(texto) {
  return texto.split(/\s*,\s*|\s+y\s+/).map((t) => t.trim()).filter(Boolean);
}

/**
 * Mundo de cada escenario: crea un CertiFish nuevo en memoria y ofrece ayudas para preparar
 * datos de prueba (cooperativas, embarcaciones, usuarios y capturas en un estado dado).
 */
class MundoCertiFish extends World {
  constructor(opciones) {
    super(opciones);
    this.sistema = crearSistema();
    this.apps = new Map();
    this.aliasCapturas = new Map();
    this.aliasLotes = new Map();
    this.estadosSembrados = new Map();
    this.ultimo = undefined;
    this.secuenciaMatriculas = 10;
  }

  /** Ejecuta una acción y guarda su resultado o el error de dominio que produjo. */
  intentar(accion) {
    try {
      const valor = accion();
      this.ultimo = { ok: true, valor, mensaje: valor && valor.mensaje };
    } catch (error) {
      if (!error.codigo) throw error; // un error que no es de dominio es un defecto
      this.ultimo = { ok: false, error, mensaje: error.message };
    }
    return this.ultimo;
  }

  get s() {
    return this.sistema;
  }

  asegurarCooperativa(nombre) {
    return this.s.cooperativas.registrarCooperativa(nombre);
  }

  asegurarEmbarcacion(matricula, cooperativa, opciones = {}) {
    this.asegurarCooperativa(cooperativa);
    return this.s.cooperativas.embarcacion(matricula)
      || this.s.cooperativas.registrarEmbarcacion({ matricula, cooperativa, ...opciones });
  }

  matriculaPara(nombre) {
    if (MATRICULAS_CONOCIDAS[nombre]) return MATRICULAS_CONOCIDAS[nombre];
    this.secuenciaMatriculas += 1;
    return `PT-01${this.secuenciaMatriculas}`;
  }

  asegurarPatron(nombre, { matricula, cooperativa } = {}) {
    const existente = this.s.usuarios.usuarioPorNombre(nombre);
    if (existente) return existente;
    const matriculaFinal = matricula || this.matriculaPara(nombre);
    this.asegurarEmbarcacion(matriculaFinal, cooperativa || this.cooperativaActual);
    return this.s.usuarios.registrar({
      nombre, correo: correoDe(nombre), contrasena: CONTRASENA_DE_PRUEBA, rol: ROLES.PATRON, vinculacion: matriculaFinal,
    });
  }

  asegurarCoordinador(nombre, cooperativa) {
    this.asegurarCooperativa(cooperativa);
    return this.s.usuarios.usuarioPorNombre(nombre) || this.s.usuarios.registrar({
      nombre, correo: correoDe(nombre), contrasena: CONTRASENA_DE_PRUEBA, rol: ROLES.COORDINADOR, vinculacion: cooperativa,
    });
  }

  usuario(nombre) {
    const usuario = this.s.usuarios.usuarioPorNombre(nombre);
    if (!usuario) throw new Error(`No existe el usuario ${nombre} en los datos de prueba`);
    return usuario;
  }

  get coordinador() {
    return this.usuario(this.coordinadorActual);
  }

  appDe(nombre) {
    if (!this.apps.has(nombre)) {
      this.apps.set(nombre, new AplicacionMovil({ api: this.s.api, reloj: this.s.reloj, usuario: this.usuario(nombre) }));
    }
    return this.apps.get(nombre);
  }

  get app() {
    return this.appDe(this.patronActual);
  }

  metodoPara(especie) {
    return METODO_POR_ESPECIE[especie] || 'Potera';
  }

  capturaId(codigo) {
    return this.aliasCapturas.get(codigo) || codigo;
  }

  loteCodigo(alias) {
    return this.aliasLotes.get(alias) || alias;
  }

  estadoDe(codigo) {
    return this.s.verificacion.estadoDe(this.capturaId(codigo));
  }

  /** Crea una captura ya existente en un estado dado (datos de prueba). */
  sembrarCaptura(fila) {
    const patron = fila['Patrón'];
    const matricula = fila['embarcación'] || MATRICULAS_CONOCIDAS[patron];
    const usuario = this.asegurarPatron(patron, { matricula, cooperativa: this.cooperativaActual });
    const id = fila['código'];
    this.s.registro.sembrar({
      id, patron, matricula: usuario.embarcacion, especie: fila.especie, fecha: fila.fecha,
      cantidad: fila.cantidad || '100 kg', metodo: this.metodoPara(fila.especie),
    });
    this.s.verificacion.sembrar({
      id, cooperativa: usuario.cooperativa, patron, estado: fila.estado, motivo: fila.motivo || undefined, tallaCm: 45,
    });
    this.estadosSembrados.set(id, fila.estado);
    return id;
  }

  /** Crea otra cooperativa con su Coordinador, un Patrón y capturas (para HU-04, HU-14 y HU-16). */
  crearOtraCooperativa(nombre, { kg = 900, especie = 'Pota', periodo = '2026-11', conLote = false } = {}) {
    const anterior = this.cooperativaActual;
    this.asegurarCoordinador('Rosa Chunga', nombre);
    this.cooperativaActual = nombre;
    const fila = (codigo, estado) => ({
      'código': codigo, 'Patrón': 'Mario Vílchez', 'embarcación': 'MN-0201', especie, fecha: `${periodo}-15`, cantidad: `${kg} kg`, estado,
    });
    this.sembrarCaptura(fila('M-01', 'Verificada'));
    if (conLote) {
      this.sembrarCaptura(fila('M-02', 'Verificada'));
      this.s.lotes.sembrar({ codigo: 'L-900', cooperativa: nombre, especie, capturas: ['M-01', 'M-02'] });
    }
    this.cooperativaActual = anterior;
  }
}

setWorldConstructor(MundoCertiFish);

module.exports = { MundoCertiFish, lista, correoDe, CONTRASENA_DE_PRUEBA };
