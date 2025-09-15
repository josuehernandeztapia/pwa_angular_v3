// ⛽ GNV FILE INGESTION - T+1 Estación Piloto
console.log('⛽ GNV FILE INGESTION - T+1 Estación Piloto');
console.log('='.repeat(55));

// Simular datos de estación GNV T+1
function generateGNVData() {
  const stations = ['EST-001-CDMX', 'EST-002-GDL', 'EST-003-MTY', 'EST-004-TIJ'];
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1); // T+1
  
  const data = [];
  
  stations.forEach((station, index) => {
    // Generar 24 horas de datos por estación
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(currentDate);
      timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      
      // Simular presión, flujo y temperatura realistas
      const basePresure = 200 + Math.random() * 50; // 200-250 bar
      const baseFlow = 15 + Math.random() * 10; // 15-25 m³/h
      const baseTemp = 20 + Math.random() * 15; // 20-35°C
      
      // Introducir algunas anomalías para testing
      let pressure = basePresure;
      let flow = baseFlow;
      let temperature = baseTemp;
      let status = 'VERDE';
      
      // Anomalías simuladas (10% probabilidad)
      if (Math.random() < 0.1) {
        if (Math.random() < 0.5) {
          pressure = 150 + Math.random() * 30; // Presión baja
          status = 'AMARILLO';
        } else {
          flow = 5 + Math.random() * 8; // Flujo bajo
          status = 'ROJO';
        }
      }
      
      // Temperatura muy alta (5% probabilidad)
      if (Math.random() < 0.05) {
        temperature = 45 + Math.random() * 10; // 45-55°C
        status = 'ROJO';
      }
      
      data.push({
        station_id: station,
        timestamp: timestamp.toISOString(),
        pressure_bar: Math.round(pressure * 100) / 100,
        flow_m3h: Math.round(flow * 100) / 100,
        temperature_c: Math.round(temperature * 100) / 100,
        status: status,
        compressor_hours: 1000 + Math.random() * 500,
        maintenance_due: Math.random() < 0.02 // 2% probabilidad
      });
    }
  });
  
  return data;
}

// Función de validación de archivo CSV
function validateCSVData(data) {
  const validations = {
    total_records: data.length,
    valid_records: 0,
    invalid_records: 0,
    status_distribution: { VERDE: 0, AMARILLO: 0, ROJO: 0 },
    alerts: [],
    errors: []
  };
  
  data.forEach((record, index) => {
    let isValid = true;
    
    // Validar campos obligatorios
    const requiredFields = ['station_id', 'timestamp', 'pressure_bar', 'flow_m3h', 'temperature_c', 'status'];
    requiredFields.forEach(field => {
      if (!record[field] && record[field] !== 0) {
        validations.errors.push(`Registro ${index + 1}: Campo ${field} faltante`);
        isValid = false;
      }
    });
    
    // Validar rangos de valores
    if (record.pressure_bar < 100 || record.pressure_bar > 300) {
      validations.alerts.push(`Registro ${index + 1}: Presión ${record.pressure_bar} fuera de rango (100-300 bar)`);
      if (record.pressure_bar < 50) isValid = false;
    }
    
    if (record.flow_m3h < 0 || record.flow_m3h > 50) {
      validations.alerts.push(`Registro ${index + 1}: Flujo ${record.flow_m3h} fuera de rango (0-50 m³/h)`);
      if (record.flow_m3h < 0) isValid = false;
    }
    
    if (record.temperature_c < -10 || record.temperature_c > 60) {
      validations.alerts.push(`Registro ${index + 1}: Temperatura ${record.temperature_c} fuera de rango (-10 a 60°C)`);
      if (record.temperature_c > 70) isValid = false;
    }
    
    // Validar formato de timestamp
    if (!Date.parse(record.timestamp)) {
      validations.errors.push(`Registro ${index + 1}: Timestamp inválido: ${record.timestamp}`);
      isValid = false;
    }
    
    // Contar distribución de status
    if (record.status && validations.status_distribution.hasOwnProperty(record.status)) {
      validations.status_distribution[record.status]++;
    } else {
      validations.errors.push(`Registro ${index + 1}: Status inválido: ${record.status}`);
      isValid = false;
    }
    
    if (isValid) {
      validations.valid_records++;
    } else {
      validations.invalid_records++;
    }
  });
  
  return validations;
}

// Función para generar CSV
function generateCSV(data) {
  const headers = ['station_id', 'timestamp', 'pressure_bar', 'flow_m3h', 'temperature_c', 'status', 'compressor_hours', 'maintenance_due'];
  
  let csv = headers.join(',') + '\n';
  
  data.forEach(record => {
    const row = headers.map(header => {
      let value = record[header];
      if (typeof value === 'boolean') value = value.toString();
      if (typeof value === 'string' && value.includes(',')) value = `"${value}"`;
      return value;
    }).join(',');
    csv += row + '\n';
  });
  
  return csv;
}

