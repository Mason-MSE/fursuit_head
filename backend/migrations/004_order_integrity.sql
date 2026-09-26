-- Forward-only: translates legacy order states to the V4 contract.
ALTER TABLE orders MODIFY status VARCHAR(50) NOT NULL DEFAULT 'awaiting_payment';
ALTER TABLE orders ADD COLUMN shipping_address_snapshot JSON NULL;
UPDATE orders o JOIN addresses a ON a.id=o.shipping_address_id SET o.shipping_address_snapshot=JSON_OBJECT('full_name',a.full_name,'line1',a.line1,'line2',a.line2,'city',a.city,'state',a.state,'postal_code',a.postal_code,'country',a.country);
UPDATE orders SET status='awaiting_payment' WHERE status='pending';
UPDATE orders SET status='paid' WHERE status='confirmed';

ALTER TABLE payments MODIFY status VARCHAR(30) NOT NULL DEFAULT 'pending';
