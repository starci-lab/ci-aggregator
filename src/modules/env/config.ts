export const envConfig = () => ({
    postgresql: {
        dbName: process.env.POSTGRES_DB_NAME || "default_db",
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
        username: process.env.POSTGRES_USERNAME || "postgres",
        password: process.env.POSTGRES_PASSWORD || "",
    },
})