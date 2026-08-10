CREATE TABLE "ProductVariant" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "sizeId" INTEGER,
    "colorId" INTEGER,
    "sku" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX "ProductVariant_sizeId_idx" ON "ProductVariant"("sizeId");
CREATE INDEX "ProductVariant_colorId_idx" ON "ProductVariant"("colorId");

ALTER TABLE "ProductVariant"
ADD CONSTRAINT "ProductVariant_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductVariant"
ADD CONSTRAINT "ProductVariant_sizeId_fkey"
FOREIGN KEY ("sizeId") REFERENCES "Size"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductVariant"
ADD CONSTRAINT "ProductVariant_colorId_fkey"
FOREIGN KEY ("colorId") REFERENCES "Color"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

WITH combinations AS (
    SELECT
        p."id" AS "productId",
        size_option."sizeId",
        color_option."colorId",
        p."stock",
        ROW_NUMBER() OVER (
            PARTITION BY p."id"
            ORDER BY size_option."sizeId" NULLS FIRST, color_option."colorId" NULLS FIRST
        ) AS row_number,
        COUNT(*) OVER (PARTITION BY p."id") AS combination_count
    FROM "Product" p
    CROSS JOIN LATERAL (
        SELECT ps."sizeId"
        FROM "ProductSize" ps
        WHERE ps."productId" = p."id"
        UNION ALL
        SELECT NULL::INTEGER
        WHERE NOT EXISTS (
            SELECT 1 FROM "ProductSize" ps WHERE ps."productId" = p."id"
        )
    ) size_option
    CROSS JOIN LATERAL (
        SELECT pc."colorId"
        FROM "ProductColor" pc
        WHERE pc."productId" = p."id"
        UNION ALL
        SELECT NULL::INTEGER
        WHERE NOT EXISTS (
            SELECT 1 FROM "ProductColor" pc WHERE pc."productId" = p."id"
        )
    ) color_option
)
INSERT INTO "ProductVariant" ("productId", "sizeId", "colorId", "stock")
SELECT
    "productId",
    "sizeId",
    "colorId",
    ("stock" / combination_count)
      + CASE WHEN row_number <= ("stock" % combination_count) THEN 1 ELSE 0 END
FROM combinations;

ALTER TABLE "OrderItem"
ADD COLUMN "variantId" INTEGER,
ADD COLUMN "selectedSize" TEXT,
ADD COLUMN "selectedColor" TEXT;

CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "ProductSize";
DROP TABLE "ProductColor";
ALTER TABLE "Product" DROP COLUMN "stock";
