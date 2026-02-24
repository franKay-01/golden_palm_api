const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const schedule = require('node-schedule');

const router = express.Router();

const { Orders, OrderItems, Products, CuratedBundles, Categories, sequelize } = require('../../models');
const { dateFormat, sendSalesEmail, sendTrackingEmail, sendReviewEmail } = require('../../utils');
const { authenticateJWT } = require('../../middleware/authenticate')

// Function to clean up PDF files older than 24 hours
const cleanupOldPDFs = () => {
  try {
    const orderListsDir = path.join(__dirname, '../../uploads/orderLists');
    
    if (!fs.existsSync(orderListsDir)) {
      return; // Directory doesn't exist, nothing to clean
    }

    const files = fs.readdirSync(orderListsDir);
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    let deletedCount = 0;

    files.forEach(file => {
      if (file.endsWith('.pdf')) {
        const filePath = path.join(orderListsDir, file);
        
        try {
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.mtime.getTime();

          if (fileAge > twentyFourHours) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`Deleted old PDF: ${file}`);
          }
        } catch (err) {
          console.error(`Error processing file ${file}:`, err.message);
        }
      }
    });

    if (deletedCount > 0) {
      console.log(`Cleanup completed: ${deletedCount} PDF file(s) deleted`);
    }
  } catch (err) {
    console.error('Error during PDF cleanup:', err);
  }
};

// Schedule cleanup to run every hour
schedule.scheduleJob('0 * * * *', cleanupOldPDFs);

// Also run cleanup on startup
cleanupOldPDFs();

router.get('/', async (req, res, next) => {
  try{
    const orders = await Orders.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: OrderItems,
          as: 'orderItems'
        }
      ]
    })

    // Manually fetch products/bundles for each order item
    for (const order of orders) {
      for (const item of order.orderItems) {
        if (item.item_type === 'product') {
          item.dataValues.itemDetails = await Products.findOne({
            where: { sku: item.item_reference_no },
            include: [{ model: Categories, as: 'categories' }]
          });
        } else if (item.item_type === 'bundle') {
          // Fetch bundle details
          item.dataValues.itemDetails = await CuratedBundles.findOne({
            where: { bundle_id: item.item_reference_no }
          });

          // Fetch bundle contents from order_bundle_items
          const bundleContents = await sequelize.query(
            `SELECT product_sku, product_name, product_price, product_img_url, is_hot
             FROM order_bundle_items
             WHERE order_item_id = :order_item_id
             ORDER BY id`,
            {
              replacements: { order_item_id: item.id },
              type: sequelize.QueryTypes.SELECT
            }
          );

          item.dataValues.bundleContents = bundleContents;
        }
      }
    }

    return res.status(200).json({
      response_code: '000',
      orders,
      response_message: 'Orders retrieved successfully'
    })
  }catch(err){
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    })
  }
})

router.get('/customer', authenticateJWT, async (req, res, next) => {
  try{
    const orders = await Orders.findAll({
      where: { user_reference_no: req.user.id },
      include: [
        {
          model: OrderItems,
          as: 'orderItems'
        }
      ],
    })

    // Manually fetch products/bundles for each order item
    for (const order of orders) {
      for (const item of order.orderItems) {
        if (item.item_type === 'product') {
          item.dataValues.itemDetails = await Products.findOne({
            where: { sku: item.item_reference_no },
            include: [{ model: Categories, as: 'categories' }]
          });
        } else if (item.item_type === 'bundle') {
          // Fetch bundle details
          item.dataValues.itemDetails = await CuratedBundles.findOne({
            where: { bundle_id: item.item_reference_no }
          });

          // Fetch bundle contents from order_bundle_items
          const bundleContents = await sequelize.query(
            `SELECT product_sku, product_name, product_price, product_img_url, is_hot
             FROM order_bundle_items
             WHERE order_item_id = :order_item_id
             ORDER BY id`,
            {
              replacements: { order_item_id: item.id },
              type: sequelize.QueryTypes.SELECT
            }
          );

          item.dataValues.bundleContents = bundleContents;
        }
      }
    }

    return res.json({
      response_code: 200,
      orders
    })

  }catch(err){
    res.status(err.status || 500)
    res.json({
      error: {
        message: err.message
      }
    })
  }

})

