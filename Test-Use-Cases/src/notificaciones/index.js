'use strict';

const { MINUTO } = require('../compartido');

/**
 * Bounded Context Notificaciones (Generic). Patrón Adapter (DC-01b): el servicio depende de
 * la interfaz CanalDeNotificacion; los adaptadores traducen a las API de Firebase Cloud
 * Messaging (push) y SendGrid (correo). En las pruebas, los clientes externos son simulados.
 */

class ClienteFirebaseSimulado {
  constructor() { this.disponible = true; this.enviados = []; }
  send(token, payload) {
    if (!this.disponible) throw new Error('Firebase Cloud Messaging no respondió');
    this.enviados.push({ token, ...payload });
  }
}

class ClienteSendGridSimulado {
  constructor() { this.disponible = true; this.enviados = []; }
  sendMail(correo) {
    if (!this.disponible) throw new Error('SendGrid no respondió');
    this.enviados.push(correo);
  }
}

class AdaptadorPushFirebase {
  constructor(cliente) { this.cliente = cliente; this.canal = 'push'; }
  enviar(destinatario, n) {
    this.cliente.send(destinatario.token, { title: n.asunto, body: n.mensaje, sound: n.sonido ? 'alerta' : undefined });
  }
}

class AdaptadorCorreoSendGrid {
  constructor(cliente) { this.cliente = cliente; this.canal = 'correo'; }
  enviar(destinatario, n) {
    this.cliente.sendMail({ to: destinatario.correo, subject: n.asunto, text: n.mensaje });
  }
}

const VENTANA_AGRUPACION_MINUTOS = 10;

class ServicioNotificaciones {
  constructor({ bus, reloj, usuarios, cooperativas, push, correo }) {
    this.bus = bus;
    this.reloj = reloj;
    this.usuarios = usuarios;
    this.cooperativas = cooperativas;
    this.canalPush = push;
    this.canalCorreo = correo;
    this.entregadas = [];
    this.fallidas = [];
    this.avisosEnPantalla = [];
    this.ventanas = new Map();

    bus.suscribir('CIERRE_REGISTRADO', (e) => this.alRegistrarCierre(e));
    bus.suscribir('CAPTURAS_PENDIENTES_CONFIRMACION', (e) => this.avisarPendientesDeConfirmacion(e));
    bus.suscribir('SIN_CAPTURAS_AFECTADAS', (e) => this.avisarEnPantalla(this.usuarios.coordinadorDe(e.cooperativa),
      `No hay capturas afectadas por el cierre de la resolución ${e.resolucion}.`, 'SIN_CAPTURAS_AFECTADAS'));
    bus.suscribir('CAPTURA_PENDIENTE_REVISION', (e) => this.alertarRevisionManual(e));
    bus.suscribir('CAPTURA_RECHAZADA', (e) => this.notificar(e.patron, { tipo: 'CAPTURA_RECHAZADA', asunto: 'Tu captura fue rechazada', mensaje: e.motivo }));
    bus.suscribir('CAPTURA_RECHAZADA_POR_CIERRE', (e) => this.notificar(e.patron, { tipo: 'CAPTURA_RECHAZADA', asunto: 'Tu captura fue rechazada', mensaje: e.motivo }));
  }

  destinatario(nombre) {
    const usuario = this.usuarios.usuarioPorNombre(nombre);
    return { nombre, correo: usuario.correo, token: `token-${usuario.correo}` };
  }

  /** Push y correo; si el push falla, el correo queda como respaldo. */
  notificar(nombre, notificacion) {
    const destinatario = this.destinatario(nombre);
    const en = this.reloj.ahora();
    let pushFallo = false;
    try {
      this.canalPush.enviar(destinatario, notificacion);
      this.entregadas.push({ ...notificacion, destinatario: nombre, canal: 'push', en });
    } catch (error) {
      pushFallo = true;
      this.fallidas.push({ ...notificacion, destinatario: nombre, canal: 'push', en, error: error.message });
      this.bus.publicar('ENVIO_PUSH_FALLIDO', { destinatario: nombre });
    }
    this.canalCorreo.enviar(destinatario, notificacion);
    this.entregadas.push({ ...notificacion, destinatario: nombre, canal: 'correo', en, respaldo: pushFallo });
  }

  avisarEnPantalla(nombre, mensaje, tipo) {
    this.avisosEnPantalla.push({ destinatario: nombre, mensaje, tipo, en: this.reloj.ahora() });
  }

  alRegistrarCierre({ cooperativa, resolucion }) {
    const patrones = this.cooperativas.patronesDe(cooperativa);
    for (const patron of patrones) {
      this.notificar(patron, {
        tipo: 'CIERRE_NORMATIVO',
        asunto: 'Nuevo cierre normativo de PRODUCE',
        mensaje: `Se registró el cierre de la resolución ${resolucion}. Revisa tus faenas.`,
        sonido: true,
      });
    }
    this.avisarEnPantalla(this.usuarios.coordinadorDe(cooperativa),
      `Se notificó el cierre a ${patrones.length} Patrones de embarcación.`, 'PATRONES_NOTIFICADOS');
    this.bus.publicar('PATRONES_NOTIFICADOS', { cooperativa, cantidad: patrones.length });
  }

  avisarPendientesDeConfirmacion({ cooperativa, capturas }) {
    const coordinador = this.usuarios.coordinadorDe(cooperativa);
    this.notificar(coordinador, {
      tipo: 'PENDIENTES_DE_CONFIRMACION',
      asunto: `Tienes ${capturas.length} capturas "Pendiente de confirmación"`,
      mensaje: `Capturas por confirmar: ${capturas.join(', ')}.`,
      cantidad: capturas.length,
      capturas: [...capturas],
    });
  }

  /**
   * HU-12: la primera alerta sale de inmediato (máximo 1 minuto). Las capturas que quedan
   * pendientes dentro de los 10 minutos siguientes se agrupan en una sola notificación.
   */
  alertarRevisionManual({ id, cooperativa, motivo }) {
    const coordinador = this.usuarios.coordinadorDe(cooperativa);
    const ventana = this.ventanas.get(coordinador);
    if (ventana) {
      ventana.pendientes.push({ id, motivo });
      return;
    }
    this.notificar(coordinador, {
      tipo: 'REVISION_MANUAL', asunto: 'Captura pendiente de revisión manual', mensaje: `Captura ${id}: ${motivo}`, capturas: [id], motivo,
    });
    const nueva = { pendientes: [] };
    this.ventanas.set(coordinador, nueva);
    this.reloj.programar(VENTANA_AGRUPACION_MINUTOS * MINUTO, () => {
      this.ventanas.delete(coordinador);
      if (nueva.pendientes.length) {
        this.notificar(coordinador, {
          tipo: 'REVISION_MANUAL_CONSOLIDADA',
          asunto: `${nueva.pendientes.length} capturas pendientes de revisión manual`,
          mensaje: nueva.pendientes.map((p) => `${p.id}: ${p.motivo}`).join('; '),
          capturas: nueva.pendientes.map((p) => p.id),
        });
      }
    });
  }

  recibidas(nombre, filtro = {}) {
    return this.entregadas.filter((n) => n.destinatario === nombre
      && (!filtro.canal || n.canal === filtro.canal)
      && (!filtro.tipo || n.tipo === filtro.tipo));
  }
}

module.exports = {
  ServicioNotificaciones,
  ClienteFirebaseSimulado,
  ClienteSendGridSimulado,
  AdaptadorPushFirebase,
  AdaptadorCorreoSendGrid,
};
