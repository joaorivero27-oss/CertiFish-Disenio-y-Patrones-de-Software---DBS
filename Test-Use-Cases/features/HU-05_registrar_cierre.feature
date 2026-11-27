# language: es
@HU-05 @CierresNormativos
Característica: HU-05 Registrar un cierre o actualización normativa de PRODUCE
  Como Coordinador
  Quiero registrar un cierre de emergencia o una actualización del límite de captura que PRODUCE me informó
  Para que el sistema identifique las capturas afectadas de mi cooperativa y notifique a mis Patrones de embarcación

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"

  Esquema del escenario: Registro de un cierre o actualización normativa
    Cuando el Coordinador ingresa el tipo "<tipo>", la especie "Pota", el periodo del "2026-11-20" al "2026-12-20" y la resolución "RM-0001-2026-PRODUCE"
    Entonces el sistema permite continuar con el registro

    Ejemplos:
      | tipo                    |
      | cierre de emergencia    |
      | actualización de límite |

  Escenario: Datos adicionales obligatorios según la especie
    Cuando el Coordinador ingresa el tipo "cierre de emergencia", la especie "Perico", el periodo del "2026-11-20" al "2026-12-20" y la resolución "RM-0003-2026-PRODUCE"
    Entonces el sistema exige también la zona regulatoria y la capacidad de bodega como datos obligatorios

  Escenario: Confirmación del registro
    Dado que el Coordinador completó todos los datos obligatorios de un cierre de emergencia de "Pota"
    Cuando el Coordinador confirma el registro del cierre
    Entonces el sistema guarda el cierre normativo asociado a la fecha, la hora y el Coordinador "Carlos Ruiz"
    Y la auditoría registra "Cierre normativo registrado" con fecha, hora y el responsable "Carlos Ruiz"

  Esquema del escenario: Falta un dato obligatorio
    Dado que el Coordinador completó los datos de un cierre de "<especie>" sin el dato "<dato faltante>"
    Cuando el Coordinador confirma el registro del cierre
    Entonces el sistema no guarda el cierre normativo
    Y el sistema muestra el mensaje "Debes completar todos los campos obligatorios."

    Ejemplos:
      | especie | dato faltante       |
      | Pota    | tipo                |
      | Pota    | periodo             |
      | Pota    | resolución          |
      | Perico  | zona regulatoria    |
      | Perico  | capacidad de bodega |

  Escenario: Registro de una resolución que modifica a una ya registrada
    Dado que el Coordinador registró un cierre de emergencia de "Pota" del "2026-11-20" al "2026-12-20" con la resolución "RM-0001-2026-PRODUCE"
    Cuando el Coordinador registra la resolución "RM-0004-2026-PRODUCE" que extiende ese cierre hasta el "2027-01-10"
    Entonces el sistema guarda la resolución "RM-0004-2026-PRODUCE" como un registro adicional
    Y la resolución "RM-0001-2026-PRODUCE" se conserva sin cambios en el historial
