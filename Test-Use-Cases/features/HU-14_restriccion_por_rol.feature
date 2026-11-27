# language: es
@HU-14 @UsuariosYAcceso
Característica: HU-14 Restricción de funcionalidades según rol
  Como usuario autenticado
  Quiero que el sistema me muestre solo las funcionalidades correspondientes a mi rol
  Para evitar acciones que no me corresponden y proteger la integridad del proceso

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que el Patrón de embarcación "Juan Quispe" opera la embarcación "PT-0101" de la cooperativa "Cooperativa Pesquera Paita"

  Escenario: Visualización de funcionalidades del rol Patrón de embarcación
    Cuando "Juan Quispe" inicia sesión y accede al sistema
    Entonces solo ve estas funcionalidades:
      | funcionalidad          |
      | Registrar captura      |
      | Consultar mis capturas |

  Escenario: Visualización de funcionalidades del rol Coordinador
    Cuando "Carlos Ruiz" inicia sesión y accede al sistema
    Entonces solo ve estas funcionalidades:
      | funcionalidad                                     |
      | Revisar capturas pendientes                       |
      | Consultar resumen de capturas                     |
      | Consultar historial de la cooperativa             |
      | Registrar cierre normativo                        |
      | Confirmar validez de capturas                     |
      | Consolidar lote                                   |
      | Emitir certificado                                |
      | Descargar certificado y documentos de exportación |

  Esquema del escenario: Intento de acceso a una función fuera del rol
    Dado que "<usuario>" inició sesión
    Cuando intenta "<funcionalidad>" desde la interfaz
    Entonces el sistema muestra el mensaje "No tienes autorización para acceder a esta sección."
    Y no se ejecuta la acción "<funcionalidad>"

    Ejemplos:
      | usuario     | funcionalidad              |
      | Juan Quispe | Consolidar lote            |
      | Juan Quispe | Registrar cierre normativo |
      | Juan Quispe | Emitir certificado         |
      | Carlos Ruiz | Registrar captura          |

  Esquema del escenario: Intento de acceso directo evitando la interfaz
    Dado que "Juan Quispe" inició sesión
    Cuando invoca directamente la operación "<operación>" sin pasar por la interfaz
    Entonces el servidor rechaza la solicitud con el mensaje "No tienes autorización para acceder a esta sección."
    Y no se ejecuta la acción "<operación>"

    Ejemplos:
      | operación                  |
      | Consolidar lote            |
      | Registrar cierre normativo |
      | Emitir certificado         |

  Escenario: Datos de otra cooperativa
    Dado que la cooperativa "Cooperativa Pesquera Máncora" tiene capturas, embarcaciones y lotes registrados
    Y que "Carlos Ruiz" inició sesión
    Cuando intenta consultar las capturas, embarcaciones y lotes de la cooperativa "Cooperativa Pesquera Máncora"
    Entonces el sistema deniega el acceso y no muestra esos datos

  Escenario: Capturas de otro Patrón
    Dado que el Patrón "Luis Ramos" tiene capturas registradas
    Y que "Juan Quispe" inició sesión
    Cuando intenta consultar las capturas de "Luis Ramos"
    Entonces el sistema deniega el acceso y no muestra esos datos
