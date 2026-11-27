'use strict';

/**
 * Piezas compartidas por todos los Bounded Contexts del modelo de referencia:
 * reloj simulado, bus de eventos (equivalente a RabbitMQ) y errores de dominio.
 */

class ErrorDeDominio extends Error {
  constructor(mensaje, codigo = 'ERROR_DE_DOMINIO', datos = {}) {
    super(mensaje);
    this.name = 'ErrorDeDominio';
    this.codigo = codigo;
    this.datos = datos;
  }
}

class ErrorDeAutorizacion extends ErrorDeDominio {
  constructor() {
    super('No tienes autorización para acceder a esta sección.', 'NO_AUTORIZADO');
    this.name = 'ErrorDeAutorizacion';
  }
}

/** Reloj controlado por las pruebas: permite medir plazos (8 s, 1 min, 1 h, 2 h, 15 min). */
class RelojSimulado {
  constructor(inicio = '2026-11-26T08:00:00') {
    this.actual = new Date(inicio);
    this.tareas = [];
  }

  ahora() {
    return new Date(this.actual.getTime());
  }

  programar(milisegundos, accion) {
    this.tareas.push({ en: this.actual.getTime() + milisegundos, accion });
  }

  avanzarSegundos(segundos) {
    this.avanzar(segundos * 1000);
  }

  avanzarMinutos(minutos) {
    this.avanzar(minutos * 60 * 1000);
  }

  avanzar(milisegundos) {
    const fin = this.actual.getTime() + milisegundos;
    for (;;) {
      this.tareas.sort((a, b) => a.en - b.en);
      const siguiente = this.tareas[0];
      if (!siguiente || siguiente.en > fin) break;
      this.tareas.shift();
      this.actual = new Date(siguiente.en);
      siguiente.accion();
    }
    this.actual = new Date(fin);
  }
}

/** Bus de eventos en memoria. Los eventos usan MAYÚSCULAS_CON_GUION_BAJO, como en el C4. */
class BusDeEventos {
  constructor() {
    this.suscriptores = new Map();
    this.suscriptoresGenerales = [];
    this.publicados = [];
  }

  suscribir(evento, manejador) {
    if (!this.suscriptores.has(evento)) this.suscriptores.set(evento, []);
    this.suscriptores.get(evento).push(manejador);
  }

  suscribirATodos(manejador) {
    this.suscriptoresGenerales.push(manejador);
  }

  publicar(evento, datos = {}) {
    this.publicados.push({ evento, datos });
    for (const manejador of this.suscriptoresGenerales) manejador(evento, datos);
    for (const manejador of this.suscriptores.get(evento) || []) manejador(datos);
  }
}

const MINUTO = 60 * 1000;

function fechaISO(fecha) {
  const f = new Date(fecha);
  const mes = String(f.getMonth() + 1).padStart(2, '0');
  const dia = String(f.getDate()).padStart(2, '0');
  return `${f.getFullYear()}-${mes}-${dia}`;
}

module.exports = {
  ErrorDeDominio,
  ErrorDeAutorizacion,
  RelojSimulado,
  BusDeEventos,
  MINUTO,
  fechaISO,
};
