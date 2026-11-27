# language: es
@HU-08 @TrazabilidadDeLotes
Característica: HU-08 Consolidar capturas en un lote
  Como Coordinador
  Quiero consolidar en un lote varias capturas de mi cooperativa que pertenezcan a una sola especie
  Para preparar la emisión del certificado que entregaré a la empresa exportadora

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que la cooperativa tiene estas capturas:
      | código | Patrón      | especie | fecha      | estado                       |
      | C-01   | Juan Quispe | Pota    | 2026-11-22 | Verificada                   |
      | C-02   | Luis Ramos  | Pota    | 2026-11-24 | Aprobada                     |
      | C-03   | Juan Quispe | Perico  | 2026-11-22 | Verificada                   |
      | C-04   | Luis Ramos  | Pota    | 2026-11-23 | Registrada                   |
      | C-05   | Juan Quispe | Pota    | 2026-11-23 | Pendiente de revisión manual |
      | C-06   | Luis Ramos  | Pota    | 2026-11-23 | Pendiente de confirmación    |
      | C-07   | Juan Quispe | Pota    | 2026-11-21 | Rechazada                    |

  Escenario: Consolidación de capturas en un lote
    Cuando el Coordinador selecciona las capturas "C-01 y C-02" y confirma la consolidación
    Entonces el sistema agrupa las capturas "C-01 y C-02" en un lote de "Pota"
    Y el lote queda en estado "Consolidado"

  Esquema del escenario: Captura no validada
    Cuando el Coordinador selecciona las capturas "C-01 y <captura>" y confirma la consolidación
    Entonces el sistema no consolida el lote
    Y el sistema muestra el mensaje "Solo se pueden consolidar capturas verificadas o aprobadas."

    Ejemplos:
      | captura | estado de la captura         |
      | C-04    | Registrada                   |
      | C-05    | Pendiente de revisión manual |
      | C-06    | Pendiente de confirmación    |
      | C-07    | Rechazada                    |

  Escenario: Capturas de distintas especies
    Cuando el Coordinador selecciona las capturas "C-01 y C-03" y confirma la consolidación
    Entonces el sistema no consolida el lote
    Y el sistema muestra el mensaje "Un lote solo puede contener capturas de una misma especie."

  Escenario: Captura que ya pertenece a otro lote
    Dado que el Coordinador consolidó las capturas "C-01 y C-02" en el lote "L-001"
    Cuando el Coordinador arma un nuevo lote
    Entonces las capturas "C-01 y C-02" no aparecen entre las capturas disponibles para consolidar
