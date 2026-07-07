-- AlterTable
ALTER TABLE "Account" ADD COLUMN "statementCloseDay" INTEGER,
ADD COLUMN "lastStatementDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "closeDate" TIMESTAMP(3) NOT NULL,
    "statementBalance" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'plaid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Statement_accountId_closeDate_key" ON "Statement"("accountId", "closeDate");

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Match RLS posture of existing tables
ALTER TABLE "Statement" ENABLE ROW LEVEL SECURITY;
