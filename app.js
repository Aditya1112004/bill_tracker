const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const app = express();
const PORT = 3000;

const publicPath = path.join(__dirname, 'public');
const viewsPath = path.join(__dirname, 'views');
app.set('views', viewsPath);
app.use(express.static(publicPath));

const ADVANCE_FILE = path.join(__dirname, "advance_payment.json");
const SALES_FILE = path.join(__dirname, "sales.json");
const PURCHASE_FILE = path.join(__dirname, "purchases.json");
const SP_ANALYSIS_FILE = path.join(__dirname, "sp_analysis.json");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));



function loadSales() {
    if (!fs.existsSync(SALES_FILE)) fs.writeFileSync(SALES_FILE, "[]");
    return JSON.parse(fs.readFileSync(SALES_FILE));
}

function saveSales(sales) {
    fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2));
}

function loadPurchases() {
    if (!fs.existsSync(PURCHASE_FILE)) fs.writeFileSync(PURCHASE_FILE, "[]");
    return JSON.parse(fs.readFileSync(PURCHASE_FILE));
}
function savePurchases(purchases) {
    fs.writeFileSync(PURCHASE_FILE, JSON.stringify(purchases, null, 2));
}

function loadAdvancePayment() {
    if (!fs.existsSync(ADVANCE_FILE)) fs.writeFileSync(ADVANCE_FILE, "[]");
    return JSON.parse(fs.readFileSync(ADVANCE_FILE));
}
function saveAdvancePayment(advancePayment) {
    fs.writeFileSync(ADVANCE_FILE, JSON.stringify(advancePayment, null, 2));
}

function loadSpAnalysis() {
    if (!fs.existsSync(SP_ANALYSIS_FILE)) fs.writeFileSync(SP_ANALYSIS_FILE, "[]");
    return JSON.parse(fs.readFileSync(SP_ANALYSIS_FILE));
}

function saveSpAnalysis(spAnalysis) {
    fs.writeFileSync(SP_ANALYSIS_FILE, JSON.stringify(spAnalysis, null, 2));
}

function daysBetweenToday(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return 0;
  const today = new Date();
  today.setHours(0,0,0,0);
  d.setHours(0,0,0,0);
  return Math.floor((d - today) / (1000 * 60 * 60 * 24));
}

// Routes
app.get("/", (req, res) => {
    res.render("index");
});


// Update all sales filters to use the same robust logic
app.get("/sales", (req, res) => {
    let sales = loadSales();
    sales = sales.filter(entry => (Number(entry.bill_amount) - Number(entry.received) - Number(entry.tds || 0)) !== 0 && entry.status !== false);
    res.render("sales_list", { sales });
});

app.get("/sales/new", (req, res) => {
    res.render("sales_new");
});

app.get("/sales/edit", (req, res) => {
    res.render("sales_edit");
});

app.post("/sales/new", (req, res) => {
    const sales = loadSales();
    const received = req.body.received ? parseFloat(req.body.received) : 0;
    const bill_amount = parseFloat(req.body.bill_amount);
    const tds = req.body.tds ? parseFloat(req.body.tds) : 0;
    sales.push({
        id: Date.now(),
        debtors: req.body.debtors,
        date: req.body.date,
        invoice_no: req.body.invoice_no,
        review: req.body.review,
        bill_amount,
        received,
        tds,
        status: true
    });
    saveSales(sales);
    res.redirect("/sales/list");
});

app.get("/sales/list", (req, res) => {
    let sales = loadSales();
    sales = sales.filter(entry => (Number(entry.bill_amount) - Number(entry.received) - Number(entry.tds || 0)) !== 0 && entry.status !== false);
    res.render("sales_list", { sales });
});

app.post("/sales/edit/:id", (req, res) => {
    const sales = loadSales();
    const idx = sales.findIndex(e => e.id == req.params.id);
    if (idx !== -1) {
        sales[idx] = {
            ...sales[idx],
            debtors: req.body.debtors,
            date: req.body.date,
            invoice_no: req.body.invoice_no,
            review: req.body.review,
            bill_amount: parseFloat(req.body.bill_amount),
            received: req.body.received ? parseFloat(req.body.received) : 0,
            tds: req.body.tds ? parseFloat(req.body.tds) : 0
        };
    }
    saveSales(sales);
    res.redirect("/sales");
});

