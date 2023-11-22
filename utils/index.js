const sgMail = require('@sendgrid/mail')
const { Orders, OrderItems, Products } = require('../models');

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
        as: 'orderItems',
        include: [
          {
            model: Products,
            as: 'products',
          },
        ],
      },
    ],
  })

  let orderItems = orders.orderItems.map(item => {
    return `<tr style="border-bottom: 1px solid rgba(0,0,0,.05);">
      <td valign="middle" width="80%" style="text-align:left; padding: 0 0.5em;">
        <div class="product-entry">
          <div class="text">
            <h3>${item.products.name}</h3>
            <p>${item.products.description}</p>
          </div>
        </div>
      </td>
      <td valign="middle" width="20%" style="text-align:right; padding: 0 2.5em;">
        <span class="price" style="color: #000; font-size: 20px;">$ ${item.products.price}</span>
      </td>
    </tr>`
  })

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
                      <h2>Thank you for shopping with us!</h2>
                      <h3>Amazing deals, updates, interesting news right in your inbox</h3>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <table class="bg_white" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr style="border-bottom: 1px solid rgba(0,0,0,.05);">
                <th width="80%" style="text-align:left; padding: 0 2.5em; color: #000; padding-bottom: 20px">Item</th>
                <th width="20%" style="text-align:right; padding: 0 2.5em; color: #000; padding-bottom: 20px">Price</th>
              </tr>
              ${orderItems}
            </table>
          </tr>         
        </table>
      </div>
    </center>
  </body>
  </html>
  `
  let subject = 'Sales Reciept'
  const param = {
    recipient,
    content,
    subject
  }
  this.sendEmail(param)
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