# language: es
@HU-03 @VerificacionDeCapturas
Característica: HU-03 Revisar manualmente una captura pendiente de revisión
  Como Coordinador
  Quiero revisar manualmente las capturas en estado "Pendiente de revisión manual" de mi cooperativa
  Para aprobarlas o rechazarlas con la evidencia completa

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que la cooperativa tiene estas capturas:
      | código | Patrón      | especie | fecha      | estado                       | motivo                  |
      | C-01   | Juan Quispe | Pota    | 2026-11-24 | Pendiente de revisión manual | Confianza menor al 80 % |

  Escenario: Visualización de capturas pendientes de revisión
    Cuando el Coordinador accede a la bandeja de revisión manual
    Entonces ve la captura "C-01" con su foto, especie, talla, cantidad y ubicación
    Y ve el resultado de la verificación automática con el motivo "Confianza menor al 80 %"

  Escenario: Aprobación de la captura
    Cuando el Coordinador aprueba la captura "C-01"
    Entonces la captura "C-01" queda en estado "Aprobada"
    Y la captura "C-01" ya puede formar parte de un lote
    Y la auditoría registra "Captura aprobada" con fecha, hora y el responsable "Carlos Ruiz"

  Escenario: Rechazo de la captura con motivo
    Cuando el Coordinador rechaza la captura "C-01" con el motivo "La especie de la foto no es pota"
    Entonces la captura "C-01" queda en estado "Rechazada"
    Y el Patrón "Juan Quispe" recibe una notificación con el motivo "La especie de la foto no es pota"
    Y la auditoría registra "Captura rechazada" con fecha, hora y el responsable "Carlos Ruiz"

  Escenario: Intento de rechazar sin indicar motivo
    Cuando el Coordinador intenta rechazar la captura "C-01" sin indicar un motivo
    Entonces el sistema bloquea la acción y solicita indicar el motivo antes de confirmar
    Y la captura "C-01" sigue en estado "Pendiente de revisión manual"

  Escenario: Captura afectada por un cierre normativo mientras aún no ha sido revisada
    Dado que el Coordinador registró un cierre de emergencia de "Pota" del "2026-11-20" al "2026-12-20" con la resolución "RM-0002-2026-PRODUCE"
    Cuando el Coordinador accede a la bandeja de revisión manual
    Entonces ve que la captura "C-01" está afectada por el cierre de la resolución "RM-0002-2026-PRODUCE"