app.post("/sales/delete/:id", (req, res) => {
    let sales = loadSales();
    const idx = sales.findIndex(e => e.id == req.params.id);
    if (idx !== -1) {
        sales[idx].status = false;
    }
    saveSales(sales);
    res.redirect("/sales");
});

app.get("/sales/partywise", (req, res) => {
    const sales = loadSales();
    const partywise = {};
    sales.forEach(entry => {
        const pending = entry.bill_amount - entry.received - (entry.tds ? entry.tds : 0);
        if (!partywise[entry.debtors]) {
            partywise[entry.debtors] = 0;
        }
        partywise[entry.debtors] += pending;
    });
    const partywiseList = Object.entries(partywise).map(([debtors, receivable]) => ({ debtors, receivable }));
    res.render("sales_partywise", { partywiseList });
});

app.get("/sales/partywise/pdf", (req, res) => {
    const sales = loadSales();

    const partywiseMap = new Map();
    sales.forEach(sale => {
        const debtor = sale.debtors;
        if (!partywiseMap.has(debtor)) {
            partywiseMap.set(debtor, {
                debtors: debtor,
                receivable: 0,
            });
        }
        partywiseMap.get(debtor).receivable += (sale.bill_amount || 0) - (sale.received || 0);
    });

    const partywiseList = Array.from(partywiseMap.values());
    partywiseList.sort((a, b) => a.debtors.localeCompare(b.debtors));

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    function loadSales() {
        try {
            const data = fs.readFileSync(path.join(__dirname, "sales.json"), "utf8");
            return JSON.parse(data);
        } catch (error) {
            console.error("Error loading sales data:", error);
            return [];
        }
    }

    function drawHeader() {
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#333').text('Sales Party-wise Report', { align: 'center' });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#555');
        const tableTop = doc.y + 20;
        const debtorColX = 60;
        const receivableColX = 60 + 250;
        const debtorColWidth = 250;
        const receivableColWidth = 100;
        doc.rect(50, tableTop, debtorColWidth + receivableColWidth + 20, 30).fill('#4361ee');
        doc.fillColor('#fff').text('Debtor', debtorColX, tableTop + 8, { width: debtorColWidth, align: 'left' });
        doc.text('Receivable', receivableColX, tableTop + 8, { width: receivableColWidth, align: 'right' });

        return tableTop + 30;
    }

    let y = drawHeader();
    const minRowHeight = 20;
    const bottomMargin = 60;
    partywiseList.forEach((row, i) => {
        // Calculate required height for debtor name
        const debtorHeight = doc.heightOfString(row.debtors, { width: debtorColWidth, align: 'left' });
        const rowHeight = Math.max(minRowHeight, debtorHeight + 8);
        if (y + rowHeight > doc.page.height - bottomMargin) {
            doc.addPage();
            y = drawHeader();
        }
        doc.rect(60, y, debtorColWidth + receivableColWidth, rowHeight).fill(i % 2 === 0 ? '#e7f0fd' : '#fff');
        doc.fillColor('#222').fontSize(10);
        doc.text(row.debtors, debtorColX, y + 5, { width: debtorColWidth, align: 'left' });
        doc.text(row.receivable.toFixed(2), receivableColX, y + 5, { width: receivableColWidth, align: 'right' });
        y += rowHeight;
    });
    let totalReceivable = 0;
    partywiseList.forEach(row => {
        totalReceivable += row.receivable;
    });
    doc.rect(50, y, debtorColWidth + receivableColWidth + 20, 30).fill('#4361ee');
    doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold');
    doc.text('Total', debtorColX, y + 8, { width: debtorColWidth, align: 'left' });
    doc.text(totalReceivable.toFixed(2), receivableColX, y + 8, { width: receivableColWidth, align: 'right' });
    doc.fillColor('#888').fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, 0, doc.page.height - 40, { align: 'center', width: doc.page.width });
    doc.end();
});

