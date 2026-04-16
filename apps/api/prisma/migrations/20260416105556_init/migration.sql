-- CreateTable
CREATE TABLE "Word" (
    "id" SERIAL NOT NULL,
    "text" VARCHAR(5) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyWord" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,

    CONSTRAINT "DailyWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" SERIAL NOT NULL,
    "playerId" VARCHAR(36) NOT NULL,
    "dailyWordId" INTEGER NOT NULL,
    "attempts" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(10) NOT NULL DEFAULT 'playing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Word_text_key" ON "Word"("text");

-- CreateIndex
CREATE INDEX "Word_usedAt_idx" ON "Word"("usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyWord_date_key" ON "DailyWord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyWord_gameNumber_key" ON "DailyWord"("gameNumber");

-- CreateIndex
CREATE INDEX "DailyWord_date_idx" ON "DailyWord"("date");

-- CreateIndex
CREATE INDEX "GameSession_playerId_idx" ON "GameSession"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_playerId_dailyWordId_key" ON "GameSession"("playerId", "dailyWordId");

-- AddForeignKey
ALTER TABLE "DailyWord" ADD CONSTRAINT "DailyWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_dailyWordId_fkey" FOREIGN KEY ("dailyWordId") REFERENCES "DailyWord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
