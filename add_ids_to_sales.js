// sales.json code
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'sales.json');
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

function randomId() {
  return Math.floor(Math.random() * 1e15) + Date.now();
}

data = data.map(entry => {
  const updated = { ...entry };
  if (!updated.id) updated.id = randomId();
  if (updated.received === undefined || updated.received === null) updated.received = 0;
  if (updated.tds === undefined || updated.tds === null) updated.tds = 0;
  if (updated.bill_amount === undefined || updated.bill_amount === null) updated.bill_amount = 0;
  if (updated.review === undefined || updated.review === null) updated.review = "-";
  if (updated.status === undefined || updated.status === null) updated.status = "True";
  return updated;
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('IDs, received, and tds added to sales.json where missing.'); 




// // purchases.json code
// const fs = require('fs');
// const path = require('path');

// const file = path.join(__dirname, 'purchases.json');
// let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// function randomId() {
//   return Math.floor(Math.random() * 1e15) + Date.now();
// }

// data = data.map(entry => {
//   const updated = { ...entry };
//   if (!updated.id) updated.id = randomId();
//   if (updated.creditors === undefined || updated.creditors === null) updated.creditors = "-";
//   if (updated.invoice_no === undefined || updated.invoice_no === null) updated.invoice_no = 0;
//   if (updated.credit_amt === undefined || updated.credit_amt === null) updated.credit_amt = 0;
//   if (updated.date === undefined || updated.date === null) updated.date = 0;
//   if (updated.debit_amt === undefined || updated.debit_amt === null) updated.debit_amt = 0;
//   if (updated.review === undefined || updated.review === null) updated.review = "-";
//   if (updated.status === undefined || updated.status === null) updated.status = "True";
  
  
//   return updated;
// });

// fs.writeFileSync(file, JSON.stringify(data, null, 2));
// console.log('IDs, received, and tds added to sales.json where missing.'); 





// // // // advance.json code
// // // const fs = require('fs');
// // // const path = require('path');

// // // const file = path.join(__dirname, 'advance_payment.json');
// // // let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// // // function randomId() {
// // //   return Math.floor(Math.random() * 1e15) + Date.now();
// // // }

// // // data = data.map(entry => {
// // //   const updated = { ...entry };
// // //   if (!updated.id) updated.id = randomId();
// // //     if (updated.review === undefined || updated.review === null) updated.review = "-";
// // //   return updated;
// // // });

// // // fs.writeFileSync(file, JSON.stringify(data, null, 2));
// // // console.log('IDs, received, and tds added to sales.json where missing.'); 


