-- CreateTable
CREATE TABLE "weather_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "fetched_at" DATETIME NOT NULL,
    "location_name" TEXT,
    "data" TEXT NOT NULL,
    CONSTRAINT "weather_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "weather_cache_user_id_key" ON "weather_cache"("user_id");
