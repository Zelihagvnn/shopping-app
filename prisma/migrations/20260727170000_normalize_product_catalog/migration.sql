-- Create normalized lookup tables.
CREATE TABLE "Size" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Size_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Color" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Size_name_key" ON "Size"("name");
CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");

ALTER TABLE "Product" ADD COLUMN "categoryId" INTEGER;

-- Ensure every legacy category name exists in Category.
INSERT INTO "Category" ("name", "slug", "isActive", "createdAt", "updatedAt")
SELECT DISTINCT
    TRIM(p."category"),
    'kategori-' || SUBSTRING(MD5(LOWER(TRIM(p."category"))) FROM 1 FOR 12),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Product" p
WHERE p."category" IS NOT NULL
  AND TRIM(p."category") <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM "Category" c
      WHERE LOWER(TRIM(c."name")) = LOWER(TRIM(p."category"))
  );

UPDATE "Product" p
SET "categoryId" = c."id"
FROM "Category" c
WHERE p."category" IS NOT NULL
  AND LOWER(TRIM(c."name")) = LOWER(TRIM(p."category"));

-- Move distinct legacy size and color values into lookup tables.
INSERT INTO "Size" ("name")
SELECT DISTINCT option_name
FROM (
    SELECT TRIM(value) AS option_name
    FROM "Product"
    CROSS JOIN LATERAL UNNEST("sizes") AS value
) values_to_move
WHERE option_name <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Color" ("name")
SELECT DISTINCT option_name
FROM (
    SELECT TRIM(value) AS option_name
    FROM "Product"
    CROSS JOIN LATERAL UNNEST("colors") AS value
) values_to_move
WHERE option_name <> ''
ON CONFLICT ("name") DO NOTHING;

CREATE TABLE "ProductSize" (
    "productId" INTEGER NOT NULL,
    "sizeId" INTEGER NOT NULL,
    CONSTRAINT "ProductSize_pkey" PRIMARY KEY ("productId", "sizeId")
);

CREATE TABLE "ProductColor" (
    "productId" INTEGER NOT NULL,
    "colorId" INTEGER NOT NULL,
    CONSTRAINT "ProductColor_pkey" PRIMARY KEY ("productId", "colorId")
);

INSERT INTO "ProductSize" ("productId", "sizeId")
SELECT DISTINCT p."id", s."id"
FROM "Product" p
CROSS JOIN LATERAL UNNEST(p."sizes") AS value
JOIN "Size" s ON s."name" = TRIM(value)
ON CONFLICT DO NOTHING;

INSERT INTO "ProductColor" ("productId", "colorId")
SELECT DISTINCT p."id", c."id"
FROM "Product" p
CROSS JOIN LATERAL UNNEST(p."colors") AS value
JOIN "Color" c ON c."name" = TRIM(value)
ON CONFLICT DO NOTHING;

CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "ProductSize_sizeId_idx" ON "ProductSize"("sizeId");
CREATE INDEX "ProductColor_colorId_idx" ON "ProductColor"("colorId");

ALTER TABLE "Product"
ADD CONSTRAINT "Product_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductSize"
ADD CONSTRAINT "ProductSize_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSize"
ADD CONSTRAINT "ProductSize_sizeId_fkey"
FOREIGN KEY ("sizeId") REFERENCES "Size"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductColor"
ADD CONSTRAINT "ProductColor_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductColor"
ADD CONSTRAINT "ProductColor_colorId_fkey"
FOREIGN KEY ("colorId") REFERENCES "Color"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product"
DROP COLUMN "category",
DROP COLUMN "sizes",
DROP COLUMN "colors";