app.get('/sales/excel/preview', (req, res) => {
    const sales = loadSales();
    res.render('sales_excel_preview', { sales });
});

app.get('/sales/excel/download', async (req, res) => {
    const sales = loadSales();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Payment Pending');
    worksheet.columns = [
        { header: 'Debtors', key: 'debtors', width: 20 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Invoice No.', key: 'invoice_no', width: 18 },
        { header: 'Review', key: 'review', width: 15 },
        { header: 'Bill Amount', key: 'bill_amount', width: 14 },
        { header: 'Credit Day', key: 'credit_day', width: 12 },
        { header: 'Received', key: 'received', width: 12 },
        { header: 'TDS', key: 'tds', width: 10 },
        { header: 'Pending', key: 'pending', width: 12 }
    ];
    sales.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(entry => {
        worksheet.addRow({
            debtors: entry.debtors,
            date: entry.date,
            invoice_no: entry.invoice_no,
            review: entry.review,
            bill_amount: entry.bill_amount,
            credit_day: daysBetweenToday(entry.date),
            received: entry.received,
            tds: entry.tds ? entry.tds : 0,
            pending: (entry.bill_amount - entry.received - (entry.tds ? entry.tds : 0)).toFixed(2)
        });
    });
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `sales_payment_pending_${yyyy}-${mm}-${dd}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
});


app.get('/sales/all/preview', (req, res) => {
    const sales = loadSales();
    res.render('sales_all_pdf', { sales });
});


app.get("/sales/all/pdf", (req, res) => {
    const sales = loadSales();

    // Calculate credit_day for each sale entry
    sales.forEach(entry => {
        entry.credit_day = Math.abs(daysBetweenToday(entry.date));
    });
    
    // Sort sales by credit_day from most to least
    sales.sort((a, b) => b.credit_day - a.credit_day);

    const doc = new PDFDocument({ layout: 'landscape', margin: 30 });
    doc.pipe(res);

    function loadSales() {
        try {
            const data = fs.readFileSync(path.join(__dirname, "sales.json"), "utf8");
            return JSON.parse(data);
        } catch (error) {
            console.error("Error loading sales data:", error);
            return [];
        }
    }

    const tableHeaders = [
        { label: 'Debtor', property: 'debtors', width: 190, align: 'left' },
        { label: 'Date', property: 'date', width: 70, align: 'left' },
        { label: 'Invoice No', property: 'invoice_no', width: 60, align: 'left' },
        { label: 'Credit Day', property: 'credit_day', width: 60, align: 'right' },
        { label: 'Bill Amount', property: 'bill_amount', width: 90, align: 'right' },
        { label: 'Received', property: 'received', width: 90, align: 'right' },
        { label: 'TDS', property: 'tds', width: 60, align: 'right' },
        { label: 'Remark', property: 'review', width: 110, align: 'center' },
        // { label: 'ID', property: 'id', width: 100, align: 'left' },
        
    ];

    function drawAllSalesHeader() {
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#333').text('Client Due Tracker (Sales)', { align: 'center' });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#555');
        const tableTop = doc.y + 20;
        let currentX = 30; // Start from left margin

        doc.rect(currentX, tableTop, doc.page.width - 2 * currentX, 30).fill('#4361ee');
        doc.fillColor('#fff');

        tableHeaders.forEach(header => {
            doc.text(header.label, currentX, tableTop + 8, { width: header.width, align: header.align });
            currentX += header.width;
        });

        return tableTop + 30;
    }

    let y = drawAllSalesHeader();
    const minRowHeight = 20;
    const bottomMargin = 60;
    const startX = 30; // Starting X for the first column

    sales.forEach((row, i) => {
        let rowHeight = minRowHeight;
        let currentX = startX;

        const cells = tableHeaders.map(header => {
            const text = String(row[header.property] !== undefined ? row[header.property] : '');
            const height = doc.heightOfString(text, { width: header.width, align: header.align });
            return { text, height, width: header.width, align: header.align, property: header.property };
        });

        rowHeight = Math.max(minRowHeight, ...cells.map(cell => cell.height + 8));

        if (y + rowHeight > doc.page.height - bottomMargin) {
            doc.addPage();
            y = drawAllSalesHeader();
        }

        doc.rect(startX, y, doc.page.width - 2 * startX, rowHeight).fill(i % 2 === 0 ? '#e7f0fd' : '#fff');
        doc.fillColor('#222').fontSize(9);

        cells.forEach(cell => {
            doc.text(cell.text, currentX, y + 5, { width: cell.width, align: cell.align });
            currentX += cell.width;
        });

        y += rowHeight;
    });

    const totalBillAmount = sales.reduce((sum, row) => sum + (row.bill_amount || 0), 0);
    const totalReceived = sales.reduce((sum, row) => sum + (row.received || 0), 0);
    const totalTDS = sales.reduce((sum, row) => sum + (row.tds || 0), 0);

    doc.rect(startX, y, doc.page.width - 2 * startX, 30).fill('#4361ee');
    doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold');

    let totalX = startX;
    doc.text('Total', totalX + 10, y + 8, { width: tableHeaders[0].width, align: 'left' });
    totalX += tableHeaders[0].width + tableHeaders[1].width + tableHeaders[2].width;

    doc.text(totalBillAmount.toFixed(2), totalX + 60, y + 8, { width: tableHeaders[4].width, align: 'right' });
    totalX += tableHeaders[3].width;
    doc.text(totalReceived.toFixed(2), totalX + 90, y + 8, { width: tableHeaders[5].width, align: 'right' });
    totalX += tableHeaders[4].width;
    doc.text(totalTDS.toFixed(2), totalX + 90, y + 8, { width: tableHeaders[6].width, align: 'right' });

    doc.fillColor('#888').fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, 0, doc.page.height - 40, { align: 'center', width: doc.page.width });
    doc.end();
});

app.get("/purchase", (req, res) => {
    let purchases = loadPurchases();
    purchases = purchases.filter(entry => entry.status !== false);
    // savePurchases(purchases); // Removed to prevent accidental deletion
    res.render("purchase_list", { purchases });
});

app.post("/purchase/new", (req, res) => {
    const purchases = loadPurchases();
    const debit_amt = req.body.debit_amt ? parseFloat(req.body.debit_amt) : 0;
    const credit_amt = parseFloat(req.body.credit_amt);
    purchases.push({
        id: Date.now(),
        creditors: req.body.creditors,
        date: req.body.date,
        invoice_no: req.body.invoice_no,
        review:req.body.review,
        debit_amt,
        credit_amt,
        status: true
    });
    savePurchases(purchases);
    res.redirect("/purchase");
});

app.post("/purchase/edit/:id", (req, res) => {
    const purchases = loadPurchases();
    const idx = purchases.findIndex(e => e.id == req.params.id);
    if (idx !== -1) {
        purchases[idx] = {
            ...purchases[idx],
            creditors: req.body.creditors,
            date: req.body.date,
            invoice_no: req.body.invoice_no,
            review:req.body.review,
            debit_amt: req.body.debit_amt ? parseFloat(req.body.debit_amt) : 0,
            credit_amt: parseFloat(req.body.credit_amt)
        };
    }
    savePurchases(purchases);
    res.redirect("/purchase");
});

app.post("/purchase/delete/:id", (req, res) => {
    let purchases = loadPurchases();
    const idx = purchases.findIndex(e => e.id == req.params.id);
    if (idx !== -1) {
        purchases[idx].status = false;
    }
    savePurchases(purchases);
    res.redirect("/purchase");
});

app.get('/purchase/excel/preview', (req, res) => {
    const purchases = loadPurchases();
    res.render('purchase_excel_preview', { purchases });
});

app.get('/purchase/excel/download', async (req, res) => {
    const purchases = loadPurchases();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Purchase Payment Pending');
    worksheet.columns = [
        { header: 'Creditors', key: 'creditors', width: 20 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Invoice No.', key: 'invoice_no', width: 18 },
        { header: 'Remark', key: 'review', width: 12 },
        { header: 'Debit Amount', key: 'debit_amt', width: 14 },
        { header: 'Credit Amount', key: 'credit_amt', width: 14 },
        { header: 'Days', key: 'days', width: 10 },
        { header: 'Pending', key: 'pending', width: 12 }
    ];
    purchases.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(entry => {
        worksheet.addRow({
            creditors: entry.creditors,
            date: entry.date,
            invoice_no: entry.invoice_no,
            review: entry.review,
            debit_amt: entry.debit_amt ? entry.debit_amt : 0,
            credit_amt: entry.credit_amt,
            days: daysBetweenToday(entry.date),
            pending: (entry.credit_amt - (entry.debit_amt ? entry.debit_amt : 0)).toFixed(2)
        });
    });
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `purchase_payment_pending_${yyyy}-${mm}-${dd}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
});

app.get('/purchase/partywise', (req, res) => {
    const purchases = loadPurchases();
    const partywise = {};
    purchases.forEach(entry => {
        const pending = entry.credit_amt - (entry.debit_amt ? entry.debit_amt : 0);
        if (!partywise[entry.creditors]) {
            partywise[entry.creditors] = { payable: 0, credit_amt: 0 };
        }
        partywise[entry.creditors].payable += pending;
        partywise[entry.creditors].credit_amt += entry.credit_amt;
    });
    const partywiseList = Object.entries(partywise).map(([creditors, data]) => ({ creditors, payable: data.payable, credit_amt: data.credit_amt }));
    res.render('purchase_partywise', { partywiseList });
});

app.get('/purchase/partywise/pdf', (req, res) => {
    const purchases = loadPurchases();
    const partywise = {};
    purchases.forEach(entry => {
        const pending = entry.credit_amt - (entry.debit_amt ? entry.debit_amt : 0);
        if (!partywise[entry.creditors]) {
            partywise[entry.creditors] = { payable: 0, credit_amt: 0 };
        }
        partywise[entry.creditors].payable += pending;
        partywise[entry.creditors].credit_amt += entry.credit_amt;
    });
    const partywiseList = Object.entries(partywise).map(([creditors, data]) => ({ creditors, payable: data.payable, credit_amt: data.credit_amt }));
    const doc = new PDFDocument({ margin: 10 });
    if (req.query.preview === '1') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="creditors_total_payable.pdf"');
    } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="creditors_total_payable.pdf"');
    }
    doc.pipe(res);
    const creditorsColX = 70;
    const creditorsColWidth = 350;
    const creditAmtColX = 0;
    const creditAmtColWidth = 0;
    const payableColX = 440;
    const payableColWidth = 150;
    function drawHeader() {
        doc.rect(0, 0, doc.page.width, 60).fill('#248a48');
        doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold').text('Creditors Total Payable', 0, 20, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        doc.fillColor('#222');
        const tableTop = 90;
        doc.roundedRect(60, tableTop, creditorsColWidth + payableColWidth , 28, 6).fill('#1eb930');
        doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold');
        doc.text('Party (Creditors)', creditorsColX, tableTop + 8, { width: creditorsColWidth, continued: true });
        // doc.text('Credit Amt', creditAmtColX, tableTop + 8, { width: creditAmtColWidth, continued: true });
        doc.text('Payable', payableColX - 40, tableTop + 8, { width: payableColWidth });
        doc.fillColor('#222').font('Helvetica');
        return tableTop + 28;
    }
    let y = drawHeader();
    const minRowHeight = 20;
    const bottomMargin = 60;
    partywiseList.forEach((row, i) => {
        const creditorsHeight = doc.heightOfString(row.creditors, { width: creditorsColWidth, align: 'left' });
        const rowHeight = Math.max(minRowHeight, creditorsHeight + 8);
        if (y + rowHeight > doc.page.height - bottomMargin) {
            doc.addPage();
            y = drawHeader();
        }
        doc.rect(60, y, creditorsColWidth +  payableColWidth, rowHeight).fill(i % 2 === 0 ? '#e7f0fd' : '#fff');
        doc.fillColor('#222').fontSize(10);
        doc.text(row.creditors, creditorsColX, y + 5, { width: creditorsColWidth, align: 'left' });
        // doc.text(row.credit_amt.toFixed(2), creditAmtColX, y + 5, { width: creditAmtColWidth, align: 'right' });
        doc.text(row.payable.toFixed(2), payableColX, y + 5, { width: payableColWidth -40, align: 'right' });
        y += rowHeight;
    });
    let totalCreditAmt = 0;
    let totalPayable = 0;
    partywiseList.forEach(row => {
        totalPayable += row.payable;
    });
    doc.rect(60, y, creditorsColWidth + creditAmtColWidth + payableColWidth, 28).fill('#248a48');
    doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold');
    doc.text('Total', creditorsColX, y + 8, { width: creditorsColWidth, align: 'left' });
    doc.text(totalPayable.toFixed(2), payableColX, y + 8, { width: payableColWidth -40, align: 'right' });
    doc.fillColor('#888').fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, 0, doc.page.height - 40, { align: 'center', width: doc.page.width });
    doc.end();
});

