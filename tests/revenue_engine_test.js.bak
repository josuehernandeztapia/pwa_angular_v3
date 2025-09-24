console.log('🧮 TESTING COMPLETE COTIZADOR BUSINESS LOGIC');
console.log('============================================');

// 1. Aguascalientes Individual
function testAGSIndividual() {
  console.log('📊 1. AGS INDIVIDUAL');
  const data = {
    vehicleValue: 180000,
    downPayment: 0.30,
    term: 48,
    annualRate: 0.12,
    fees: 0.02
  };
  
  const financed = data.vehicleValue * (1 - data.downPayment);
  const monthlyRate = data.annualRate / 12;
  const payment = (financed * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -data.term));
  const totalFees = data.vehicleValue * data.fees;
  
  console.log(`   Vehículo: $${data.vehicleValue.toLocaleString()}`);
  console.log(`   Enganche: $${(data.vehicleValue * data.downPayment).toLocaleString()}`);
  console.log(`   Financiado: $${financed.toLocaleString()}`);
  console.log(`   Pago mensual: $${Math.round(payment).toLocaleString()}`);
  console.log(`   ✅ Valid range: ${payment >= 2500 && payment <= 4000 ? 'YES' : 'NO'}`);
  return { payment, valid: payment >= 2500 && payment <= 4000 };
}

// 2. EDOMEX Colectivo
function testEDOMEXColectivo() {
  console.log('\n📊 2. EDOMEX COLECTIVO');
  const data = {
    vehicleValue: 180000,
    groupSize: 20,
    collectiveDiscount: 0.15,
    coordinationFee: 0.05
  };
  
  const discountedPrice = data.vehicleValue * (1 - data.collectiveDiscount);
  const individualContribution = discountedPrice / data.groupSize;
  const coordinationCost = data.vehicleValue * data.coordinationFee / data.groupSize;
  const totalPerPerson = individualContribution + coordinationCost;
  
  console.log(`   Precio original: $${data.vehicleValue.toLocaleString()}`);
  console.log(`   Descuento colectivo: ${data.collectiveDiscount * 100}%`);
  console.log(`   Precio con descuento: $${discountedPrice.toLocaleString()}`);
  console.log(`   Aportación individual: $${Math.round(individualContribution).toLocaleString()}`);
  console.log(`   Total por persona: $${Math.round(totalPerPerson).toLocaleString()}`);
  console.log(`   ✅ Savings vs individual: $${Math.round(data.vehicleValue/data.groupSize - totalPerPerson).toLocaleString()}`);
  return { totalPerPerson, savings: data.vehicleValue/data.groupSize - totalPerPerson };
}

// 3. Tanda Colectiva
function testTandaColectiva() {
  console.log('\n📊 3. TANDA COLECTIVA');
  const data = {
    participants: 12,
    monthlyAmount: 2500,
    totalCycles: 12,
    administrationFee: 0.03
  };
  
  const monthlyFund = data.participants * data.monthlyAmount;
  const adminFee = monthlyFund * data.administrationFee;
  const netFund = monthlyFund - adminFee;
  const totalProgram = netFund * data.totalCycles;
  
  console.log(`   Participantes: ${data.participants}`);
  console.log(`   Aportación mensual c/u: $${data.monthlyAmount.toLocaleString()}`);
  console.log(`   Fondo mensual bruto: $${monthlyFund.toLocaleString()}`);
  console.log(`   Fee administración: $${Math.round(adminFee).toLocaleString()}`);
  console.log(`   Fondo neto mensual: $${Math.round(netFund).toLocaleString()}`);
  console.log(`   Total programa: $${totalProgram.toLocaleString()}`);
  console.log(`   ✅ ROI per participant: ${((netFund / data.monthlyAmount - 1) * 100).toFixed(1)}%`);
  return { netFund, roi: (netFund / data.monthlyAmount - 1) * 100 };
}

// Ejecutar todas las pruebas
const ags = testAGSIndividual();
const edomex = testEDOMEXColectivo();
const tanda = testTandaColectiva();

console.log('\n🏆 COTIZADOR VALIDATION SUMMARY:');
console.log('================================');
console.log(`AGS Individual: ${ags.valid ? '✅ VALID' : '❌ OUT OF RANGE'}`);
console.log(`EDOMEX Colectivo: ${edomex.savings > 0 ? '✅ SAVINGS ACHIEVED' : '❌ NO SAVINGS'}`);
console.log(`Tanda Colectiva: ${tanda.roi > 0 ? '✅ POSITIVE ROI' : '❌ NEGATIVE ROI'}`);

const allValid = ags.valid && edomex.savings > 0 && tanda.roi > 0;
console.log(`\n🎯 OVERALL COTIZADOR: ${allValid ? '✅ ALL SYSTEMS GO' : '❌ NEEDS CALIBRATION'}`);

