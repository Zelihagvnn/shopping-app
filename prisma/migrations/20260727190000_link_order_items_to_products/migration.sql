-- Preserve historical order items whose products no longer exist.
UPDATE "OrderItem" order_item
SET "productId" = NULL
WHERE order_item."productId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Product" product
    WHERE product."id" = order_item."productId"
  );

CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
