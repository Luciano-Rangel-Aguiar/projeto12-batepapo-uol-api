import cors from 'cors'
import dayjs from 'dayjs'
import dotenv from 'dotenv'
import express from 'express'
import joi, { date } from 'joi'
import { ListCollectionsCursor, MongoClient, ObjectId } from 'mongodb'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const mongoClient = new MongoClient(process.env.MONGO_URI)

let db
mongoClient.connect().then(() => {
  db = mongoClient.db('batePapo')
})

const userObject = joi.object({
  name: joi.string().required()
})

const newMessageObject = joi.object({
  from: joi.string().required(),
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().required().valid('message', 'private_message')
})

app.post('/participants', async (req, res) => {
  const { name } = req.body
  const username = name.trim()

  console.log(stripHtml(name).result.trim())

  const userCheck = userObject.validate(req.body)
  if (userCheck.error) {
    const errors = validation.error.details.map(value => value.message)
    res.status(422).send(errors)
    return
  }

  try {
    const usersCollection = await db
      .collection('participants')
      .findOne({ username: username })
    if (usersCollection) {
      res.sendStatus(409)
      return
    }
  } catch (error) {
    console.error(error)
    res.sendStatus(500)
  }

  const time = dayjs(new date()).format('HH-mm-ss')

  const message = {
    from: username,
    to: 'Todos',
    text: 'entra na sala...',
    type: 'status',
    time: time
  }

  try {
    const responsePart = await db
      .collection('participants')
      .insertOne({ username: username, lastStatus: Date.now() })

    const responseMessage = await db
      .colection('messages')
      .insertOne({ ...messge })

    res.sendStatus(201)
  } catch (error) {
    console.error(error)
    res.sendStatus(422)
  }
})

app.get('/participants', async (req, res) => {
  try {
    const response = await db.collection('participants').find().toArray()
    res.status(201).send(response)
  } catch (error) {
    console.error(error)
    res.sendStatus(404)
  }
})

app.post('/messages', async (req, res) => {
  const { to, text, type } = req.body
  const { user: username } = req.headers

  const time = dayjs(new Date()).format('HH-mm-ss')

  const message = {
    to: stripHtml(to).result.trim(),
    text: stripHtml(text).result.trim(),
    ype: stripHtml(type).result.trim(),
    from: username,
    time: time
  }

  const user = await db
    .collection('participants')
    .findOne({ username: username })

  if (!user) {
    res.status(422).send({ error: 'Esse usuário não está logado.' })
    return
  }

  const validation = messageSchema.validate(message)
  if (validation.error) {
    const errors = validation.error.details.map(value => value.message)
    res.status(422).send(errors)
    return
  }

  try {
    const response = await db.collection('messages').insertOne({ ...message })
    res.sendStatus(201)
  } catch (error) {
    console.error(error)
    res.sendStatus(422)
  }
})

app.get('/messages', async (req, res) => {
  const { User: username } = req.headers
  const { limit } = req.query

  try {
    const response = await db.collection('messages').find().toArray()

    const showMessages = response.filter(message => {
      if (
        message.type === 'private_message' &&
        (message.to !== username || message.from !== username)
      ) {
        return false
      }
      return true
    })

    const limitMessages = showMessages.slice(-limit)
    res.send(limitMessages)
  } catch (error) {
    console.error(error)
    res.status(500).send(error)
  }
})

app.post('/status', async (req, res) => {
  const { user: username } = req.headers
  const userCollectionArray = await db
    .collection('participants')
    .find()
    .toArray()
  const usernameArray = userCollectionArray.map(value => value.username)

  if (!usernameArray.includes(username)) {
    res.sendStatus(404)
    return
  }

  const user = await db
    .collection('participants')
    .findOne({ username: username })

  const userModel = {
    _id: user._id,
    username: username,
    lastStatus: Date.now()
  }
  await db
    .collection('participants')
    .updateOne({ username: username }, { $set: userModel })

  res.sendStatus(200)
})

app.listen(5000, () => {
  console.log('Ta funfando.')
})