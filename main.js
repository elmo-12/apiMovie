import { createApp } from './app.js'
import { MovieModel } from './models/sequelize/movie.js'

createApp({ movieModel: MovieModel })
