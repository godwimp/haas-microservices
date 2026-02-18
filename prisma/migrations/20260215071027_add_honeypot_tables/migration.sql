-- CreateTable
CREATE TABLE "traps" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT '*',
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "response_code" INTEGER NOT NULL DEFAULT 404,
    "response_body" JSONB,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "traps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trap_logs" (
    "id" TEXT NOT NULL,
    "trap_id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "user_agent" TEXT,
    "headers" JSONB,
    "query_params" JSONB,
    "body" JSONB,
    "country_code" TEXT,
    "is_vpn" BOOLEAN,
    "risk_score" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trap_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "traps_path_key" ON "traps"("path");

-- CreateIndex
CREATE INDEX "trap_logs_trap_id_idx" ON "trap_logs"("trap_id");

-- CreateIndex
CREATE INDEX "trap_logs_ip_address_idx" ON "trap_logs"("ip_address");

-- CreateIndex
CREATE INDEX "trap_logs_created_at_idx" ON "trap_logs"("created_at");

-- CreateIndex
CREATE INDEX "trap_logs_risk_score_idx" ON "trap_logs"("risk_score");

-- AddForeignKey
ALTER TABLE "trap_logs" ADD CONSTRAINT "trap_logs_trap_id_fkey" FOREIGN KEY ("trap_id") REFERENCES "traps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
