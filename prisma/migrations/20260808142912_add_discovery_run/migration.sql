-- CreateTable
CREATE TABLE "DiscoveryRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "citiesCount" INTEGER NOT NULL,
    "categoriesCount" INTEGER NOT NULL,
    "combosRun" INTEGER NOT NULL,
    "createdLeads" INTEGER NOT NULL,
    "updatedLeads" INTEGER NOT NULL,
    "hotLeads" INTEGER NOT NULL,
    "error" TEXT,

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);