app.get("/purchase/all/pdf", (req, res) => {
    const purchases = loadPurchases();

    purchases.forEach(entry => {
        entry.credit_day = Math.abs(daysBetweenToday(entry.date));
    });

    purchases.sort((a, b) => b.credit_day - a.credit_day);

    const doc = new PDFDocument({ layout: 'landscape', margin: 30 });
    doc.pipe(res);

    const tableHeaders = [
        { label: 'Creditor', property: 'creditors', width: 200, align: 'left' },
        { label: 'Date', property: 'date', width: 70, align: 'left' },
        { label: 'Invoice No', property: 'invoice_no', width: 80, align: 'left' },
        { label: 'Credit Day', property: 'credit_day', width: 60, align: 'right' },
        { label: 'Debit Amount', property: 'debit_amt', width: 90, align: 'right' },
        { label: 'Credit Amount', property: 'credit_amt', width: 90, align: 'right' },
        { label: 'Remark', property: 'review', width: 110, align: 'center' },
        // { label: 'ID', property: 'id', width: 100, align: 'left' },
    ];

    function drawAllPurchasesHeader() {
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#333').text('Customer Due Tracker (Purchase)', { align: 'center' });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#555');
        const tableTop = doc.y + 20;
        let currentX = 30; // Start from left margin

        doc.rect(currentX, tableTop, doc.page.width - 2 * currentX, 30).fill('#4361ee');
        doc.fillColor('#fff');

        tableHeaders.forEach(header => {
            doc.text(header.label, currentX, tableTop + 8, { width: header.width, align: header.align });
            currentX += header.width;
        });

        return tableTop + 30;
    }

    let y = drawAllPurchasesHeader();
    const minRowHeight = 20;
    const bottomMargin = 60;
    const startX = 30; // Starting X for the first column

    purchases.forEach((row, i) => {
        let rowHeight = minRowHeight;
        let currentX = startX;

        const cells = tableHeaders.map(header => {
            const text = String(row[header.property] !== undefined ? row[header.property] : '');
            const height = doc.heightOfString(text, { width: header.width, align: header.align });
            return { text, height, width: header.width, align: header.align, property: header.property };
        });

        rowHeight = Math.max(minRowHeight, ...cells.map(cell => cell.height + 8));

        if (y + rowHeight > doc.page.height - bottomMargin) {
            doc.addPage();
            y = drawAllPurchasesHeader();
        }

        doc.rect(startX, y, doc.page.width - 2 * startX, rowHeight).fill(i % 2 === 0 ? '#e7f0fd' : '#fff');
        doc.fillColor('#222').fontSize(9);

        cells.forEach(cell => {
            doc.text(cell.text, currentX, y + 5, { width: cell.width, align: cell.align });
            currentX += cell.width;
        });

        y += rowHeight;
    });

    const totalDebitAmount = purchases.reduce((sum, row) => sum + (row.debit_amt || 0), 0);
    const totalCreditAmount = purchases.reduce((sum, row) => sum + (row.credit_amt || 0), 0);

    doc.rect(startX, y, doc.page.width - 2 * startX, 30).fill('#4361ee');
    doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold');

    let totalX = startX;
    doc.text('Total', totalX + 10, y + 8, { width: tableHeaders[0].width, align: 'left' });
    totalX += tableHeaders[0].width + tableHeaders[1].width + tableHeaders[2].width + tableHeaders[3].width;

    doc.text(totalDebitAmount.toFixed(2), totalX + 0, y + 8, { width: tableHeaders[4].width, align: 'right' });
    totalX += tableHeaders[4].width;
    doc.text(totalCreditAmount.toFixed(0), totalX +0, y + 8, { width: tableHeaders[5].width, align: 'right' });

    doc.fillColor('#888').fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, 0, doc.page.height - 40, { align: 'center', width: doc.page.width });
    doc.end();
});

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// Update all sales filters to use the same robust logic
app.get("/advance_payment", (req, res) => {
    let advancePayment = loadAdvancePayment();
    // Remove entries where pending is 0
    advancePayment = advancePayment.filter(entry => (Number(entry.bill_amount) !== 0));
    saveAdvancePayment(advancePayment); // Persist the filtered list
    res.render("advance_payment", { advancePayment });
});