router.post('/', authenticateJWT,  async (req, res, next) => {
  const { order_items, order } = req.body
  try{
    const user_reference_no = req.user.email
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const order_custom_id = user_reference_no + '-' + dateFormat() + '-' + randomSuffix

    const order_info = await Orders.create({
      order_custom_id,
      user_reference_no,
      quantity: order.quantity,
      amount: order.amount,
      other_info: order.other_info
    })

    const order_reference_no = order_info.reference_no

    for (const order_item of order_items) {
      const { item_reference_no, item_type, quantity, unit_amount, desc, heat_level } = order_item;

      await OrderItems.create({
        order_reference_no,
        item_reference_no,
        item_type: item_type || 'product',
        quantity,
        unit_amount,
        desc: desc || 'Product',
        heat_level: heat_level || null
      })
    }

    res.status(200).json({
      response_code: '000',
      response_message: "Order placement process started. You'll be notified via email",
      order_reference_no
    })
  }catch(err){
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    })
  }
})

router.get('/:reference_no/confirmation', async (req, res, next) => {
  const { reference_no } = req.params;

  try {
    const order = await Orders.findOne({
      where: { reference_no },
      include: [
        {
          model: OrderItems,
          as: 'orderItems'
        }
      ],
    });

    if (!order) {
      return res.status(404).json({
        response_code: '001',
        error: {
          message: 'Order not found'
        }
      });
    }

    // Manually fetch products/bundles for each order item
    if (order.orderItems) {
      for (const item of order.orderItems) {
        if (item.item_type === 'product') {
          item.dataValues.itemDetails = await Products.findOne({
            where: { sku: item.item_reference_no },
            include: [{ model: Categories, as: 'categories' }]
          });
        } else if (item.item_type === 'bundle') {
          item.dataValues.itemDetails = await CuratedBundles.findOne({
            where: { bundle_id: item.item_reference_no }
          });

          const bundleContents = await sequelize.query(
            `SELECT product_sku, product_name, product_price, product_img_url, is_hot
             FROM order_bundle_items
             WHERE order_item_id = :order_item_id
             ORDER BY id`,
            {
              replacements: { order_item_id: item.id },
              type: sequelize.QueryTypes.SELECT
            }
          );

          item.dataValues.bundleContents = bundleContents;
        }
      }
    }

    // Create orderLists directory if it doesn't exist
    const orderListsDir = path.join(__dirname, '../../uploads/orderLists');
    if (!fs.existsSync(orderListsDir)) {
      fs.mkdirSync(orderListsDir, { recursive: true });
    }

    // Clean up old PDFs (older than 24 hours) when generating new ones
    cleanupOldPDFs();

    // Check if PDF already exists
    const fileName = `order-confirmation-${order.order_custom_id}.pdf`;
    const filePath = path.join(orderListsDir, fileName);
    const fileUrl = `/uploads/orderLists/${fileName}`;

    // If file already exists, return the URL immediately
    if (fs.existsSync(filePath)) {
      return res.json({
        response_code: '000',
        response_message: 'Order confirmation PDF retrieved successfully',
        pdf_url: fileUrl,
        order_custom_id: order.order_custom_id
      });
    }

    // Create PDF document - prevent extra pages
    const doc = new PDFDocument({ 
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    // Track if we're on the first page to prevent extra pages
    let isFirstPage = true;

    // Create write stream to save PDF to file
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Logo path
    const logoPath = path.join(__dirname, '../../assets/logo.jpeg');
    
    // Header section - Logo with proper aspect ratio
    const logoWidth = 120;
    const logoHeight = 50; // Maintain reasonable aspect ratio
    const logoY = 50;
    
    if (fs.existsSync(logoPath)) {
      // Use fit option to maintain aspect ratio and prevent stretching
      doc.image(logoPath, 50, logoY, { 
        fit: [logoWidth, logoHeight],
        align: 'left',
        valign: 'top'
      });
    }
    
    // Contact info (right side of header)
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('black')
       .text('hello@goldenpalmfoods.com', 400, 70, { align: 'right' });

    // "Thank you for your order!"
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('black')
       .text('Thank you for your order!', 50, logoY + logoHeight + 25);

    // Order Confirmation Box - adjust position based on new header height
    const boxX = 400;
    const boxY = logoY + logoHeight + 25; // Align with "Thank you" text
    const boxWidth = 150;
    const boxHeight = 60;

    doc.rect(boxX, boxY, boxWidth, boxHeight)
       .fillColor('#445717')
       .fill();

    doc.fillColor('white')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('ORDER', boxX + 10, boxY + 5, { width: boxWidth - 20, align: 'center' })
       .text('CONFIRMATION', boxX + 10, boxY + 18, { width: boxWidth - 20, align: 'center' });

    doc.fontSize(8)
       .font('Helvetica')
       .text(`ORDER #: ${order.order_custom_id}`, boxX + 10, boxY + 35)
       .text(`SHIPMENT: 1 of 1`, boxX + 10, boxY + 48);

    // Reset fill color
    doc.fillColor('black');

    // Address section - adjust starting position
    let yPos = logoY + logoHeight + 90; // Start below header section

    // Parse shipping address from other_info JSON
    let shippingAddress = {
      company: 'GOLDEN PALM FOODS LLC',
      street: '9 N 125TH AVE',
      cityStateZip: 'AVONDALE AZ 85323-8260',
      country: 'US'
    };

    if (order.other_info) {
      try {
        const info = JSON.parse(order.other_info);
        const addr = info.shippingAddress || {};
        if (addr.line1) {
          shippingAddress.company = info.customerName || 'N/A';
          shippingAddress.street = addr.line1 + (addr.line2 ? ` ${addr.line2}` : '');
          shippingAddress.cityStateZip = `${addr.city || ''} ${addr.state || ''} ${addr.postal_code || ''}`.trim();
          shippingAddress.country = addr.country || 'US';
        }
      } catch (e) {
        // Fallback for legacy format
        const addressPart = order.other_info.split('|')[0];
        const addressParts = addressPart.split(',');
        if (addressParts.length >= 2) {
          shippingAddress.company = addressParts[0].trim();
          shippingAddress.cityStateZip = addressParts[1].trim();
          shippingAddress.street = addressParts[2].trim();
        }
      }
    }

    // SHIP TO section
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('black')
       .text('SHIP TO:', 50, yPos);

    doc.font('Helvetica')
       .fillColor('black')
       .text(shippingAddress.company, 50, yPos + 15)
       .text(shippingAddress.street, 50, yPos + 30)
       .text(shippingAddress.cityStateZip, 50, yPos + 45)
       .text(shippingAddress.country, 50, yPos + 60);

    // Order details table header - adjust position
    yPos = yPos + 80; // Add more space after address section
    const tableStartX = 50;
    const colWidths = [200, 80, 80, 80]; // Increased CUSTOMER column width from 100 to 200
    const headerHeight = 25;
    
    // Calculate full page width (Letter: 612pt - 50pt left margin - 50pt right margin = 512pt)
    const pageWidth = 612;
    const leftMargin = 50;
    const rightMargin = 50;
    const fullWidth = pageWidth - leftMargin - rightMargin; // 512 points

    // Draw header background - full width
    doc.rect(tableStartX, yPos, fullWidth, headerHeight)
       .fillColor('#445717')
       .fill();

    // Header text
    doc.fillColor('white')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('CUSTOMER', tableStartX + 5, yPos + 8, { width: colWidths[0] - 10 })
       .text('SHIP VIA', tableStartX + colWidths[0] + 5, yPos + 8, { width: colWidths[1] - 10 })
       .text('ORDER DATE', tableStartX + colWidths[0] + colWidths[1] + 5, yPos + 8, { width: colWidths[2] - 10 })
       .text('SHIP DATE', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPos + 8, { width: colWidths[3] - 10 })

    doc.fillColor('black');

    // Order details row
    yPos += headerHeight;
    const orderDate = new Date(order.createdAt);
    const shipDate = new Date(order.createdAt);
    shipDate.setDate(shipDate.getDate() + 1);

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('black')
       .text(order.user_reference_no || 'N/A', tableStartX + 5, yPos + 8, { width: colWidths[0] - 10 })
       .text('USPS', tableStartX + colWidths[0] + 5, yPos + 8, { width: colWidths[1] - 10 })
       .text(orderDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }), tableStartX + colWidths[0] + colWidths[1] + 5, yPos + 8, { width: colWidths[2] - 10 })
       .text('5 - 7 days', tableStartX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPos + 8, { width: colWidths[3] - 10 })

    // Item details table header
    yPos += 30;
    const itemColWidths = [60, 80, 200, 70, 70]; // Removed U/M column (was 50)
    const itemHeaderHeight = 25;

    // Draw header background - full width
    doc.rect(tableStartX, yPos, fullWidth, itemHeaderHeight)
       .fillColor('#445717')
       .fill();

    doc.fillColor('white')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('QUANTITY', tableStartX + 5, yPos + 8, { width: itemColWidths[0] - 10 })
       .text('ITEM NUMBER', tableStartX + itemColWidths[0] + 5, yPos + 8, { width: itemColWidths[1] - 10 })
       .text('DESCRIPTION', tableStartX + itemColWidths[0] + itemColWidths[1] + 5, yPos + 8, { width: itemColWidths[2] - 10 })
       .text('UNIT PRICE', tableStartX + itemColWidths[0] + itemColWidths[1] + itemColWidths[2] + 5, yPos + 8, { width: itemColWidths[3] - 10 })
       .text('EXT. PRICE', tableStartX + itemColWidths[0] + itemColWidths[1] + itemColWidths[2] + itemColWidths[3] + 5, yPos + 8, { width: itemColWidths[4] - 10 });

    doc.fillColor('black');

    // Item rows
    yPos += itemHeaderHeight;
    let subtotal = 0;
    
    // Maximum usable page height (Letter: 792pt - 50pt top margin - 50pt bottom margin = 692pt)
    const maxPageHeight = 692;
    let itemRowHeight = 18; // Reduced from 20 to fit more content

    for (const item of order.orderItems) {
      // Check if we're approaching page limit - adjust spacing if needed
      const estimatedRemainingHeight = yPos + 200; // Estimate for financial summary + notes
      if (estimatedRemainingHeight > maxPageHeight) {
        // Reduce spacing if getting close to page limit
        itemRowHeight = 16;
      }
      
      const itemDetails = item.itemDetails;
      const description = item.desc || (itemDetails ? itemDetails.name || itemDetails.title : 'Product');
      const itemNumber = item.item_reference_no.substring(0, 10) || 'N/A';
      const quantity = item.quantity || 1;
      const unitPrice = parseFloat(item.unit_amount) || 0;
      const extPrice = quantity * unitPrice;
      subtotal += extPrice;

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('black')
         .text(quantity.toString(), tableStartX + 5, yPos + 8, { width: itemColWidths[0] - 10 })
         .text(itemNumber, tableStartX + itemColWidths[0] + 5, yPos + 8, { width: itemColWidths[1] - 10 })
         .text(description.substring(0, 50), tableStartX + itemColWidths[0] + itemColWidths[1] + 5, yPos + 8, { width: itemColWidths[2] - 10 })
         .text(`$${unitPrice.toFixed(2)}`, tableStartX + itemColWidths[0] + itemColWidths[1] + itemColWidths[2] + 5, yPos + 8, { width: itemColWidths[3] - 10 })
         .text(`$${extPrice.toFixed(2)} T`, tableStartX + itemColWidths[0] + itemColWidths[1] + itemColWidths[2] + itemColWidths[3] + 5, yPos + 8, { width: itemColWidths[4] - 10 });

      yPos += itemRowHeight;
    }

    // Financial summary
    yPos += 20;
    
    // Extract tax and shipping from other_info
    let salesTax = 0;
    let shipping = 11.00; // Default shipping cost
    let total = parseFloat(order.amount) || subtotal;

    if (order.other_info) {
      try {
        const info = JSON.parse(order.other_info);
        salesTax = parseFloat(info.tax) || 0;
        shipping = parseFloat(info.shipping) || 11.00;
        total = parseFloat(info.total) || (subtotal + salesTax + shipping);
      } catch (e) {
        // Fallback for legacy pipe-delimited format
        if (order.other_info.includes('|')) {
          const parts = order.other_info.split('|');
          if (parts.length >= 4) {
            salesTax = parseFloat(parts[1]) || 0;
            shipping = parseFloat(parts[2]) || 11.00;
            total = parseFloat(parts[3]) || (subtotal + salesTax + shipping);
          }
        }
      }
    } else {
      // Fallback: Calculate tax if not stored
      const orderAmount = parseFloat(order.amount) || subtotal;
      if (orderAmount > subtotal) {
        const difference = orderAmount - subtotal;
        if (difference >= shipping) {
          salesTax = difference - shipping;
        } else {
          salesTax = difference;
        }
      } else {
        // Use default tax rate if order amount not available
        const taxRate = 0.139; // Approximate tax rate (13.9% based on example)
        salesTax = subtotal * taxRate;
        total = subtotal + salesTax + shipping;
      }
    }

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('black')
       .text(`SUB-TOTAL:`, tableStartX + 350, yPos, { width: 100 })
       .text(`$${subtotal.toFixed(2)}`, tableStartX + 450, yPos, { width: 80, align: 'right' })
       .text(`SALES TAX:`, tableStartX + 350, yPos + 18, { width: 100 })
       .text(`$${salesTax.toFixed(2)}`, tableStartX + 450, yPos + 18, { width: 80, align: 'right' })
       .text(`SHIPPING/HANDLING:`, tableStartX + 350, yPos + 36, { width: 100 })
       .text(`$${shipping.toFixed(2)}`, tableStartX + 450, yPos + 36, { width: 80, align: 'right' })
       .font('Helvetica-Bold')
       .fillColor('black')
       .text(`TOTAL:`, tableStartX + 350, yPos + 62, { width: 100 })
       .text(`$${total.toFixed(2)}`, tableStartX + 450, yPos + 62, { width: 80, align: 'right' });

    // // Notes section - adjust spacing to fit on one page
    // yPos += 75; // Increased spacing after financial summary
    // doc.moveTo(tableStartX, yPos)
    //    .lineTo(tableStartX + 480, yPos)
    //    .stroke();

    // yPos += 12;
    // doc.fontSize(9)
    //    .font('Helvetica')
    //    .fillColor('black')
    //    .text('NOTE:', tableStartX, yPos, { width: 480 })
    //    .text(`DELIVERY TIME 1 BUSINESS DAY VIA UPS GROUND.`, tableStartX, yPos + 14, { width: 480 })
    //    .text(`SHIPMENT #1 WILL SHIP ${shipDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`, tableStartX, yPos + 28, { width: 480 })
    //    .text(`ATTENTION: ${order.user_reference_no}`, tableStartX, yPos + 42, { width: 480 })
    //    .text(`T - DENOTES A TAXABLE ITEM`, tableStartX, yPos + 56, { width: 480 })
    //    .text(`THANK YOU FOR YOUR ORDER. GOLDEN PALM FOODS' TERMS AND CONDITIONS APPLY.`, tableStartX, yPos + 70, { width: 480 });

    // Footer - position dynamically based on content, ensure it's within page bounds
    // Letter size: 792 points, margins: 50 top/bottom = 692 usable height
    const footerY = Math.min(yPos + 90, 742); // Max at 742 (792 - 50 margin)
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('black')
       .text('Page 1 of 1', tableStartX + 400, footerY, { align: 'right' });

    // Finalize PDF
    doc.end();

    // Wait for PDF to be written to file
    writeStream.on('finish', () => {
      return res.json({
        response_code: '000',
        response_message: 'Order confirmation PDF generated successfully',
        pdf_url: fileUrl,
        order_custom_id: order.order_custom_id
      });
    });

    writeStream.on('error', (err) => {
      console.error('Error writing PDF file:', err);
      return res.status(500).json({
        response_code: '001',
        error: {
          message: 'Failed to save PDF file'
        }
      });
    });

  } catch (err) {
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    });
  }
});

