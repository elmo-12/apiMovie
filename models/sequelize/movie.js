import { QueryTypes } from 'sequelize'
import { sequelize } from '../../database.js'

/**
 * Clase que proporciona métodos para interactuar con la tabla de películas en la base de datos.
 */
export class MovieModel {
  /**
   * Obtiene todas las películas, opcionalmente filtradas por género.
   * @param {Object} options - Opciones de filtrado (opcional).
   * @param {string} options.genre - Género por el que filtrar las películas.
   * @returns {Promise<Array<Object>>} - Array de objetos que representan las películas obtenidas.
   */
  static async getAll ({ genre }) {
    const query = `
      SELECT m.id, m.title, m.year_, m.director, m.duration, m.poster, m.rate, ARRAY_AGG(g.name) AS genres
      FROM movie m
      JOIN movie_genre mg ON m.id = mg.movie_id
      JOIN genre g ON mg.genre_id = g.id
      ${genre ? 'WHERE LOWER(g.name) = :lowerCaseGenre' : ''}
      GROUP BY m.id
    `
    const replacements = { lowerCaseGenre: genre?.toLowerCase() }

    // Ejecutar la consulta y devolver el resultado
    const movies = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    })
    return movies
  }

  /**
   * Obtiene una película por su ID.
   * @param {Object} options - Opciones de búsqueda.
   * @param {string} options.id - ID de la película a buscar.
   * @returns {Promise<Object|null>} - Objeto que representa la película encontrada, o null si no se encontró ninguna.
   */
  static async getById ({ id }) {
    const movie = await sequelize.query(
      `SELECT m.id, m.title, m.year_, m.director, m.duration, m.poster, m.rate, ARRAY_AGG(g.name) AS genres
      FROM movie m
      LEFT JOIN movie_genre mg ON m.id = mg.movie_id
      LEFT JOIN genre g ON mg.genre_id = g.id
      WHERE m.id = :id
      GROUP BY m.id`,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    )
    return movie[0] || null
  }

  /**
   * Crea una nueva película en la base de datos.
   * @param {Object} options - Opciones para la creación de la película.
   * @param {Object} options.input - Datos de la película a crear.
   * @returns {Promise<Object>} - Objeto que representa la película creada.
   */
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

    // Ejecutar la consulta de inserción dentro de una transacción
    const t = await sequelize.transaction()
    try {
      const [movie] = await sequelize.query(
        `INSERT INTO movie (title, year_, director, duration, rate, poster)
        VALUES (:title, :year, :director, :duration, :rate, :poster)
        RETURNING id`,
        {
          replacements: { title, year, director, duration, rate, poster },
          type: QueryTypes.INSERT,
          transaction: t
        }
      )

      // Insertar asociaciones de género
      for (const genre of genres) {
        let [genreRecord] = await sequelize.query(
          'SELECT id FROM genre WHERE LOWER(name) = :lowerCaseGenre',
          {
            replacements: { lowerCaseGenre: genre },
            type: QueryTypes.SELECT,
            transaction: t
          }
        )

        let genreId
        if (!genreRecord) {
          [genreRecord] = await sequelize.query(
            'INSERT INTO genre (name) VALUES (:name) RETURNING id',
            {
              replacements: { name: genre },
              type: QueryTypes.INSERT,
              transaction: t
            }
          )
          genreId = genreRecord.id
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

      // Obtener la película creada
      const createdMovie = await this.getById({ id: movie[0].id })
      return createdMovie
    } catch (error) {
      await t.rollback()
      throw error
    }
  }

  /**
   * Actualiza una película existente en la base de datos.
   * @param {Object} options - Opciones para la actualización de la película.
   * @param {string} options.id - ID de la película a actualizar.
   * @param {Object} options.input - Nuevos datos de la película.
   * @returns {Promise<Object>} - Objeto que representa la película actualizada.
   */
  static async update ({ id, input }) {
    const { title, year, director, duration, rate, poster, genre: genresInput } = input

    // Ejecutar la actualización dentro de una transacción
    const t = await sequelize.transaction()
    try {
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

      // Insertar nuevas asociaciones de género
      const genres = Array.isArray(genresInput) ? genresInput.map(genre => genre.toLowerCase()) : []
      for (const genre of genres) {
        let [genreRecord] = await sequelize.query(
          'SELECT id FROM genre WHERE LOWER(name) = :lowerCaseGenre',
          {
            replacements: { lowerCaseGenre: genre },
            type: QueryTypes.SELECT,
            transaction: t
          }
        )

        let genreId
        if (!genreRecord) {
          [genreRecord] = await sequelize.query(
            'INSERT INTO genre (name) VALUES (:name) RETURNING id',
            {
              replacements: { name: genre },
              type: QueryTypes.INSERT,
              transaction: t
            }
          )
          genreId = genreRecord.id
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

  /**
   * Elimina una película de la base de datos.
   * @param {Object} options - Opciones para la eliminación de la película.
   * @param {string} options.id - ID de la película a eliminar.
   * @returns {Promise<Object|null>} - Objeto que representa la película eliminada, o null si no se encontró ninguna.
   */
  static async delete ({ id }) {
    if (!id) return null

    // Ejecutar la eliminación dentro de una transacción
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
}
