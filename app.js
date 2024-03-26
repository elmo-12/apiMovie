import express, { json } from 'express'
import { corsMiddleware } from './middlewares/cors.js'
import { createMoviesRouter } from './routes/movies.js'

export const createApp = ({ movieModel }) => {
  const app = express()
  app.use(json()) // Middleware para parsear el body de las peticiones
  app.disable('x-powered-by') // Deshabilita la cabecera X-Powered-By

  app.use(corsMiddleware())

  app.use('/movies', createMoviesRouter({ movieModel }))

  const PORT = process.env.PORT ?? 3000

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
  })
}