router.get('/:reference_no', async (req, res, next) => {
  const {reference_no} = req.params;

  try{
    const orders = await Orders.findOne({
      where: { reference_no },
      include: [
        {
          model: OrderItems,
          as: 'orderItems'
        }
      ],
    })

    // Manually fetch products/bundles for each order item
    if (orders && orders.orderItems) {
      for (const item of orders.orderItems) {
        if (item.item_type === 'product') {
          item.dataValues.itemDetails = await Products.findOne({
            where: { sku: item.item_reference_no },
            include: [{ model: Categories, as: 'categories' }]
          });
        } else if (item.item_type === 'bundle') {
          // Fetch bundle details
          item.dataValues.itemDetails = await CuratedBundles.findOne({
            where: { bundle_id: item.item_reference_no }
          });

          // Fetch bundle contents from order_bundle_items
          const bundleContents = await sequelize.query(
            `SELECT product_sku, product_name, product_price, product_img_url, is_hot
             FROM order_bundle_items
             WHERE order_item_id = :order_item_id
             ORDER BY id`,
            {
              replacements: { order_item_id: item.id },
              type: sequelize.QueryTypes.SELECT
            }
          );

          item.dataValues.bundleContents = bundleContents;
        }
      }
    }

    return res.status(200).json({
      response_code: "000",
      orders
    })
  }catch(err){
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    })
  }
})

