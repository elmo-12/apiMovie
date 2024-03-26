import Sequelize from 'sequelize'

export const sequelize = new Sequelize('moviesdb', 'fl0user', 'r5m3JuNbHKnC', {
  host: 'ep-hidden-glade-a1boqiww.ap-southeast-1.aws.neon.fl0.io',
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Esto puede ser necesario en entornos de desarrollo, pero NO se recomienda en producción
    }
  },
  ssl: true,
  logging: false // Aquí desactivamos los mensajes de consola
})
