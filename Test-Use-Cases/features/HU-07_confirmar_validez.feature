# language: es
@HU-07 @VerificacionDeCapturas
Característica: HU-07 Confirmar la validez de capturas pendientes de confirmación
  Como Coordinador
  Quiero revisar las capturas "Pendiente de confirmación" por un cierre normativo y confirmar si siguen siendo válidas
  Para decidir cuáles pueden incluirse en un lote

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que la cooperativa tiene estas capturas:
      | código | Patrón      | especie | fecha      | estado     |
      | C-01   | Juan Quispe | Pota    | 2026-11-22 | Verificada |
      | C-02   | Luis Ramos  | Pota    | 2026-11-24 | Aprobada   |
    Y que el Coordinador registró un cierre de emergencia de "Pota" del "2026-11-20" al "2026-12-20" con la resolución "RM-0001-2026-PRODUCE"

  Esquema del escenario: Confirmación de validez de una captura pendiente de confirmación
    Cuando el Coordinador revisa la captura "<código>" junto con el cierre que la afectó y confirma que sigue siendo válida
    Entonces la captura "<código>" queda en estado "<estado anterior>"
    Y la auditoría registra "Validez de captura confirmada" con fecha, hora y el responsable "Carlos Ruiz"

    Ejemplos:
      | código | estado anterior |
      | C-01   | Verificada      |
      | C-02   | Aprobada        |

  Escenario: La captura ya no es válida
    Cuando el Coordinador revisa la captura "C-01" junto con el cierre que la afectó y determina que ya no es válida
    Entonces la captura "C-01" queda en estado "Rechazada" con el motivo "cierre normativo"
    Y la auditoría registra "Captura rechazada por cierre normativo" con fecha, hora y el responsable "Carlos Ruiz"

  Escenario: Bloqueo del lote mientras la captura no se resuelve
    Dado que la captura "C-02" forma parte del lote "L-001" en estado "Consolidado"
    Cuando el Coordinador solicita emitir el certificado del lote "L-001"
    Entonces el sistema impide la emisión porque la captura "C-02" está en estado "Pendiente de confirmación"
    Y después de 24 horas la captura "C-02" sigue en estado "Pendiente de confirmación", porque solo el Coordinador decide su validez
