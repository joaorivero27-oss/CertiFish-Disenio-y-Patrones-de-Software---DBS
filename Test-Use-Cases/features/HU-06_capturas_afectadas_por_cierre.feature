# language: es
@HU-06 @CierresNormativos @Notificaciones
Característica: HU-06 Identificar capturas afectadas por un cierre y notificar a los Patrones de embarcación
  Como Coordinador
  Quiero que, al registrar un cierre, el sistema identifique las capturas de mi cooperativa que podrían verse afectadas y notifique a mis Patrones
  Para confirmar la validez de cada una antes de incluirla en un lote

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que la cooperativa tiene estas capturas:
      | código | Patrón      | especie | fecha      | estado                       |
      | C-01   | Juan Quispe | Pota    | 2026-11-22 | Verificada                   |
      | C-02   | Luis Ramos  | Pota    | 2026-11-24 | Aprobada                     |
      | C-03   | Juan Quispe | Perico  | 2026-11-22 | Verificada                   |
      | C-04   | Luis Ramos  | Pota    | 2026-11-10 | Verificada                   |
      | C-05   | Juan Quispe | Pota    | 2026-11-23 | Pendiente de revisión manual |
    Y que la captura "C-02" forma parte del lote "L-001" en estado "Consolidado"

  Escenario: Notificación a los Patrones
    Cuando el Coordinador registra un cierre de emergencia de "Pota" del "2026-11-20" al "2026-12-20" con la resolución "RM-0001-2026-PRODUCE"
    Entonces los Patrones "Juan Quispe y Luis Ramos" reciben una notificación push con alerta sonora y un correo electrónico en un máximo de 1 minuto
    Y el Coordinador recibe la confirmación de que se notificó a los Patrones

  Escenario: Identificación de capturas afectadas
    Cuando el Coordinador registra un cierre de emergencia de "Pota" del "2026-11-20" al "2026-12-20" con la resolución "RM-0001-2026-PRODUCE"
    Entonces en un máximo de 2 horas las capturas "C-01 y C-02" quedan en estado "Pendiente de confirmación"
    Y no cambia el estado de las capturas "C-03, C-04 y C-05"

  Esquema del escenario: Identificación según la zona regulatoria y la capacidad de bodega
    Dado que la embarcación de "Juan Quispe" opera en la zona "<zona>" y tiene <bodega> m³ de capacidad de bodega
    Cuando el Coordinador registra un cierre de emergencia de "Perico" en la zona "Norte" para embarcaciones de hasta 10 m³ del "2026-11-20" al "2026-12-20" con la resolución "RM-0005-2026-PRODUCE"
    Entonces la captura "C-03" queda en estado "<estado>"

    Ejemplos:
      | zona  | bodega | estado                    |
      | Norte | 8      | Pendiente de confirmación |
      | Norte | 12     | Verificada                |
      | Sur   | 8      | Verificada                |

  Escenario: Aviso al Coordinador de capturas por confirmar
    Cuando el Coordinador registra un cierre de emergencia de "Pota" del "2026-11-20" al "2026-12-20" con la resolución "RM-0001-2026-PRODUCE"
    Entonces el Coordinador recibe por notificación push y correo electrónico el aviso de que tiene 2 capturas "Pendiente de confirmación"

  Escenario: Falla en el envío de la notificación push a los Patrones
    Dado que el servicio de notificaciones push no está disponible
    Cuando el Coordinador registra un cierre de emergencia de "Pota" del "2026-11-20" al "2026-12-20" con la resolución "RM-0001-2026-PRODUCE"
    Entonces los Patrones "Juan Quispe y Luis Ramos" reciben el aviso del cierre por correo electrónico como respaldo

  Escenario: Falla en el envío de la notificación push al Coordinador
    Dado que el servicio de notificaciones push no está disponible
    Cuando el Coordinador registra un cierre de emergencia de "Pota" del "2026-11-20" al "2026-12-20" con la resolución "RM-0001-2026-PRODUCE"
    Entonces el Coordinador recibe por correo electrónico, como respaldo, el aviso de capturas "Pendiente de confirmación"

  Escenario: Bloqueo de capturas pendientes de confirmación
    Dado que el Coordinador registró un cierre de emergencia de "Pota" del "2026-11-20" al "2026-12-20" con la resolución "RM-0001-2026-PRODUCE"
    Cuando el Coordinador selecciona las capturas "C-01" y confirma la consolidación
    Entonces el sistema no consolida el lote
    Y el sistema muestra el mensaje "Solo se pueden consolidar capturas verificadas o aprobadas."

  Escenario: Ningún cierre afecta capturas
    Cuando el Coordinador registra un cierre de emergencia de "Bonito" del "2026-11-20" al "2026-12-20" con la resolución "RM-0006-2026-PRODUCE"
    Entonces el Coordinador recibe el aviso de que no hay capturas afectadas
    Y no cambia el estado de las capturas "C-01, C-02, C-03, C-04 y C-05"

  Esquema del escenario: Captura sincronizada después del cierre
    Dado que el Coordinador registró un cierre de emergencia de "Pota" del "2026-11-20" al "2026-12-20" con la resolución "RM-0001-2026-PRODUCE"
    Y que el Patrón "Juan Quispe" registró sin señal la captura "C-06" de "Pota" del "2026-11-25"
    Cuando la captura "C-06" se sincroniza y <resultado de la verificación>
    Entonces la captura "C-06" queda en estado "Pendiente de confirmación"
    Y el Coordinador recibe por notificación push y correo electrónico el aviso de capturas "Pendiente de confirmación"

    Ejemplos:
      | resultado de la verificación                     |
      | queda "Verificada" en la verificación automática |
      | el Coordinador la aprueba en la revisión manual  |
