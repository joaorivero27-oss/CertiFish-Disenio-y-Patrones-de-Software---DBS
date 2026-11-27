# language: es
@HU-01 @RegistroDeCapturas
Característica: HU-01 Registrar una captura
  Como Patrón de embarcación
  Quiero registrar una captura indicando especie, cantidad o peso estimado y método de captura, y adjuntando al menos una foto
  Para dejar evidencia digital verificable de mi actividad de pesca

  Antecedentes:
    Dado que el Patrón de embarcación "Juan Quispe" opera la embarcación "PT-0101" de la cooperativa "Cooperativa Pesquera Paita"
    Y que el permiso de pesca de la embarcación "PT-0101" está vigente
    Y que el celular del Patrón tiene GPS y conexión estable

  Escenario: Registro exitoso de una captura
    Dado que el Patrón completó la especie "Pota", la cantidad "350 kg", el método "Potera" y adjuntó 1 foto
    Cuando el Patrón envía el registro de la captura
    Entonces la captura queda en estado "Registrada"
    Y la captura guarda la ubicación GPS y la fecha y hora del celular
    Y la captura guarda los metadatos EXIF de la foto
    Y el sistema muestra el mensaje "Captura registrada correctamente."

  @manual
  Escenario: Tiempo y pasos del registro
    # RNF08: se comprueba en pruebas de usabilidad con Patrones reales, por eso no se automatiza.
    Dado que el Patrón inicia el registro de una captura
    Cuando completa el flujo de registro
    Entonces lo completa en un máximo de 3 pasos y en menos de 1 minuto

  Esquema del escenario: Campo obligatorio faltante
    Dado que el Patrón completó la captura sin el campo "<campo>"
    Cuando el Patrón envía el registro de la captura
    Entonces el sistema no guarda la captura
    Y el sistema muestra el mensaje "Debes completar todos los campos obligatorios."

    Ejemplos:
      | campo             |
      | especie           |
      | cantidad          |
      | método de captura |
      | foto              |

  Escenario: GPS no disponible
    Dado que el celular del Patrón no puede obtener su ubicación
    Y que el Patrón completó la especie "Pota", la cantidad "350 kg", el método "Potera" y adjuntó 1 foto
    Cuando el Patrón envía el registro de la captura
    Entonces el sistema no guarda la captura
    Y el sistema muestra el mensaje "No se pudo obtener tu ubicación. Actívala e intenta nuevamente."

  Escenario: Permiso de pesca no vigente
    Dado que el permiso de pesca de la embarcación "PT-0101" ya no está vigente
    Y que el Patrón completó la especie "Pota", la cantidad "350 kg", el método "Potera" y adjuntó 1 foto
    Cuando el Patrón envía el registro de la captura
    Entonces el sistema no guarda la captura
    Y el sistema muestra el mensaje "No se puede registrar la captura: el permiso de pesca de la embarcación no está vigente."

  Esquema del escenario: Registro sin conexión o con conexión de baja velocidad
    Dado que el celular del Patrón está <conexión>
    Y que el Patrón completó la especie "Pota", la cantidad "350 kg", el método "Potera" y adjuntó 1 foto
    Cuando el Patrón envía el registro de la captura
    Entonces la captura se guarda en el celular para sincronizarla después
    Cuando el celular recupera una conexión estable
    Y el primer envío se interrumpe y la aplicación lo vuelve a intentar
    Entonces la captura se sincroniza en un máximo de 60 minutos desde que se recuperó la conexión
    Y el sistema guarda una sola vez la captura, en estado "Registrada"

    Ejemplos:
      | conexión                                      |
      | sin conexión a internet                       |
      | con una conexión de baja velocidad de 55 kbps |

  Escenario: Discrepancia entre los metadatos de la foto y el celular
    Dado que los metadatos EXIF de la foto no coinciden con la ubicación y la hora del celular
    Y que el Patrón completó la especie "Pota", la cantidad "350 kg", el método "Potera" y adjuntó 1 foto
    Cuando el Patrón envía el registro de la captura
    Entonces la captura queda en estado "Registrada"
    Y la captura queda marcada con una inconsistencia para resolverla en la verificación automática