// Simulación de procesamiento de archivo T+1
console.log('📊 Generando datos de estaciones GNV T+1...\n');

const gnvData = generateGNVData();
const csvContent = generateCSV(gnvData);
const validation = validateCSVData(gnvData);

console.log('📈 RESULTADOS DE INGESTA GNV:');
console.log(`   Total de registros: ${validation.total_records}`);
console.log(`   Registros válidos: ${validation.valid_records}`);
console.log(`   Registros inválidos: ${validation.invalid_records}`);
console.log(`   Tasa de éxito: ${((validation.valid_records / validation.total_records) * 100).toFixed(1)}%`);
console.log('');

console.log('🚦 DISTRIBUCIÓN DE STATUS:');
Object.entries(validation.status_distribution).forEach(([status, count]) => {
  const percentage = ((count / validation.total_records) * 100).toFixed(1);
  const emoji = status === 'VERDE' ? '🟢' : status === 'AMARILLO' ? '🟡' : '🔴';
  console.log(`   ${emoji} ${status}: ${count} registros (${percentage}%)`);
});
console.log('');

// Mostrar alertas (máximo 10)
if (validation.alerts.length > 0) {
  console.log('⚠️ ALERTAS DE VALIDACIÓN:');
  validation.alerts.slice(0, 10).forEach(alert => {
    console.log(`   ${alert}`);
  });
  if (validation.alerts.length > 10) {
    console.log(`   ... y ${validation.alerts.length - 10} alertas más`);
  }
  console.log('');
}

// Mostrar errores (máximo 5)
if (validation.errors.length > 0) {
  console.log('❌ ERRORES DE VALIDACIÓN:');
  validation.errors.slice(0, 5).forEach(error => {
    console.log(`   ${error}`);
  });
  if (validation.errors.length > 5) {
    console.log(`   ... y ${validation.errors.length - 5} errores más`);
  }
  console.log('');
}

// Análisis de estaciones críticas
console.log('🏭 ANÁLISIS POR ESTACIÓN:');
const stationAnalysis = {};

gnvData.forEach(record => {
  if (!stationAnalysis[record.station_id]) {
    stationAnalysis[record.station_id] = {
      total: 0,
      verde: 0,
      amarillo: 0,
      rojo: 0,
      avg_pressure: 0,
      avg_flow: 0,
      avg_temp: 0
    };
  }
  
  const station = stationAnalysis[record.station_id];
  station.total++;
  station[record.status.toLowerCase()]++;
  station.avg_pressure += record.pressure_bar;
  station.avg_flow += record.flow_m3h;
  station.avg_temp += record.temperature_c;
});

Object.entries(stationAnalysis).forEach(([stationId, stats]) => {
  stats.avg_pressure = (stats.avg_pressure / stats.total).toFixed(1);
  stats.avg_flow = (stats.avg_flow / stats.total).toFixed(1);
  stats.avg_temp = (stats.avg_temp / stats.total).toFixed(1);
  
  const healthScore = (stats.verde / stats.total * 100).toFixed(1);
  const statusIcon = healthScore >= 90 ? '✅' : healthScore >= 75 ? '⚠️' : '❌';
  
  console.log(`   ${statusIcon} ${stationId}:`);
  console.log(`     Health Score: ${healthScore}% (${stats.verde}V/${stats.amarillo}A/${stats.rojo}R)`);
  console.log(`     Promedios: ${stats.avg_pressure}bar, ${stats.avg_flow}m³/h, ${stats.avg_temp}°C`);
});

console.log('\n' + '='.repeat(55));

// Resultado final
const overallHealth = (validation.status_distribution.VERDE / validation.total_records * 100).toFixed(1);
const isHealthy = overallHealth >= 85;

console.log('🎯 RESUMEN DE INGESTA T+1:');
console.log(`   Archivo procesado: ${isHealthy ? '✅ EXITOSO' : '⚠️ CON ALERTAS'}`);
console.log(`   Health Score General: ${overallHealth}%`);
console.log(`   Registros procesables: ${validation.valid_records}/${validation.total_records}`);
console.log(`   Estaciones monitoreadas: ${Object.keys(stationAnalysis).length}`);

if (isHealthy) {
  console.log('   Status: ✅ SISTEMA GNV OPERACIONAL');
} else {
  console.log('   Status: ⚠️ REQUIERE ATENCIÓN TÉCNICA');
}

console.log('\n⛽ GNV FILE INGESTION COMPLETADO');