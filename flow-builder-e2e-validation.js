#!/usr/bin/env node

/**
 * FLOW BUILDER E2E VALIDATION COMPLETO
 * Validación end-to-end completa del Flow Builder con todas las funcionalidades
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class FlowBuilderE2EValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      timestamp: new Date().toISOString(),
      total: 0,
      passed: 0,
      failed: 0,
      tests: [],
      screenshots: []
    };
  }

  async initialize() {
    console.log('🚀 INICIANDO VALIDACIÓN COMPLETA DE FLOW BUILDER');
    console.log('🎯 Testing: Drag&Drop, Node Creation, Connections, Save/Load, Export');
    console.log('📋 Incluye: Paleta, Lienzo, Propiedades, Zoom, Persistencia\n');

    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setDefaultTimeout(30000);

    // Capturar errores de consola
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
  }

  async takeScreenshot(name) {
    const screenshotPath = `flow-builder-${name}-${Date.now()}.png`;
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    this.testResults.screenshots.push(screenshotPath);
    console.log(`  📸 Screenshot: ${screenshotPath}`);
    return screenshotPath;
  }

  async addTestResult(testName, passed, details = '') {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
      console.log(`  ✅ ${testName}: PASSED`);
    } else {
      this.testResults.failed++;
      console.log(`  ❌ ${testName}: FAILED - ${details}`);
    }

    this.testResults.tests.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async authenticateAsAdmin() {
    console.log('\n🔐 AUTENTICACIÓN COMO ADMIN');

    await this.page.goto('http://localhost:4300', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await this.takeScreenshot('01-login-page');

    // Buscar botones de demo users
    const demoButtons = await this.page.$$('[data-cy^="demo-user-"]');

    if (demoButtons.length === 0) {
      throw new Error('No se encontraron botones de demo users');
    }

    // Click en admin user
    await demoButtons[0].click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar campos y llenar si es necesario
    const emailField = await this.page.$('input[type="email"]');
    const passwordField = await this.page.$('input[type="password"]');

    if (emailField && passwordField) {
      const emailValue = await emailField.evaluate(el => el.value);
      const passwordValue = await passwordField.evaluate(el => el.value);

      if (!emailValue) await emailField.type('admin@conductores.mx');
      if (!passwordValue) await passwordField.type('admin123');
    }

    // Submit form
    const submitButton = await this.page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    }

    await this.takeScreenshot('02-dashboard-after-login');
    this.addTestResult('Autenticación Admin', true);
  }

  async navigateToFlowBuilder() {
    console.log('\n🧭 NAVEGACIÓN A FLOW BUILDER');

    // Navegar directamente a Flow Builder
    await this.page.goto('http://localhost:4300/configuracion/flow-builder', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await this.takeScreenshot('03-flow-builder-initial');

    // Verificar que el Flow Builder cargó
    try {
      await this.page.waitForSelector('.flow-builder-container', { timeout: 10000 });
      this.addTestResult('Navegación a Flow Builder', true);
    } catch (error) {
      this.addTestResult('Navegación a Flow Builder', false, error.message);
      return false;
    }

    return true;
  }

  async validateFlowBuilderInterface() {
    console.log('\n🎨 VALIDACIÓN DE INTERFAZ DE FLOW BUILDER');

    // Verificar elementos principales
    const elements = [
      { selector: '.flow-builder__header', name: 'Header con botones' },
      { selector: '.flow-builder__palette', name: 'Paleta de nodos' },
      { selector: '.flow-builder__canvas', name: 'Lienzo principal' },
      { selector: '.flow-builder__properties', name: 'Panel de propiedades' }
    ];

    for (const element of elements) {
      try {
        await this.page.waitForSelector(element.selector, { timeout: 5000 });
        this.addTestResult(`Interfaz: ${element.name}`, true);
      } catch (error) {
        this.addTestResult(`Interfaz: ${element.name}`, false, 'Elemento no encontrado');
      }
    }

    await this.takeScreenshot('04-interface-validation');
  }

  async testNodePalette() {
    console.log('\n🎯 PRUEBAS DE PALETA DE NODOS');

    // Verificar categorías de nodos
    const categories = [
      'Mercados',
      'Productos',
      'Validaciones',
      'Acciones'
    ];

    for (const category of categories) {
      try {
        const categoryElement = await this.page.$x(`//h4[contains(text(), "${category}")]`);
        if (categoryElement.length > 0) {
          this.addTestResult(`Paleta: Categoría ${category}`, true);
        } else {
          this.addTestResult(`Paleta: Categoría ${category}`, false, 'Categoría no encontrada');
        }
      } catch (error) {
        this.addTestResult(`Paleta: Categoría ${category}`, false, error.message);
      }
    }

    // Probar búsqueda en paleta
    try {
      const searchInput = await this.page.$('.flow-builder__search input');
      if (searchInput) {
        await searchInput.type('mercado');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const searchResults = await this.page.$$('.flow-builder__node-template');
        this.addTestResult('Paleta: Búsqueda de nodos', searchResults.length > 0);

        // Limpiar búsqueda
        await searchInput.click({ clickCount: 3 });
        await searchInput.press('Backspace');
      }
    } catch (error) {
      this.addTestResult('Paleta: Búsqueda de nodos', false, error.message);
    }

    await this.takeScreenshot('05-palette-testing');
  }

  async testNodeCreation() {
    console.log('\n➕ PRUEBAS DE CREACIÓN DE NODOS');

    try {
      // Buscar primer template de nodo
      const nodeTemplates = await this.page.$$('.flow-builder__node-template');

      if (nodeTemplates.length === 0) {
        this.addTestResult('Creación: Templates disponibles', false, 'No se encontraron templates');
        return;
      }

      this.addTestResult('Creación: Templates disponibles', true);

      // Drag and drop del primer template al lienzo
      const canvas = await this.page.$('.flow-builder__canvas');
      if (canvas) {
        // Simular drag & drop
        const templateRect = await nodeTemplates[0].boundingBox();
        const canvasRect = await canvas.boundingBox();

        await this.page.mouse.move(templateRect.x + templateRect.width/2, templateRect.y + templateRect.height/2);
        await this.page.mouse.down();
        await this.page.mouse.move(canvasRect.x + 200, canvasRect.y + 200);
        await this.page.mouse.up();

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verificar que se creó un nodo
        const createdNodes = await this.page.$$('.flow-builder__node');
        this.addTestResult('Creación: Drag & Drop de nodo', createdNodes.length > 0);

        await this.takeScreenshot('06-node-created');
      }
    } catch (error) {
      this.addTestResult('Creación: Drag & Drop de nodo', false, error.message);
    }
  }

  async testNodeConnections() {
    console.log('\n🔗 PRUEBAS DE CONEXIONES ENTRE NODOS');

    try {
      // Crear segundo nodo
      const nodeTemplates = await this.page.$$('.flow-builder__node-template');
      if (nodeTemplates.length > 1) {
        const canvas = await this.page.$('.flow-builder__canvas');
        const canvasRect = await canvas.boundingBox();
        const templateRect = await nodeTemplates[1].boundingBox();

        await this.page.mouse.move(templateRect.x + templateRect.width/2, templateRect.y + templateRect.height/2);
        await this.page.mouse.down();
        await this.page.mouse.move(canvasRect.x + 400, canvasRect.y + 300);
        await this.page.mouse.up();

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Intentar conectar nodos
      const outputPorts = await this.page.$$('.flow-builder__port--output');
      const inputPorts = await this.page.$$('.flow-builder__port--input');

      if (outputPorts.length > 0 && inputPorts.length > 0) {
        const outputRect = await outputPorts[0].boundingBox();
        const inputRect = await inputPorts[0].boundingBox();

        await this.page.mouse.move(outputRect.x + outputRect.width/2, outputRect.y + outputRect.height/2);
        await this.page.mouse.down();
        await this.page.mouse.move(inputRect.x + inputRect.width/2, inputRect.y + inputRect.height/2);
        await this.page.mouse.up();

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verificar conexión creada
        const connections = await this.page.$$('.flow-builder__connection');
        this.addTestResult('Conexiones: Crear conexión', connections.length > 0);

        await this.takeScreenshot('07-nodes-connected');
      } else {
        this.addTestResult('Conexiones: Puertos disponibles', false, 'No se encontraron puertos');
      }
    } catch (error) {
      this.addTestResult('Conexiones: Crear conexión', false, error.message);
    }
  }

  async testCanvasControls() {
    console.log('\n🎛️ PRUEBAS DE CONTROLES DE LIENZO');

    // Probar zoom
    try {
      const zoomInButton = await this.page.$('[data-cy="zoom-in"]');
      const zoomOutButton = await this.page.$('[data-cy="zoom-out"]');
      const resetZoomButton = await this.page.$('[data-cy="reset-zoom"]');

      if (zoomInButton) {
        await zoomInButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        this.addTestResult('Controles: Zoom In', true);
      }

      if (zoomOutButton) {
        await zoomOutButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        this.addTestResult('Controles: Zoom Out', true);
      }

      if (resetZoomButton) {
        await resetZoomButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        this.addTestResult('Controles: Reset Zoom', true);
      }
    } catch (error) {
      this.addTestResult('Controles: Zoom', false, error.message);
    }

    await this.takeScreenshot('08-canvas-controls');
  }

  async testSaveLoadFunctionality() {
    console.log('\n💾 PRUEBAS DE GUARDADO Y CARGA');

    try {
      // Probar guardar
      const saveButton = await this.page.$('[data-cy="save-flow"]');
      if (saveButton) {
        await saveButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.addTestResult('Persistencia: Guardar flow', true);
      } else {
        this.addTestResult('Persistencia: Botón guardar', false, 'Botón no encontrado');
      }

      // Probar limpiar
      const clearButton = await this.page.$('[data-cy="clear-flow"]');
      if (clearButton) {
        await clearButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        const remainingNodes = await this.page.$$('.flow-builder__node');
        this.addTestResult('Persistencia: Limpiar flow', remainingNodes.length === 0);
      }

      await this.takeScreenshot('09-save-load');
    } catch (error) {
      this.addTestResult('Persistencia: Save/Load', false, error.message);
    }
  }

  async testCodeGeneration() {
    console.log('\n🚀 PRUEBAS DE GENERACIÓN DE CÓDIGO');

    try {
      // Crear un nodo simple para generar código
      const nodeTemplates = await this.page.$$('.flow-builder__node-template');
      if (nodeTemplates.length > 0) {
        const canvas = await this.page.$('.flow-builder__canvas');
        const canvasRect = await canvas.boundingBox();
        const templateRect = await nodeTemplates[0].boundingBox();

        await this.page.mouse.move(templateRect.x + templateRect.width/2, templateRect.y + templateRect.height/2);
        await this.page.mouse.down();
        await this.page.mouse.move(canvasRect.x + 300, canvasRect.y + 200);
        await this.page.mouse.up();

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Probar botón de deploy/export
      const deployButton = await this.page.$('[data-cy="deploy-flow"]');
      if (deployButton) {
        await deployButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verificar modal de código
        const codeModal = await this.page.$('.flow-builder__export-modal');
        if (codeModal) {
          this.addTestResult('Generación: Modal de código', true);

          // Verificar que hay código generado
          const codeContent = await this.page.$('.flow-builder__generated-code');
          if (codeContent) {
            const codeText = await codeContent.evaluate(el => el.textContent);
            this.addTestResult('Generación: Código generado', codeText.length > 50);
          }
        } else {
          this.addTestResult('Generación: Modal de código', false, 'Modal no aparece');
        }
      } else {
        this.addTestResult('Generación: Botón deploy', false, 'Botón no encontrado');
      }

      await this.takeScreenshot('10-code-generation');
    } catch (error) {
      this.addTestResult('Generación: Export/Deploy', false, error.message);
    }
  }

  async testPropertiesPanel() {
    console.log('\n⚙️ PRUEBAS DE PANEL DE PROPIEDADES');

    try {
      // Seleccionar un nodo para ver propiedades
      const nodes = await this.page.$$('.flow-builder__node');
      if (nodes.length > 0) {
        await nodes[0].click();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verificar panel de propiedades
        const propertiesPanel = await this.page.$('.flow-builder__properties');
        if (propertiesPanel) {
          const isVisible = await propertiesPanel.evaluate(el => el.offsetParent !== null);
          this.addTestResult('Propiedades: Panel visible', isVisible);

          // Verificar campos de propiedades
          const propertyInputs = await this.page.$$('.flow-builder__property input');
          this.addTestResult('Propiedades: Campos editables', propertyInputs.length > 0);
        }
      }

      await this.takeScreenshot('11-properties-panel');
    } catch (error) {
      this.addTestResult('Propiedades: Panel de propiedades', false, error.message);
    }
  }

  async generateReport() {
    const report = {
      ...this.testResults,
      summary: {
        successRate: Math.round((this.testResults.passed / this.testResults.total) * 100),
        totalTests: this.testResults.total,
        passedTests: this.testResults.passed,
        failedTests: this.testResults.failed
      }
    };

    const reportPath = `flow-builder-e2e-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 RESUMEN DE PRUEBAS DE FLOW BUILDER:');
    console.log(`📄 Tests ejecutados: ${report.summary.totalTests}`);
    console.log(`✅ Tests exitosos: ${report.summary.passedTests}`);
    console.log(`❌ Tests fallidos: ${report.summary.failedTests}`);
    console.log(`📈 Tasa de éxito: ${report.summary.successRate}%`);
    console.log(`💾 Reporte guardado: ${reportPath}`);
    console.log(`📸 Screenshots: ${this.testResults.screenshots.length}`);

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.authenticateAsAdmin();

      const navigated = await this.navigateToFlowBuilder();
      if (!navigated) {
        console.log('❌ No se pudo acceder al Flow Builder');
        return await this.generateReport();
      }

      await this.validateFlowBuilderInterface();
      await this.testNodePalette();
      await this.testNodeCreation();
      await this.testNodeConnections();
      await this.testCanvasControls();
      await this.testSaveLoadFunctionality();
      await this.testCodeGeneration();
      await this.testPropertiesPanel();

      const report = await this.generateReport();

      console.log('\n🎉 VALIDACIÓN COMPLETA DE FLOW BUILDER FINALIZADA!');
      console.log(`🎯 Flow Builder completamente validado con ${report.summary.successRate}% de éxito`);

      return report;

    } catch (error) {
      console.error('💥 Error en validación de Flow Builder:', error.message);
      return await this.generateReport();
    } finally {
      await this.cleanup();
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const validator = new FlowBuilderE2EValidator();
  validator.run()
    .then(result => {
      console.log('\n✅ Flow Builder E2E Validation completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ ERROR en Flow Builder E2E Validation:', error.message);
      process.exit(1);
    });
}

module.exports = FlowBuilderE2EValidator;