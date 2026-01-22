const sgMail = require('@sendgrid/mail')
const jwt = require('jsonwebtoken');
const { Orders, OrderItems, Products, CuratedBundles } = require('../models');
require('dotenv').config();

exports.dateFormat = () => {
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based
  const year = today.getFullYear().toString();

  const formattedDate = day + month + year;

  return formattedDate;
}

exports.sendSalesEmail = async (recipient, reference_no) => {

  const orders = await Orders.findOne({
    where: { reference_no },
    include: [
      {
        model: OrderItems,
        as: 'orderItems'
      }
    ],
  })

  console.log("ORDERS ", JSON.stringify(orders))
  // Manually fetch product/bundle details for each order item
  for (const item of orders.orderItems) {
    if (item.item_type === 'product') {
      item.dataValues.itemDetails = await Products.findOne({
        where: { sku: item.item_reference_no }
      });
    } else if (item.item_type === 'bundle') {
      item.dataValues.itemDetails = await CuratedBundles.findOne({
        where: { bundle_id: item.item_reference_no }
      });

      // Fetch bundle contents from order_bundle_items
      const { sequelize } = require('../models');
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

  // Generate order items HTML for new template
  let orderItemsHtml = '';
  let totalAmount = 0;

  orders.orderItems.forEach((item, index) => {
    const details = item.dataValues.itemDetails || {};
    const bundleContents = item.dataValues.bundleContents || [];
    const itemTotal = parseFloat(item.unit_amount) * parseInt(item.quantity || 1);
    totalAmount += itemTotal;

    let itemName = item.desc || details.name || 'Product';
    if (item.heat_level) {
      itemName += ` (${item.heat_level})`;
    }

    // If bundle, append bundle contents to item name
    if (item.item_type === 'bundle' && bundleContents.length > 0) {
      itemName += ` - Includes: ${bundleContents.map(p => p.product_name).join(', ')}`;
    }

    orderItemsHtml += `
    <tr>
      <td bgcolor="#FFF" width="40" align="left" style="color:#5a5a5a;padding:10px 0 10px 0;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;">
      </td>
      <td bgcolor="#FFFFFF" align="left" style="color:#5a5a5a;padding:10px 40px 10px 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:normal;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;">
         ${itemName} (${item.quantity || 1})
      </td>
      <td bgcolor="#FFFFFF" align="right" style="color:#5a5a5a;padding:10px 40px 10px 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;">
         $${itemTotal.toFixed(2)}
      </td>
      <td bgcolor="#FFF" width="40" align="left" style="color:#5a5a5a;padding:10px 0 10px 0;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;">
      </td>
    </tr>`;
  });

  // Parse address from other_info
  const addressParts = orders.other_info ? orders.other_info.split(',') : [];
  const deliveryAddress = addressParts.length >= 2 ? `${addressParts[1]}, ${addressParts[0]}` : 'N/A';
  const customerEmail = addressParts.length >= 3 ? addressParts[2] : orders.user_reference_no;

  let newContent = `
  <!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="robots" content="noindex, nofollow">
<title>Invoice Email</title>
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">
<style>
body {
    margin: 0;
    padding: 0;
    mso-line-height-rule: exactly;
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
   }
 body, table, td, p, a, li {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
    font-family: 'Lato', Arial, Helvetica, sans-serif;
}
 table td {
    border-collapse: collapse;
}
 table {
    border-spacing: 0;
    border-collapse: collapse;
    border-color: #FFFFFF;
}
 p, a, li, td, blockquote {
    mso-line-height-rule: exactly;
}
 p, a, li, td, body, table, blockquote {
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
}
 img, a img {
    border: 0;
    outline: none;
    text-decoration: none;
}
 img {
    -ms-interpolation-mode: bicubic;
}
 * img[tabindex="0"] + div {
    display: none !important;
}
 a[href^=tel],a[href^=sms],a[href^=mailto], a[href^=date] {
    color: inherit;
    cursor: default;
    text-decoration: none;
}
 a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
    font-size: inherit !important;
    font-family: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important}
 .logo {
    width: 220px!important;
    height: 35px!important;
}
 .logo-footer {
    width: 129px!important;
    height: 29px!important;
}
 .table-container .alert-icon {
    width: 120px!important;
    height: 120px!important;
}
 .table-container .avatar-img {
    width: 64px!important;
    height: 64px!important;
}
 .x-gmail-data-detectors, .x-gmail-data-detectors * {
    border-bottom: 0 !important;
    cursor: default !important}
 @media screen {
    body {
    font-family: 'Lato', Arial, Helvetica, sans-serif;
}
 }
@media only screen and (max-width: 640px) {
    body {
    margin: 0px!important;
    padding: 0px!important;
}
body, table, td, p, a, li, blockquote {
    -webkit-text-size-adjust: none!important;
}
.table-main, .table-container,.social-icons,table,.table-container td {
    width: 100%!important;
    min-width: 100%!important;
    margin: 0!important;
    float: none!important;
}
.table-container img {
    width: 100%!important;
    max-width: 100%!important;
    display: block;
    height: auto!important;
}
 .table-container a {
    width: 50%!important;
    max-width: 100%!important;
}
 .table-container .logo {
    width: 200px!important;
    height: 30px!important;
}
 .table-container .alert-icon {
    width: 120px!important;
    height: 120px!important;
}
 .social-icons {
    float: none!important;
    margin-left: auto!important;
    margin-right: auto!important;
    width: 220px!important;
    max-width: 220px!important;
    min-width: 220px!important;
    background: #383e56!important;
}
.social-icons td {
    width: auto!important;
    min-width: 1%!important;
    margin: 0!important;
    float: none!important;
    text-align: center;
}
.social-icons td a {
    width: auto!important;
    max-width: 100%!important;
    font-size: 10px!important;
}
 .mobile-title {
    font-size: 34px!important;
}
 .table-container .logo-footer {
    width: 129px!important;
    height: 29px!important;
    margin-bottom: 20px!important;
}
 .block-img {
    width: 100%;
    height: auto;
    margin-bottom: 20px;
}
 .info-block {
    padding: 0!important;
}
 .video-img {
    width: 100%!important;
    height: auto!important;
}
 .post-footer-container td {
    text-align: center!important;
    padding: 0 40px 0 40px!important;
}
 }

</style>
</head>
<body style="padding: 0; margin: 0; -webkit-font-smoothing:antialiased; background-color:#f1f1f1; -webkit-text-size-adjust:none;">
<!--Main Parent Table -->
<table width="100%" border="0" cellpadding="0" direction="ltr" bgcolor="#f1f1f1" cellspacing="0" role="presentation" style="width: 640px; min-width: 640px; margin:0 auto 0 auto;">
<tbody>
<tr>
	<td style="display:none;font-size:0;line-height:0;color:#111111;">
		 Sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat
	</td>
</tr>
<tr>
	<td>
		<!--Content Starts Here -->
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#f1f1f1">
		<tr>
			<td height="30" style="line-height:30px;min-height:30px;">
			</td>
		</tr>
		</table>
		<!--Top Header Starts Here -->
		<table border="0" bgcolor="#383e56" cellpadding="0" cellspacing="0" width="640" role="presentation" width="640" style="width: 640px; min-width: 640px;" align="center" class="table-container ">
		<tbody>
		<tr width="640" style="width: 640px; min-width: 640px; " align="center">
			<td>
				<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#383e56">
				<tr>
					<td height="35" style="line-height:35px;min-height:35px;">
					</td>
				</tr>
				</table>
				<table cellpadding="0" cellspacing="0" border="0" width="640" style="width: 640px; min-width: 640px;" role="presentation" align="center" bgcolor="#383e56">
				<tr>
					<td align="left">
						<table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center" bgcolor="#383e56">
						<tr>
							<td>
								<table cellpadding="0" cellspacing="0" border="0" align="center" role="presentation">
								<tr>
                  <td align="center" style="color:#fff;padding:20px 40px 0 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:800;font-size:34px;-webkit-font-smoothing:antialiased;line-height:1.2;" class="table-container mobile-title">
            				 Golden Palm Foods
            			</td>
								</tr>
								</table>
								<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#383e56">
								<tr>
									<td height="35" style="line-height:35px;min-height:35px;">
									</td>
								</tr>
								</table>
							</td>
						</tr>
						</table>
					</td>
				</tr>
				</table>
			</td>
		</tr>
		</tbody>
		</table>
		<!--Top Header Ends Here -->
		<!--Welcome  Section Ends Here -->
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tr>
			<td height="60" style="line-height:60px;min-height:60px;">
			</td>
		</tr>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tr>
			<td height="20" style="line-height:20px;min-height:20px;">
			</td>
		</tr>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tbody>
		<tr>
			<td align="center" style="color:#45535C;padding:20px 40px 0 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:800;font-size:34px;-webkit-font-smoothing:antialiased;line-height:1.2;" class="table-container mobile-title">
				 Thanks for your order!
			</td>
		</tr>
		<tr>
			<td align="center" style="color:#45535C;padding:20px 40px 0 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:800;font-size:18px;-webkit-font-smoothing:antialiased;line-height:1.2;" class="table-container mobile-title">
				 Here’s what you purchased
			</td>
		</tr>
		<tr>
			<td align="center" style="color:#5a5a5a;padding:20px 40px 0 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:normal;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;" class="table-container">
				 Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
			</td>
		</tr>
		</tbody>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tr>
			<td height="60" style="line-height:60px;min-height:60px;">
			</td>
		</tr>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tbody>
		<tr>
			<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
			<tbody>
			<tr>
				<td bgcolor="#FFF" width="40" align="left" style="color:#5a5a5a;padding:10px 0 10px 0;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;">
				</td>
				<td bgcolor="#f9f9f9" align="left" style="color:#5a5a5a;padding:10px 40px 10px 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;">
					 Order Confirmation #
				</td>
				<td bgcolor="#f9f9f9" align="right" style="color:#5a5a5a;padding:10px 40px 10px 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;">
					 ${orders.order_custom_id}
				</td>
				<td bgcolor="#FFF" width="40" align="left" style="color:#5a5a5a;padding:10px 0 10px 0;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;">
				</td>
			</tr>
			</tbody>
			</table>
			<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
			<tbody>
			${orderItemsHtml}
			</tbody>
			</table>
			<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
			<tbody>
			<tr>
				<td bgcolor="#FFF" width="40" align="left" style="color:#5a5a5a;padding:10px 0 10px 0;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;">
				</td>
				<td bgcolor="#FFFFFF" align="left" style="border-top:2px solid #CCCCCC;border-bottom:2px solid #CCCCCC;color:#5a5a5a;padding:10px 40px 10px 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;" class="table-container">
					 TOTAL
				</td>
				<td bgcolor="#FFFFFF" align="right" style="border-top:2px solid #CCCCCC;border-bottom:2px solid #CCCCCC;color:#5a5a5a;padding:10px 40px 10px 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:16px;-webkit-font-smoothing:antialiased;line-height:1.4;" class="table-container">
					 $${totalAmount.toFixed(2)}
				</td>
				<td bgcolor="#FFF" width="40" align="left" style="color:#5a5a5a;padding:10px 0 10px 0;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;">
				</td>
			</tr>
			</tbody>
			</table>
		</tr>
		</tbody>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tr>
			<td height="60" style="line-height:60px;min-height:60px;">
			</td>
		</tr>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" bgcolor="#FFFFFF" role="presentation" class="table-container ">
		<tbody>
		<tr>
			<td style="padding:0 40px;">
				<table cellpadding="0" cellspacing="0" border="0" align="left" width="270" role="presentation" class="table-container">
				<tbody>
				<tr>
					<td height="20" style="line-height:20px;min-height:20px;">
					</td>
				</tr>
				<tr>
					<td align="left" valign="top" style="color: #111111; font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 16px; line-height: 16px;font-weight:bold;">
						 Delivery address:
					</td>
				</tr>
				<tr>
					<td height="10" style="line-height:10px;min-height:10px;">
					</td>
				</tr>
				<tr>
					<td align="left" valign="top" style="color: #111111; font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 14px; line-height: 14px;font-weight:normal;">
						 ${deliveryAddress}
					</td>
				</tr>
				</tbody>
				</table>
				<table cellpadding="0" cellspacing="0" border="0" align="right" width="270" role="presentation" class="table-container">
				<tbody>
				<tr>
					<td height="20" style="line-height:20px;min-height:20px;">
					</td>
				</tr>
				<tr>
					<td align="left" valign="top" style="color: #111111; font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 16px; line-height: 16px;font-weight:bold;">
						 Payment status
					</td>
				</tr>
				<tr>
					<td height="10" style="line-height:10px;min-height:10px;">
					</td>
				</tr>
				<tr>
					<td align="left" valign="top" style="color: #111111; font-family: 'Lato', Arial, Helvetica, sans-serif; font-size: 14px; line-height: 14px;font-weight:normal;">
						 Paid
					</td>
				</tr>
				</tbody>
				</table>
			</td>
		</tr>
		</tbody>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tr>
			<td height="60" style="line-height:60px;min-height:60px;">
			</td>
		</tr>
		</table>
		<table bgcolor="#383e56" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" class="table-container ">
		<tr>
			<td height="35" style="line-height:35px;min-height:35px;">
			</td>
		</tr>
		</table>
		<table bgcolor="#383e56" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" class="table-container ">
		<tr>
			<td height="35" style="line-height:35px;min-height:35px;">
			</td>
		</tr>
		</table>
		<table bgcolor="#383e56" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" class="table-container ">
		<tr>
			<td height="35" style="line-height:35px;min-height:35px;">
			</td>
		</tr>
		</table>
		<table bgcolor="#383e56" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" class="table-container ">
		<tr>
			<td style="color:#FFFFFF; font-size:14px; line-height:22px; text-align:center;border:none;font-weight:bold;">
				 Street Address, Town/City, State ZIP <br>
				 © 2021 Your Company, Inc. <br>
				<br>
			</td>
		</tr>
		</table>
		<table bgcolor="#383e56" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" class="table-container ">
		<tr>
			<td height="60" style="line-height:60px;min-height:60px;">
			</td>
		</tr>
		</table>
		<table bgcolor="#CCCCCC" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" class="table-container ">
		<tr>
			<td height="1" style="line-height:1px;min-height:1px;">
			</td>
		</tr>
		</table>
		<table bgcolor="#f1f1f1" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" class="table-container ">
		<tr>
			<td height="40" style="line-height:40px;min-height:40px;">
			</td>
		</tr>
		</table>
	</td>
</tr>
</tbody>
</table>
</body>
</html>
  `
  let subject = 'Order Confirmation - Golden Palm Foods'
  const param = {
    recipient,
    content: newContent,
    subject
  }
  this.sendMailerLiteEmail(param)
}

exports.sendTokenEmail = async (recipient, token) => {

  let content = `
  <!DOCTYPE html>
  <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8"> <!-- utf-8 works for most cases -->
    <meta name="viewport" content="width=device-width"> <!-- Forcing initial-scale shouldn't be necessary -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!-- Use the latest (edge) version of IE rendering engine -->
    <meta name="x-apple-disable-message-reformatting">  <!-- Disable auto-scale in iOS 10 Mail entirely -->
    <title></title> <!-- The title tag shows in email notifications, like Android 4.4. -->

    <link href="https://fonts.googleapis.com/css?family=Work+Sans:200,300,400,500,600,700" rel="stylesheet">
    <style>
  
      html,
      body {
          margin: 0 auto !important;
          padding: 0 !important;
          height: 100% !important;
          width: 100% !important;
          background: #f1f1f1;
      }
  
      * {
          -ms-text-size-adjust: 100%;
          -webkit-text-size-adjust: 100%;
      }
      
      div[style*="margin: 16px 0"] {
          margin: 0 !important;
      }
      
      table,
      td {
          mso-table-lspace: 0pt !important;
          mso-table-rspace: 0pt !important;
      }
      
      table {
          border-spacing: 0 !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
          margin: 0 auto !important;
      }
  
      img {
          -ms-interpolation-mode:bicubic;
      }
      
      a {
          text-decoration: none;
      }
      
      *[x-apple-data-detectors], 
      .unstyle-auto-detected-links *,
      .aBn {
          border-bottom: 0 !important;
          cursor: default !important;
          color: inherit !important;
          text-decoration: none !important;
          font-size: inherit !important;
          font-family: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
      }
  
      .a6S {
          display: none !important;
          opacity: 0.01 !important;
      }
      
      .im {
          color: inherit !important;
      }
      
      img.g-img + div {
          display: none !important;
      }
      
      @media only screen and (min-device-width: 320px) and (max-device-width: 374px) {
          u ~ div .email-container {
              min-width: 320px !important;
          }
      }

      @media only screen and (min-device-width: 375px) and (max-device-width: 413px) {
          u ~ div .email-container {
              min-width: 375px !important;
          }
      }
      
      @media only screen and (min-device-width: 414px) {
          u ~ div .email-container {
              min-width: 414px !important;
          }
      }
    </style>
  

    <style>
  
      .primary{
        background: #fcb040;
      }

      .bg_white{
        background: #ffffff;
      }
      .bg_light{
        background: #f7fafa;
      }
      .bg_black{
        background: #000000;
      }
      .bg_dark{
        background: rgba(0,0,0,.8);
      }
      .email-section{
        padding:2.5em;
      }
  
      .btn{
        padding: 10px 15px;
        display: inline-block;
      }
      .btn.btn-primary{
        border-radius: 5px;
        background: #fcb040;
        color: #ffffff;
      }
      .btn.btn-white{
        border-radius: 5px;
        background: #ffffff;
        color: #000000;
      }
      .btn.btn-white-outline{
        border-radius: 5px;
        background: transparent;
        border: 1px solid #fff;
        color: #fff;
      }
      .btn.btn-black-outline{
        border-radius: 0px;
        background: transparent;
        border: 2px solid #000;
        color: #000;
        font-weight: 700;
      }
      .btn-custom{
        color: rgba(0,0,0,.3);
        text-decoration: underline;
      }
  
      h1,h2,h3,h4,h5,h6{
        font-family: 'Work Sans', sans-serif;
        color: #000000;
        margin-top: 0;
        font-weight: 400;
      }
      
      body{
        font-family: 'Work Sans', sans-serif;
        font-weight: 400;
        font-size: 15px;
        line-height: 1.8;
        color: rgba(0,0,0,.4);
      }
  
      a{
        color: #fcb040;
      }
      
      table{
      }
      
      .logo h1{
        margin: 0;
      }
      .logo h1 a{
        color: #fcb040;
        font-size: 24px;
        font-weight: 700;
        font-family: 'Work Sans', sans-serif;
      }
  
      .hero{
        position: relative;
        z-index: 0;
      }
      
      .hero .text{
        color: rgba(0,0,0,.3);
      }
      .hero .text h2{
        color: #000;
        font-size: 34px;
        margin-bottom: 15px;
        font-weight: 300;
        line-height: 1.2;
      }
      .hero .text h3{
        font-size: 24px;
        font-weight: 200;
      }
      .hero .text h2 span{
        font-weight: 600;
        color: #000;
      }
  
      .product-entry{
        display: block;
        position: relative;
        float: left;
        padding-top: 20px;
      }
      .product-entry .text{
        width: auto;
        padding-left: 20px;
      }
      .product-entry .text h3{
        margin-bottom: 0;
        padding-bottom: 0;
      }
      .product-entry .text p{
        margin-top: 0;
      }
      .product-entry img, .product-entry .text{
        float: left;
      }
      
      ul.social{
        padding: 0;
      }
      ul.social li{
        display: inline-block;
        margin-right: 10px;
      }
  
    </style>
  </head>
  <body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: #f1f1f1;">
    <center style="width: 100%; background-color: #f1f1f1;">
      <div style="display: none; font-size: 1px;max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
        &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
      </div>
      <div style="max-width: 600px; margin: 0 auto;" class="email-container">          
        <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;">
          <tr>
            <td valign="top" class="bg_white" style="padding: 1em 2.5em 0 2.5em;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="logo" style="text-align: left;">
                    <h1><a href="#">Golden Palm Foods</a></h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td valign="middle" class="hero bg_white" style="padding: 2em 0 2em 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 0 2.5em; text-align: left;">
                    <div class="text">
                      <h2>Thank you for picking us!</h2>
                      <h3>Your token is ${token}. It is valid for the next 20 minutes</h3>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>        
        </table>
      </div>
    </center>
  </body>
  </html>
  `
  let subject = 'Password Reset Token'
  const param = {
    recipient,
    content,
    subject
  }
  this.sendEmail(param)
}

exports.sendEmail = (data) => {
  sgMail.setApiKey(process.env.GRID_KEY)
  const msg = {
    to: data.recipient,
    from: process.env.NO_REPLY,
    subject: data.subject,
    html: data.content,
  }
  sgMail
    .send(msg)
    .then(() => {
      console.log('Email sent')
      return true
    })
    .catch((error) => {
      console.error(error)
      return false
    })
}

exports.sendTrackingEmail = async (reference_no, trackingId) => {
  const orders = await Orders.findOne({
    where: { reference_no },
    include: [
      {
        model: OrderItems,
        as: 'orderItems'
      }
    ],
  })

  if (!orders) {
    console.error('Order not found for tracking email');
    return false;
  }

  // Parse address from other_info
  const addressParts = orders.other_info ? orders.other_info.split(',') : [];
  const customerEmail = addressParts.length >= 3 ? addressParts[2] : orders.user_reference_no;

  let content = `
  <!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="robots" content="noindex, nofollow">
<title>Order Shipped</title>
<link rel="preconnect" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">
<style>
body {
    margin: 0;
    padding: 0;
    mso-line-height-rule: exactly;
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
   }
 body, table, td, p, a, li {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
    font-family: 'Lato', Arial, Helvetica, sans-serif;
}
 table td {
    border-collapse: collapse;
}
 table {
    border-spacing: 0;
    border-collapse: collapse;
    border-color: #FFFFFF;
}
 p, a, li, td, blockquote {
    mso-line-height-rule: exactly;
}
 p, a, li, td, body, table, blockquote {
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
}
 img, a img {
    border: 0;
    outline: none;
    text-decoration: none;
}
 img {
    -ms-interpolation-mode: bicubic;
}
 * img[tabindex="0"] + div {
    display: none !important;
}
 a[href^=tel],a[href^=sms],a[href^=mailto], a[href^=date] {
    color: inherit;
    cursor: default;
    text-decoration: none;
}
 a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
    font-size: inherit !important;
    font-family: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important}
 .logo {
    width: 220px!important;
    height: 35px!important;
}
@media screen {
    body {
    font-family: 'Lato', Arial, Helvetica, sans-serif;
}
 }
@media only screen and (max-width: 640px) {
    body {
    margin: 0px!important;
    padding: 0px!important;
}
body, table, td, p, a, li, blockquote {
    -webkit-text-size-adjust: none!important;
}
.table-main, .table-container, table,.table-container td {
    width: 100%!important;
    min-width: 100%!important;
    margin: 0!important;
    float: none!important;
}
.table-container img {
    width: 100%!important;
    max-width: 100%!important;
    display: block;
    height: auto!important;
}
 .mobile-title {
    font-size: 34px!important;
}
 }
</style>
</head>
<body style="padding: 0; margin: 0; -webkit-font-smoothing:antialiased; background-color:#f1f1f1; -webkit-text-size-adjust:none;">
<table width="100%" border="0" cellpadding="0" direction="ltr" bgcolor="#f1f1f1" cellspacing="0" role="presentation" style="width: 640px; min-width: 640px; margin:0 auto 0 auto;">
<tbody>
<tr>
	<td>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#f1f1f1">
		<tr>
			<td height="30" style="line-height:30px;min-height:30px;">
			</td>
		</tr>
		</table>
		<table border="0" bgcolor="#383e56" cellpadding="0" cellspacing="0" width="640" role="presentation" width="640" style="width: 640px; min-width: 640px;" align="center" class="table-container ">
		<tbody>
		<tr width="640" style="width: 640px; min-width: 640px; " align="center">
			<td>
				<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#383e56">
				<tr>
					<td height="35" style="line-height:35px;min-height:35px;">
					</td>
				</tr>
				</table>
				<table cellpadding="0" cellspacing="0" border="0" width="640" style="width: 640px; min-width: 640px;" role="presentation" align="center" bgcolor="#383e56">
				<tr>
					<td align="left">
						<table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center" bgcolor="#383e56">
						<tr>
							<td>
								<table cellpadding="0" cellspacing="0" border="0" align="center" role="presentation">
								<tr>
                  <td align="center" style="color:#fff;padding:20px 40px 0 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:800;font-size:34px;-webkit-font-smoothing:antialiased;line-height:1.2;" class="table-container mobile-title">
            				 Golden Palm Foods
            			</td>
								</tr>
								</table>
								<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#383e56">
								<tr>
									<td height="35" style="line-height:35px;min-height:35px;">
									</td>
								</tr>
								</table>
							</td>
						</tr>
						</table>
					</td>
				</tr>
				</table>
			</td>
		</tr>
		</tbody>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tr>
			<td height="60" style="line-height:60px;min-height:60px;">
			</td>
		</tr>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tbody>
		<tr>
			<td align="center" style="color:#45535C;padding:20px 40px 0 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:800;font-size:34px;-webkit-font-smoothing:antialiased;line-height:1.2;" class="table-container mobile-title">
				 Your Order Has Shipped!
			</td>
		</tr>
		<tr>
			<td align="center" style="color:#5a5a5a;padding:20px 40px 0 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:normal;font-size:14px;-webkit-font-smoothing:antialiased;line-height:1.4;" class="table-container">
				 Good news! Your order #${orders.order_custom_id} is on its way to you.
			</td>
		</tr>
		</tbody>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tr>
			<td height="40" style="line-height:40px;min-height:40px;">
			</td>
		</tr>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tbody>
		<tr>
			<td bgcolor="#FFF" width="40" align="left">
			</td>
			<td bgcolor="#f9f9f9" align="center" style="color:#5a5a5a;padding:20px 40px;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:18px;-webkit-font-smoothing:antialiased;line-height:1.4;">
				 Tracking Number: ${trackingId}
			</td>
			<td bgcolor="#FFF" width="40" align="left">
			</td>
		</tr>
		</tbody>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tr>
			<td height="40" style="line-height:40px;min-height:40px;">
			</td>
		</tr>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tbody>
		<tr>
			<td align="center" style="padding:0 40px;">
				<a href="https://www.usps.com/track/" target="_blank" style="display:inline-block;background-color:#383e56;color:#FFFFFF;padding:15px 30px;text-decoration:none;font-family: 'Lato', Arial, Helvetica, sans-serif;font-weight:bold;font-size:16px;border-radius:5px;">
					Track Your Package
				</a>
			</td>
		</tr>
		</tbody>
		</table>
		<table cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" bgcolor="#FFFFFF">
		<tr>
			<td height="60" style="line-height:60px;min-height:60px;">
			</td>
		</tr>
		</table>
		<table bgcolor="#383e56" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" class="table-container ">
		<tr>
			<td style="color:#FFFFFF; font-size:14px; line-height:22px; text-align:center;border:none;font-weight:bold;padding:40px 0;">
				 © 2026 Golden Palm Foods <br>
			</td>
		</tr>
		</table>
		<table bgcolor="#f1f1f1" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" role="presentation" class="table-container ">
		<tr>
			<td height="40" style="line-height:40px;min-height:40px;">
			</td>
		</tr>
		</table>
	</td>
</tr>
</tbody>
</table>
</body>
</html>
  `

  let subject = 'Your Order Has Shipped - Golden Palm Foods'
  const param = {
    recipient: customerEmail,
    content,
    subject
  }

  return await this.sendMailerLiteEmail(param);
}

exports.sendReviewEmail = async (email, order_reference_no) => {
  const orders = await Orders.findOne({
    where: { reference_no: order_reference_no },
    include: [
      {
        model: OrderItems,
        as: 'orderItems'
      }
    ],
  })

  if (!orders) {
    console.error('Order not found for review email');
    return false;
  }

  // Generate review token
  const reviewToken = jwt.sign(
    {
      order_reference_no: order_reference_no,
      email: email,
      purpose: 'review'
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' } // Token valid for 30 days
  );

  // Build order items HTML
  let orderItemsHtml = '';
  for (const item of orders.orderItems) {
    if (item.item_type === 'bundle') {
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

      orderItemsHtml += `
        <tr>
          <td style="padding: 15px; border-bottom: 1px solid #eee;">
            <strong>${item.desc}</strong> (Bundle)<br/>
            <small style="color: #666;">Contains: ${bundleContents.map(p => p.product_name).join(', ')}</small>
          </td>
          <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.unit_amount).toFixed(2)}</td>
        </tr>
      `;
    } else {
      orderItemsHtml += `
        <tr>
          <td style="padding: 15px; border-bottom: 1px solid #eee;">${item.desc}${item.heat_level ? ` (${item.heat_level})` : ''}</td>
          <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.unit_amount).toFixed(2)}</td>
        </tr>
      `;
    }
  }

  const reviewUrl = `${process.env.FRONTEND_URL || 'https://goldenpalmfoods.com'}/review/${order_reference_no}?token=${reviewToken}`;

  const content = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>We'd Love Your Feedback</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background-color: #d4af37; padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">How Was Your Experience?</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 20px 0;">
                    Hi there!
                  </p>
                  <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 20px 0;">
                    Thank you for choosing Golden Palm Foods! We hope you enjoyed your order. We'd love to hear about your experience.
                  </p>

                  <!-- Order Summary -->
                  <div style="background-color: #f9f9f9; border-radius: 6px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Order #${orders.order_custom_id}</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                      <thead>
                        <tr style="border-bottom: 2px solid #ddd;">
                          <th style="padding: 10px; text-align: left; color: #666;">Item</th>
                          <th style="padding: 10px; text-align: center; color: #666;">Qty</th>
                          <th style="padding: 10px; text-align: right; color: #666;">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${orderItemsHtml}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colspan="2" style="padding: 15px; text-align: right; font-weight: bold; font-size: 16px;">Total:</td>
                          <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 16px; color: #d4af37;">$${parseFloat(orders.amount).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 20px 0;">
                    Your feedback helps us improve and serve you better. It only takes a minute!
                  </p>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${reviewUrl}" style="display: inline-block; background-color: #d4af37; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-size: 18px; font-weight: bold;">Leave a Review</a>
                      </td>
                    </tr>
                  </table>

                  <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                    Thank you for being a valued customer!<br/>
                    - The Golden Palm Foods Team
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #333; padding: 20px; text-align: center;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    Golden Palm Foods<br/>
                    © ${new Date().getFullYear()} All rights reserved
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await this.sendMailerLiteEmail({
      recipient: email,
      subject: `We'd Love Your Feedback - Order #${orders.order_custom_id}`,
      content: content
    });
    return true;
  } catch (error) {
    console.error('Error sending review email:', error);
    return false;
  }
}

exports.sendMailerLiteEmail = async (data) => {
  console.log(`Bearer ${process.env.MAILERLITE_API_KEY}`)
  try {
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MAILERLITE_API_PROD_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        from: {
          email: `noreply@${process.env.NO_REPLY_PROD}`,
          name: 'Golden Palm Foods'
        },
        to: [
          {
            email: data.recipient
          }
        ],
        subject: data.subject,
        html: data.content
      })
    });

    console.log('MailerSend Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MailerSend API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return false;
    }

    // MailerSend returns 202 Accepted with empty body on success
    if (response.status === 202) {
      console.log('Email queued successfully via MailerSend');
      return true;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log('Email sent via MailerSend:', result);
      return true;
    }

    console.log('Email sent via MailerSend (no JSON response)');
    return true;
  } catch (error) {
    console.error('MailerSend Error:', error);
    return false;
  }
}