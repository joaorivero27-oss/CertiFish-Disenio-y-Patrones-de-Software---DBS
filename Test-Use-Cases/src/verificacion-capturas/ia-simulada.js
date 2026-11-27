'use strict';

/**
 * Doble de prueba del servicio de inteligencia artificial (AWS SageMaker).
 * Cada escenario programa qué responde; si se piden más análisis que respuestas
 * programadas, repite la última.
 */
class ServicioIASimulado {
  constructor() {
    this.respuestas = [];
    this.llamadas = 0;
  }

  programar(...respuestas) {
    this.respuestas = respuestas;
    this.llamadas = 0;
  }

  responder({ latenciaSegundos = 3, especie, tallaCm, cantidadCoherente = true, confianza }) {
    this.programar({ respondio: true, latenciaSegundos, especie, tallaCm, cantidadCoherente, confianza });
  }

  noResponder() {
    this.programar({ respondio: false });
  }

  analizar() {
    const respuesta = this.respuestas[Math.min(this.llamadas, this.respuestas.length - 1)];
    this.llamadas += 1;
    if (!respuesta) throw new Error('El doble de prueba de la IA no tiene respuestas programadas.');
    return { ...respuesta };
  }
}

module.exports = { ServicioIASimulado };
