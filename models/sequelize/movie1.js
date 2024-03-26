import { QueryTypes } from 'sequelize'
import { sequelize } from '../../database.js'

export class MovieModel {
  static async getAll ({ genre }) {
    if (genre) {
      const lowerCaseGenre = genre.toLowerCase()

      const genres = await sequelize.query(
        'SELECT id, name FROM genre WHERE LOWER(name) = :lowerCaseGenre',
        {
          replacements: { lowerCaseGenre },
          type: QueryTypes.SELECT
        }
      )

      // Si no existe el género, devolvemos un array vacío
      if (genres.length === 0) return []

      const { id } = genres[0]

      const moviesIds = await sequelize.query(
        'SELECT movie_id FROM movie_genre WHERE genre_id = :id',
        {
          replacements: { id },
          type: QueryTypes.SELECT
        }
      )

      // Si no hay películas con ese género, devolvemos un array vacío
      if (moviesIds.length === 0) return []

      const movies = await sequelize.query(
          `SELECT m.title, m.year_, m.director, m.duration, m.poster, m.rate
          FROM movie m
          JOIN movie_genre mg ON m.id = mg.movie_id
          JOIN genre g ON mg.genre_id = g.id
          WHERE LOWER(g.name) = :lowerCaseGenre`,
          {
            replacements: { lowerCaseGenre },
            type: QueryTypes.SELECT
          }
      )

      return movies
    }

    const movies = await sequelize.query(
      'SELECT id, title, year_, director, duration, poster, rate FROM movie',
      {
        type: QueryTypes.SELECT
      }
    )

    return movies
  }

  static async getById ({ id }) {
    const movies = await sequelize.query(
      'SELECT id, title, year_, director, duration, poster, rate FROM movie WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    )

    if (movies.length === 0) return null

    return movies[0]
  }

  static async create ({ input }) {
    const {
      // eslint-disable-next-line no-unused-vars
      genre: genreInput,
      title,
      year,
      director,
      duration,
      rate,
      poster
    } = input

    // Ejecutar la consulta de inserción
    const [movie] = await sequelize.query(
      `INSERT INTO movie (title, year_, director, duration, rate, poster)
      VALUES (:title, :year, :director, :duration, :rate, :poster)
      RETURNING id,title, year_, director, duration, rate, poster`,
      {
        replacements: { title, year, director, duration, rate, poster },
        type: QueryTypes.INSERT
      }
    )

    return movie[0]
  }

  static async delete ({ id }) {
    if (!id) return []

    const movie = await sequelize.query(
      'DELETE FROM movie WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.DELETE
      }
    )

    return movie
  }

  static async update ({ id, input }) {
    const {
      title,
      year,
      director,
      duration,
      rate,
      poster
    } = input

    const movie = await sequelize.query(
      `UPDATE movie
      SET title = :title, year_ = :year, director = :director, duration = :duration, rate = :rate, poster = :poster
      WHERE id = :id
      RETURNING id, title, year_, director, duration, poster, rate`,
      {
        replacements: { id, title, year, director, duration, rate, poster },
        type: QueryTypes.UPDATE
      }
    )

    return movie[0]
  }
}
