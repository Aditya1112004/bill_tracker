const fs = require('fs');
const path = require('path');
const { readJsonUtf8 } = require('./utils/json');

// Sales.json code
const salesFile = path.join(__dirname, 'sales.json');
let salesData = readJsonUtf8(salesFile, []);

let salesIdCounter = 0;
salesData = salesData.map(entry => {
  const updated = { ...entry };
  // Only assign if missing or not already in the correct format
  if (!updated.id || !String(updated.id).startsWith("s-")) {
    salesIdCounter++;
    updated.id = `s-${salesIdCounter}`;
  }
  if (updated.received === undefined || updated.received === null) updated.received = 0;
  if (updated.tds === undefined || updated.tds === null) updated.tds = 0;
  if (updated.bill_amount === undefined || updated.bill_amount === null) updated.bill_amount = 0;
  if (updated.review === undefined || updated.review === null) updated.review = "-";
  if (updated.status === undefined || updated.status === null) updated.status = true;
  return updated;
});

fs.writeFileSync(salesFile, JSON.stringify(salesData, null, 2));
console.log('Sales IDs, received, tds, and status added/updated in sales.json.');

// // ============================================================================================================
// // purchases.json code
const purchasesFile = path.join(__dirname, 'purchases.json');
let purchasesData = readJsonUtf8(purchasesFile, []);

let purchaseIdCounter = 0;
purchasesData = purchasesData.map(entry => {
  const updated = { ...entry };
  // Only assign if missing or not already in the correct format
  if (!updated.id || !(String(updated.id).startsWith("p-") || String(updated.id).startsWith("pid-"))) {
    purchaseIdCounter++;
    updated.id = `p-${purchaseIdCounter}`;
  }
  if (updated.creditors === undefined || updated.creditors === null) updated.creditors = "-";
  if (updated.invoice_no === undefined || updated.invoice_no === null) updated.invoice_no = 0;
  if (updated.credit_amt === undefined || updated.credit_amt === null) updated.credit_amt = 0;
  if (updated.date === undefined || updated.date === null) updated.date = "";
  if (updated.debit_amt === undefined || updated.debit_amt === null) updated.debit_amt = 0;
  if (updated.review === undefined || updated.review === null) updated.review = "-";
  if (updated.status === undefined || updated.status === null) updated.status = true;
  return updated;
});

fs.writeFileSync(purchasesFile, JSON.stringify(purchasesData, null, 2));
console.log('Purchase IDs, and other fields added/updated in purchases.json.');


// // ============================================================================================================
// // advance.json code
// const advanceFile = path.join(__dirname, 'advance_payment.json');
// let advanceData = JSON.parse(fs.readFileSync(advanceFile, 'utf8'));

// let advanceIdCounter = 0;
// advanceData = advanceData.map(entry => {
//   const updated = { ...entry };
//   if (!updated.id || String(updated.id).startsWith("aid-")) { // Assuming ADI for Advance IDs
//     advanceIdCounter++;
//     updated.id = `aid-${advanceIdCounter}`;
//   }
//   if (updated.review === undefined || updated.review === null) updated.review = "-";
//   return updated;
// });

// fs.writeFileSync(advanceFile, JSON.stringify(advanceData, null, 2));
// console.log('Advance Payment IDs and review field added/updated in advance_payment.json.');



// // ============================================================================================================
// // sp_analysis.json code
// const sp_analysisFile = path.join(__dirname, 'sp_analysis.json');
// let sp_analysisData = JSON.parse(fs.readFileSync(sp_analysisFile, 'utf8'));

// let spaIdCounter = 0;
// sp_analysisData = sp_analysisData.map(entry => {
//   const updated = { ...entry };
//   if (!updated.id || String(updated.id).startsWith("spaid-")) { // Assuming PI for Purchase IDs
//     spaIdCounter++;
//     updated.id = `spaid-${spaIdCounter}`;
//   }
  
//   if (updated.status === undefined || updated.status === null) updated.status = true;
//   return updated;
// });

// fs.writeFileSync(sp_analysisFile, JSON.stringify(sp_analysisData, null, 2));
// console.log('SP_Analysis IDs, and other fields added/updated in sp_analysis.json.');

