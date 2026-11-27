'use strict';

const { ErrorDeDominio, fechaISO } = require('../compartido');

/** Bounded Context Gestión de Cooperativas (Supporting): cooperativas, embarcaciones y permisos. */

class Embarcacion {
  constructor({ matricula, cooperativa, permisoVigenteHasta, zona = 'Norte', capacidadBodega = 8 }) {
    this.matricula = matricula;
    this.cooperativa = cooperativa;
    this.permisoVigenteHasta = permisoVigenteHasta;
    this.zona = zona;
    this.capacidadBodega = capacidadBodega;
  }

  permisoVigenteEl(fecha) {
    return fechaISO(fecha) <= this.permisoVigenteHasta;
  }
}

class ServicioCooperativas {
  constructor({ bus }) {
    this.bus = bus;
    this.cooperativas = new Map();
    this.embarcaciones = new Map();
    this.patronPorEmbarcacion = new Map();
  }

  registrarCooperativa(nombre) {
    if (!this.cooperativas.has(nombre)) {
      this.cooperativas.set(nombre, { nombre });
      this.bus.publicar('COOPERATIVA_REGISTRADA', { cooperativa: nombre });
    }
    return this.cooperativas.get(nombre);
  }

  registrarEmbarcacion({ matricula, cooperativa, permisoVigenteHasta = '2027-12-31', zona, capacidadBodega }) {
    if (!this.cooperativas.has(cooperativa)) {
      throw new ErrorDeDominio('La cooperativa indicada no existe.', 'COOPERATIVA_INEXISTENTE');
    }
    const embarcacion = new Embarcacion({ matricula, cooperativa, permisoVigenteHasta, zona, capacidadBodega });
    this.embarcaciones.set(matricula, embarcacion);
    this.bus.publicar('EMBARCACION_REGISTRADA', { matricula, cooperativa });
    return embarcacion;
  }

  asociarPatron(patron, matricula) {
    this.patronPorEmbarcacion.set(matricula, patron);
    this.bus.publicar('PATRON_ASOCIADO_A_EMBARCACION', { patron, matricula });
  }

  existeCooperativa(nombre) {
    return this.cooperativas.has(nombre);
  }

  existeEmbarcacion(matricula) {
    return this.embarcaciones.has(matricula);
  }

  embarcacion(matricula) {
    return this.embarcaciones.get(matricula);
  }

  embarcacionDe(patron) {
    for (const [matricula, nombre] of this.patronPorEmbarcacion) {
      if (nombre === patron) return this.embarcaciones.get(matricula);
    }
    return undefined;
  }

  patronesDe(cooperativa) {
    const patrones = [];
    for (const [matricula, patron] of this.patronPorEmbarcacion) {
      if (this.embarcaciones.get(matricula).cooperativa === cooperativa) patrones.push(patron);
    }
    return patrones;
  }

  embarcacionesDe(cooperativa) {
    return [...this.embarcaciones.values()].filter((e) => e.cooperativa === cooperativa);
  }
}

module.exports = { ServicioCooperativas, Embarcacion };
