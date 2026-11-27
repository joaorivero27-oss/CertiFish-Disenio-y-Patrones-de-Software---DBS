# CertiFish · Test Use Cases en Cucumber

Pruebas de aceptación de las 16 Historias de Usuario de CertiFish (Deep Blue Solutions), escritas en Gherkin en español y ejecutadas con Cucumber.js.

## Requisitos

- Node.js (versión LTS) y Visual Studio Code.
- Extensión de VS Code **Cucumber (Gherkin) Full Support** (Alexander Krechik). Al abrir la carpeta, VS Code la sugiere; su configuración ya está en `.vscode/settings.json`.

## Cómo ejecutar

Abre esta carpeta en VS Code y, en la terminal (menú **Terminal → Nuevo terminal**), ejecuta:

```
npm install
npm test
```

Al final debe aparecer el resumen con todos los escenarios en verde. El reporte visual queda en `reportes/cucumber-report.html` (ábrelo con doble clic en el Explorador de archivos).

Para ejecutar una sola historia, usa su etiqueta:

```
npx cucumber-js --tags "@HU-06"
```

Las etiquetas por Bounded Context también sirven, por ejemplo `--tags "@CertificacionDeLotes"`.

## Estructura

```
features/
  HU-01_registrar_captura.feature ... HU-16_historial_cooperativa.feature   (un archivo por HU)
  step_definitions/   definiciones de pasos, una por Bounded Context
  support/world.js    mundo de cada escenario y datos de prueba
src/                  modelo de dominio de referencia, una carpeta por Bounded Context
cucumber.js           configuración (excluye los escenarios @manual)
```

## Notas

- Los servicios externos (AWS SageMaker, Firebase Cloud Messaging y SendGrid) se reemplazan por dobles de prueba; el reloj es simulado para comprobar los plazos (8 segundos, 1 minuto, 1 hora, 2 horas y 15 minutos).
- El escenario 2 de HU-01 (registro en 3 pasos y menos de 1 minuto, RNF08) tiene la etiqueta `@manual`: se valida en pruebas de usabilidad con Patrones reales.
- Si PowerShell muestra «la ejecución de scripts está deshabilitada», ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` o usa la terminal **Command Prompt**.