app.post("/advance_payment/new", (req, res) => {
    const advancePayment = loadAdvancePayment();
    const bill_amount = parseFloat(req.body.bill_amount);
    const paid_amount = parseFloat(req.body.paid_amount);
    advancePayment.push({
        id: Date.now(),
        debtors: req.body.debtors,
        date: req.body.date,
        bill_amount,
        paid_amount,
        review:req.body.review
    });
    // Remove entries where pending is 0
    const filtered = advancePayment.filter(entry => (Number(entry.bill_amount) !== 0));
    saveAdvancePayment(filtered);
    res.redirect("/advance_payment");
});

app.get("/advance_payment/list", (req, res) => {
    let advancePayment = loadAdvancePayment();
    // Remove entries where pending is 0
    advancePayment = advancePayment.filter(entry => (Number(entry.bill_amount) !== 0));
    saveAdvancePayment(advancePayment); // Persist the filtered list
    res.render("advance_payment", { advancePayment });
});

app.post("/advance_payment/edit/:id", (req, res) => {
    const advancePayment = loadAdvancePayment();
    const idx = advancePayment.findIndex(e => e.id == req.params.id);
    if (idx !== -1) {
        advancePayment[idx] = {
            ...advancePayment[idx],
            debtors: req.body.debtors,
            date: req.body.date,
            review:req.body.review,
            bill_amount: parseFloat(req.body.bill_amount),
            paid_amount: parseFloat(req.body.paid_amount),
        };
    }
    // Remove entries where pending is 0
    const filtered = advancePayment.filter(entry => (Number(entry.bill_amount) !== 0));
    saveAdvancePayment(filtered);
    res.redirect("/advance_payment");
});

