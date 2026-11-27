'use strict';

/**
 * Raíz de composición del modelo de referencia de CertiFish. Conecta los nueve Bounded
 * Contexts como en el diagrama de contenedores C4: consultas directas entre servicios y
 * eventos por el bus (RabbitMQ en la arquitectura real).
 */

const { RelojSimulado, BusDeEventos } = require('./compartido');
const { ServicioCooperativas } = require('./gestion-cooperativas');
const { ServicioUsuarios } = require('./usuarios-acceso');
const { ServicioRegistroCapturas } = require('./registro-capturas');
const { ServicioVerificacion } = require('./verificacion-capturas');
const { ServicioIASimulado } = require('./verificacion-capturas/ia-simulada');
const { ServicioCierres } = require('./cierres-normativos');
const { ServicioLotes } = require('./trazabilidad-lotes');
const { ServicioCertificacion } = require('./certificacion-lotes');
const {
  ServicioNotificaciones, ClienteFirebaseSimulado, ClienteSendGridSimulado, AdaptadorPushFirebase, AdaptadorCorreoSendGrid,
} = require('./notificaciones');
const { ServicioAuditoria } = require('./auditoria');
const { ApiCertiFish, InterfazCertiFish } = require('./api');

function crearSistema() {
  const reloj = new RelojSimulado();
  const bus = new BusDeEventos();
  const s = { reloj, bus };

  s.auditoria = new ServicioAuditoria({ bus, reloj });
  s.cooperativas = new ServicioCooperativas({ bus });
  s.usuarios = new ServicioUsuarios({ cooperativas: s.cooperativas, reloj, bus });
  s.registro = new ServicioRegistroCapturas({ cooperativas: s.cooperativas, bus, reloj });
  s.ia = new ServicioIASimulado();
  s.verificacion = new ServicioVerificacion({ registro: s.registro, ia: s.ia, bus, reloj });

  s.clienteFirebase = new ClienteFirebaseSimulado();
  s.clienteSendGrid = new ClienteSendGridSimulado();
  s.notificaciones = new ServicioNotificaciones({
    bus, reloj, usuarios: s.usuarios, cooperativas: s.cooperativas,
    push: new AdaptadorPushFirebase(s.clienteFirebase),
    correo: new AdaptadorCorreoSendGrid(s.clienteSendGrid),
  });

  s.cierres = new ServicioCierres({ registro: s.registro, verificacion: s.verificacion, cooperativas: s.cooperativas, bus, reloj });
  s.lotes = new ServicioLotes({ registro: s.registro, verificacion: s.verificacion, bus, reloj });
  s.certificacion = new ServicioCertificacion({ lotes: s.lotes, registro: s.registro, verificacion: s.verificacion, bus, reloj });

  // Consultas entre contextos (HTTP/REST en el C4)
  s.verificacion.cierres = s.cierres;
  s.registro.consultarEstado = (id) => s.verificacion.estadoDe(id);
  s.registro.consultarMotivo = (id) => s.verificacion.motivoDe(id);

  s.api = new ApiCertiFish(s);
  s.interfaz = new InterfazCertiFish(s.usuarios);
  return s;
}

module.exports = { crearSistema };
