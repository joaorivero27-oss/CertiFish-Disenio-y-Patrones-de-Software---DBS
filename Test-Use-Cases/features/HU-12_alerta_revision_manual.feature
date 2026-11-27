# language: es
@HU-12 @Notificaciones
Característica: HU-12 Recibir alerta de captura pendiente de revisión manual
  Como Coordinador
  Quiero recibir una alerta cuando una verificación automática resulte con un nivel de confianza menor al 80 %
  Para revisar manualmente esa captura antes de que afecte un lote

  Antecedentes:
    Dado que el Coordinador "Carlos Ruiz" gestiona la cooperativa "Cooperativa Pesquera Paita"
    Y que el Patrón de embarcación "Juan Quispe" opera la embarcación "PT-0101" de la cooperativa "Cooperativa Pesquera Paita"

  Esquema del escenario: Alerta en un máximo de 1 minuto al quedar una captura pendiente de revisión
    Dado que el Patrón registró una captura de "Pota" con foto, ubicación GPS y metadatos EXIF
    Y que el servicio de verificación <respuesta del servicio>
    Cuando el sistema ejecuta la verificación automática
    Entonces en un máximo de 1 minuto el Coordinador recibe por notificación push y correo electrónico la alerta de la captura con el motivo "<motivo>"

    Ejemplos:
      | respuesta del servicio                                                                                           | motivo                                               |
      | responde en 3 segundos con la especie "Pota", una talla de 40 cm, una cantidad coherente y una confianza de 60 % | Confianza menor al 80 %                              |
      | no responde                                                                                                      | Falla del servicio de verificación tras 3 reintentos |

  Escenario: Falla en el envío de la notificación push
    Dado que el servicio de notificaciones push no está disponible
    Y que el Patrón registró una captura de "Pota" con foto, ubicación GPS y metadatos EXIF
    Y que el servicio de verificación responde en 3 segundos con la especie "Pota", una talla de 40 cm, una cantidad coherente y una confianza de 60 %
    Cuando el sistema ejecuta la verificación automática
    Entonces el Coordinador recibe la alerta por correo electrónico como respaldo

  Escenario: Varias capturas pendientes de revisión al mismo tiempo
    Dado que el servicio de verificación responde en 3 segundos con la especie "Pota", una talla de 40 cm, una cantidad coherente y una confianza de 60 %
    Cuando 3 capturas de la cooperativa quedan en estado "Pendiente de revisión manual" en un lapso de 10 minutos
    Entonces el Coordinador no recibe una notificación separada por cada captura
    Y las 2 capturas que quedaron pendientes después de la primera le llegan agrupadas en una sola notificación consolidada