app.post("/advance_payment/delete/:id", (req, res) => {
    let advancePayment = loadAdvancePayment();
    advancePayment = advancePayment.filter(e => e.id != req.params.id);
    saveAdvancePayment(advancePayment);
    res.redirect("/advance_payment");
});


app.get('/advance_payment/excel/preview', (req, res) => {
    const advancePayment = loadAdvancePayment();
    res.render('advance_payment_excel_preview', { advancePayment });
});

app.get('/advance_payment/excel/download', async (req, res) => {
    const advancePayment = loadAdvancePayment();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Advance Payment Received');
    worksheet.columns = [
        { header: 'Debtors', key: 'debtors', width: 20 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Bill Amount', key: 'bill_amount', width: 18 },
        { header: 'Paid Amount', key: 'paid_amount', width: 18 },
        { header: 'Remark', key: 'review', width: 20 },
    ];
    advancePayment.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(entry => {
        worksheet.addRow({
            debtors: entry.debtors,
            date: entry.date,
            bill_amount: entry.bill_amount,
            paid_amount: entry.paid_amount,
            review: entry.review,
        });
    });
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `advance_payment_received_${yyyy}-${mm}-${dd}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
});

app.get('/advance_payment/partywise', (req, res) => {
    const advancePayment = loadAdvancePayment();
    const partywise = {};
    advancePayment.forEach(entry => {
        const pending = entry.bill_amount;
        if (!partywise[entry.debtors]) {
            partywise[entry.debtors] = { payable: 0 };
        }
            partywise[entry.debtors].payable += pending;
    });
    const partywiseList = Object.entries(partywise).map(([debtors, data]) => ({ debtors, payable: data.payable }));
    res.render('advance_payment_partywise', { partywiseList });
});

app.get('/advance_payment/partywise/pdf', (req, res) => {
    const advancePayment = loadAdvancePayment();
    const partywise = {};
    advancePayment.forEach(entry => {
        const pending = entry.bill_amount;
        if (!partywise[entry.debtors]) {
            partywise[entry.debtors] = { payable: 0 };
        }
        partywise[entry.debtors].payable += pending;
    });
    const partywiseList = Object.entries(partywise).map(([debtors, data]) => ({ debtors, payable: data.payable }));
    const doc = new PDFDocument({ margin: 10 });
    if (req.query.preview === '1') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="advance_total_received.pdf"');
    } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="advance_total_received.pdf"');
    }
    doc.pipe(res);
    const debtorsColX = 70;
    const debtorsColWidth = 350;
    const receivedColX = 430;
    const receivedColWidth = 120;
    function drawHeader() {
        doc.rect(0, 0, doc.page.width, 60).fill('#7b34df');
        doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold').text('Advance Total Received', 0, 20, { align: 'center', width: doc.page.width });
        doc.moveDown(2);
        doc.fillColor('#222');
        const tableTop = 90;
        doc.roundedRect(60, tableTop, debtorsColWidth + receivedColWidth, 28, 6).fill('#8d25e1');
        doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold');
        doc.text('Party (Debtors)', debtorsColX, tableTop + 8, { width: debtorsColWidth, continued: true });
        doc.text('Received', receivedColX, tableTop + 8, { width: receivedColWidth });
        doc.fillColor('#222').font('Helvetica');
        return tableTop + 28;
    }
    let y = drawHeader();
    const minRowHeight = 20;
    const bottomMargin = 60;
    partywiseList.forEach((row, i) => {
        const debtorsHeight = doc.heightOfString(row.debtors, { width: debtorsColWidth, align: 'left' });
        const rowHeight = Math.max(minRowHeight, debtorsHeight + 8);
        if (y + rowHeight > doc.page.height - bottomMargin) {
            doc.addPage();
            y = drawHeader();
        }
        doc.rect(60, y, debtorsColWidth + receivedColWidth, rowHeight).fill(i % 2 === 0 ? '#e7f0fd' : '#fff');
        doc.fillColor('#222').fontSize(10);
        doc.text(row.debtors, debtorsColX, y + 5, { width: debtorsColWidth, align: 'left' });
        doc.text(row.payable.toFixed(2), receivedColX, y + 5, { width: receivedColWidth, align: 'right' });
        y += rowHeight;
    });
    let totalReceived = 0;
    partywiseList.forEach(row => {
        totalReceived += row.payable;
    });
    doc.rect(60, y, debtorsColWidth + receivedColWidth, 28).fill('#7b34df');
    doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold');
    doc.text('Total', debtorsColX, y + 8, { width: debtorsColWidth, align: 'left' });
    doc.text(totalReceived.toFixed(2), receivedColX, y + 8, { width: receivedColWidth, align: 'right' });
    doc.fillColor('#888').fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, 0, doc.page.height - 40, { align: 'center', width: doc.page.width });
    doc.end();
});


app.get('/analysis',(req,res)=>{
    res.render('analysis_sales_purchase')
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
