export const envConfig = () => ({
    postgresql: {
        dbName: process.env.POSTGRES_DB_NAME || "postgres",
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
        username: process.env.POSTGRES_USERNAME || "postgres",
        password: process.env.POSTGRES_PASSWORD || "Cuong123_A",
        refreshInterval: parseInt(process.env.POSTGRES_REFRESH_INTERVAL || "30000", 10),
    },
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD || "Cuong123_A",
    }
})