# language: es
@HU-11 @CertificacionDeLotes
Característica: HU-11 Verificar públicamente un certificado de lote
  Como tercero interesado (empresa exportadora, comprador internacional o autoridad aduanera)
  Quiero validar la autenticidad e integridad de un certificado con su código de verificación, sin necesitar una cuenta
  Para contar con evidencia verificable del origen del lote antes de aceptarlo

  Antecedentes:
    Dado que la cooperativa "Cooperativa Pesquera Paita" tiene el lote "L-001" de "Pota" con su certificado emitido

  Escenario: Verificación exitosa de un certificado auténtico
    Dado que el tercero interesado tiene el código de verificación del certificado del lote "L-001"
    Cuando ingresa ese código en la consulta pública, sin iniciar sesión
    Entonces el sistema confirma que el certificado es auténtico y no fue alterado desde su emisión
    Y muestra la cooperativa, la matrícula de cada embarcación, la especie, el método de captura y la fecha, hora, ubicación y estado de cada captura
    Y no muestra datos personales de los Patrones de embarcación

  Escenario: Código de verificación inválido
    Cuando el tercero interesado ingresa el código "CF-ZZZZ-9999" en la consulta pública
    Entonces el sistema muestra el mensaje "Código de verificación no válido."

  Esquema del escenario: Código de verificación vacío o con formato incorrecto
    Cuando el tercero interesado ingresa el código "<código>" en la consulta pública
    Entonces el sistema no realiza la consulta
    Y el sistema muestra el mensaje "Ingresa un código de verificación válido."

    Ejemplos:
      | código |
      |        |
      | 12345  |
      | CF-12  |

  Escenario: Certificado alterado después de su emisión
    Dado que el contenido del certificado del lote "L-001" fue modificado después de su emisión
    Cuando el tercero interesado verifica ese certificado con su código
    Entonces el sistema detecta la discrepancia e indica que el certificado no es íntegro
    Y no lo confirma como válido
