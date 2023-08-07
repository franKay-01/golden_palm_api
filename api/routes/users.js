const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const jwtSecret = crypto.randomBytes(64).toString('hex');

const router = express.Router();
const {Users} = require('../../models');

router.get('/', async (req, res, next) => {
  try{
    const users = await Users.findAll()
    return res.json({
      response_code: '000',  
      users
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

router.post('/status', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const {reference_no} = parsedBody;

  try{
    const user = await Users.findOne({where: { reference_no } })
    
    user.is_active = !user.is_active
    await user.save()
  
    res.status(200).json({
      response_message:"user editted",
      response_code: '000'
    })
  }catch{
    res.status(err.status || 500).json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/signin', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const { password, username } = parsedBody;

  try{
    const user = await Users.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ 
        error: { message: 'Invalid username or password' } 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: { message: 'Invalid username or password'} 
      });
    }

    const token = jwt.sign({ id: user.reference_no, username: user.username }, jwtSecret, {
      expiresIn: '1h',
    });

    res.status(200).json({    
      response_code: '000',   
      username: user.username,
      token 
    });

  }catch(err){
    res.status(err.status || 500)
    res.json({
      error: {
        message: err.message
      }
    })
  }
})

router.post('/', async (req, res, next) => {
  const rawBody = req.body.toString();
  const parsedBody = JSON.parse(rawBody);

  const {first_name, last_name, email, phone_number, password, role_id, username, country} = parsedBody;

  try{
    const existingUser = await Users.findOne({ where: { username } });

    if (existingUser) {
      return res.status(400).json({ error: {message: 'Username already exists' }});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await Users.create({first_name, last_name, email, phone_number, password: hashedPassword, username, country, role_id})

    // const token = jwt.sign({ id: user.id, username: user.username }, jwtSecret, {
    //   expiresIn: '1h',
    // });

    res.status(200).json({
      message:"user INFO",
      username: user.username,
      // reference_no: user.reference_no,
      // token
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

router.get('/:reference_no', async (req, res, next) => {
  const reference_no = req.params.reference_no;
  try{
    const user = await Users.findOne({
      where: { reference_no }
    })

    return res.json({
      users: user
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

router.put('/:reference_no', async (req, res, next) => {
  const reference_no = req.params.reference_no;
  const { first_name, last_name, email, phone_number } = req.body;

  try{
    const user = await Users.findOne({
      where: { reference_no }
    })

    user.first_name = first_name;
    user.last_name = last_name;
    user.email = email;
    user.phone_number = phone_number;

    await user.save()

    return res.json({
      users: user
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

router.delete('/:id', (req, res, next) => {
  res.status(200).json({
    message: `Updated user record`
  })
})

module.exports = router;