import mysql from 'mysql2/promise'

const config = {
  host: 'localhost',
  user: 'root',
  port: 3308,
  password: '74959147',
  database: 'moviesdb'
}

const connection = await mysql.createConnection(config)

export class MovieModel {
  static async getAll ({ genre }) {
    if (genre) {
      const lowerCaseGenre = genre.toLowerCase()

      const [genres] = await connection.query(
        'SELECT id, name FROM genre WHERE LOWER(name) = ?', [lowerCaseGenre]
      )

      // Si no existe el género, devolvemos un array vacío
      if (genres.length === 0) return []

      const [{ id }] = genres

      const [moviesIds] = await connection.query(
        'SELECT movie_id FROM movie_genre WHERE genre_id = ?', [id]
      )

      // Si no hay películas con ese género, devolvemos un array vacío
      if (moviesIds.length === 0) return []

      const [movies] = await connection.query(
        `SELECT m.title, m.year_, m.director, m.duration, m.poster, m.rate
        FROM movie m
        JOIN movie_genre mg ON m.id = mg.movie_id
        JOIN genre g ON mg.genre_id = g.id
        WHERE g.name = ?`, [lowerCaseGenre]
      )

      return movies
    }

    const [movies] = await connection.query(
      'SELECT  BIN_TO_UUID(id) id, title, year_, director, duration, poster, rate FROM movie'
    )

    return movies
  }

  static async getById ({ id }) {
    const [movies] = await connection.query(
      'SELECT BIN_TO_UUID(id) id, title, year_, director, duration, poster, rate FROM movie WHERE id = UUID_TO_BIN(?)', [id]
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

    const [uuidResult] = await connection.query('SELECT UUID() uuid')
    const [{ uuid }] = uuidResult

    try {
      await connection.query(
        'INSERT INTO movie (id, title, year_, director, duration, rate, poster) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?)',
        [uuid, title, year, director, duration, rate, poster]
      )
    } catch (error) {
      // No deberíamos hacer esto en un entorno de producción porque estamos exponiendo información sensible
      throw new Error('Error al crear la película')
    }

    const [movies] = await connection.query(
      'SELECT BIN_TO_UUID(id) id, title, year_, director, duration, poster, rate FROM movie WHERE id = UUID_TO_BIN(?)', [uuid]
    )

    return movies[0]
  }

  static async delete ({ id }) {
  }

  static async update ({ id, input }) {
  }
}
