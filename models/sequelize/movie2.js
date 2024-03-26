import { QueryTypes } from 'sequelize'
import { sequelize } from '../../database.js'

export class MovieModel {
  static async getAll ({ genre }) {
    let query = `
      SELECT m.id, m.title, m.year_, m.director, m.duration, m.poster, m.rate, ARRAY_AGG(g.name) AS genres
      FROM movie m
      JOIN movie_genre mg ON m.id = mg.movie_id
      JOIN genre g ON mg.genre_id = g.id
    `

    const replacements = {}

    if (genre) {
      query += ' WHERE LOWER(g.name) = :lowerCaseGenre'
      replacements.lowerCaseGenre = genre.toLowerCase()
    }

    query += ' GROUP BY m.id'

    const movies = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    })

    return movies
  }

  static async getById ({ id }) {
    const movie = await sequelize.query(
      `
      SELECT m.id, m.title, m.year_, m.director, m.duration, m.poster, m.rate, ARRAY_AGG(g.name) AS genres
      FROM movie m
      LEFT JOIN movie_genre mg ON m.id = mg.movie_id
      LEFT JOIN genre g ON mg.genre_id = g.id
      WHERE m.id = :id
      GROUP BY m.id
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    )

    return movie[0] || null
  }

  static async create ({ input }) {
    const {
      title,
      year,
      director,
      duration,
      rate,
      poster,
      genre: genresInput
    } = input

    const genres = Array.isArray(genresInput) ? genresInput.map(genre => genre.toLowerCase()) : []

    // Ejecutar la consulta de inserción
    const t = await sequelize.transaction()
    try {
      const [movie] = await sequelize.query(
        `INSERT INTO movie (title, year_, director, duration, rate, poster)
        VALUES (:title, :year, :director, :duration, :rate, :poster)
        RETURNING id,title, year_, director, duration, rate, poster`,
        {
          replacements: { title, year, director, duration, rate, poster },
          type: QueryTypes.INSERT,
          transaction: t
        }
      )

      for (const genre of genres) {
        const [genreRecord] = await sequelize.query(
          'SELECT id FROM genre WHERE LOWER(name) = :lowerCaseGenre',
          {
            replacements: { lowerCaseGenre: genre },
            type: QueryTypes.SELECT,
            transaction: t
          }
        )

        let genreId
        if (!genreRecord) {
          const [insertedGenre] = await sequelize.query(
            'INSERT INTO genre (name) VALUES (:name) RETURNING id',
            {
              replacements: { name: genre },
              type: QueryTypes.INSERT,
              transaction: t
            }
          )
          genreId = insertedGenre.id
        } else {
          genreId = genreRecord.id
        }

        await sequelize.query(
          `INSERT INTO movie_genre (movie_id, genre_id)
          VALUES (:movieId, :genreId)`,
          {
            replacements: { movieId: movie[0].id, genreId },
            type: QueryTypes.INSERT,
            transaction: t
          }
        )
      }

      await t.commit()

      return movie[0]
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  static async delete ({ id }) {
    if (!id) return null

    const t = await sequelize.transaction()
    try {
      await sequelize.query('DELETE FROM movie_genre WHERE movie_id = :id', {
        replacements: { id },
        type: QueryTypes.DELETE,
        transaction: t
      })

      const [deletedMovie] = await sequelize.query(
        'DELETE FROM movie WHERE id = :id RETURNING *',
        {
          replacements: { id },
          type: QueryTypes.DELETE,
          transaction: t
        }
      )

      await t.commit()

      return deletedMovie
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  static async update ({ id, input }) {
    const { title, year, director, duration, rate, poster, genre: genresInput } = input

    const t = await sequelize.transaction()
    try {
      // Actualizar la información básica de la película
      await sequelize.query(
        `UPDATE movie
        SET title = :title, year_ = :year, director = :director, duration = :duration, rate = :rate, poster = :poster
        WHERE id = :id`,
        {
          replacements: { id, title, year, director, duration, rate, poster },
          type: QueryTypes.UPDATE,
          transaction: t
        }
      )

      // Eliminar todas las asociaciones de género de la película
      await sequelize.query(
        `DELETE FROM movie_genre
        WHERE movie_id = :id`,
        {
          replacements: { id },
          type: QueryTypes.DELETE,
          transaction: t
        }
      )

      const genres = Array.isArray(genresInput) ? genresInput.map(genre => genre.toLowerCase()) : []

      // Insertar nuevas asociaciones de género
      for (const genre of genres) {
        const [genreRecord] = await sequelize.query(
          'SELECT id FROM genre WHERE LOWER(name) = :lowerCaseGenre',
          {
            replacements: { lowerCaseGenre: genre },
            type: QueryTypes.SELECT,
            transaction: t
          }
        )

        let genreId
        if (!genreRecord) {
          const [insertedGenre] = await sequelize.query(
            'INSERT INTO genre (name) VALUES (:name) RETURNING id',
            {
              replacements: { name: genre },
              type: QueryTypes.INSERT,
              transaction: t
            }
          )
          genreId = insertedGenre.id
        } else {
          genreId = genreRecord.id
        }

        await sequelize.query(
          `INSERT INTO movie_genre (movie_id, genre_id)
          VALUES (:movieId, :genreId)`,
          {
            replacements: { movieId: id, genreId },
            type: QueryTypes.INSERT,
            transaction: t
          }
        )
      }
      await t.commit()

      // Obtener la película actualizada
      const updatedMovie = await this.getById({ id })

      return updatedMovie
    } catch (error) {
      await t.rollback()
      throw error
    }
  }
}