router.patch('/:id', (req, res, next) => {
  const animalId = req.params.id;
  res.status(200).json({
    message: `Updated animal record`
  })
})

router.delete('/:id', (req, res, next) => {
  const animalId = req.params.id;
  res.status(200).json({
    message: `Updated animal record`
  })
})

router.post('/send-receipt', async (req, res, next) => {
  const { email, order_reference_no } = req.body;

  try {
    if (!email || !order_reference_no) {
      return res.status(400).json({
        response_code: '001',
        error: {
          message: 'Email and order_reference_no are required'
        }
      });
    }

    // Verify order exists
    const order = await Orders.findOne({
      where: { reference_no: order_reference_no }
    });

    if (!order) {
      return res.status(404).json({
        response_code: '001',
        error: {
          message: 'Order not found'
        }
      });
    }

    // Send the sales email
    await sendSalesEmail(email, order_reference_no);

    return res.status(200).json({
      response_code: '000',
      response_message: 'Receipt sent successfully'
    });
  } catch (err) {
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    });
  }
});

router.post('/send-tracking', async (req, res, next) => {
  const { order_reference_no, tracking_id } = req.body;

  try {
    if (!order_reference_no || !tracking_id) {
      return res.status(400).json({
        response_code: '001',
        error: {
          message: 'order_reference_no and tracking_id are required'
        }
      });
    }

    // Verify order exists
    const order = await Orders.findOne({
      where: { reference_no: order_reference_no }
    });

    if (!order) {
      return res.status(404).json({
        response_code: '001',
        error: {
          message: 'Order not found'
        }
      });
    }

    // Send the tracking email
    const result = await sendTrackingEmail(order_reference_no, tracking_id);

    if (!result) {
      return res.status(500).json({
        response_code: '001',
        error: {
          message: 'Failed to send tracking email'
        }
      });
    }

    return res.status(200).json({
      response_code: '000',
      response_message: 'Tracking email sent successfully'
    });
  } catch (err) {
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    });
  }
});

router.post('/send-review', async (req, res, next) => {
  const { email, order_reference_no } = req.body;

  try {
    // Validate input
    if (!email || !order_reference_no) {
      return res.status(400).json({
        response_code: '001',
        response_message: 'Email and order reference number are required'
      });
    }

    // Check if order exists
    const order = await Orders.findOne({
      where: { reference_no: order_reference_no }
    });

    if (!order) {
      return res.status(404).json({
        response_code: '001',
        response_message: 'Order not found'
      });
    }

    // Check if review email was already sent
    if (order.review_email_sent) {
      return res.status(200).json({
        response_code: '002',
        response_message: 'Review email was already sent for this order'
      });
    }

    // Send review email
    const emailSent = await sendReviewEmail(email, order_reference_no);

    if (!emailSent) {
      return res.status(500).json({
        response_code: '001',
        response_message: 'Failed to send review email'
      });
    }

    // Mark review email as sent
    order.review_email_sent = true;
    await order.save();

    res.status(200).json({
      response_code: '000',
      response_message: 'Review email sent successfully'
    });
  } catch (err) {
    res.status(err.status || 500).json({
      response_code: '001',
      error: {
        message: err.message
      }
    });
  }
});

module.exports = router;