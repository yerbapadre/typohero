-- Opening stock. Prices are tuned against STARTING_LECOIN (500): two impulse
-- buys at the bar, one mid, two you have to save for.
--
-- Adding stock later is a plain insert, no migration required:
--   wrangler d1 execute typohero --remote --command \
--     "INSERT INTO products (id, booth, name, description, price, icon, sort_order)
--      VALUES ('id', 'merch', 'Name', 'Flavor text', 100, '🎸', 9)"

INSERT INTO products (id, booth, name, description, price, icon, sort_order) VALUES
  ('diet-coke', 'bar', 'Case of Diet Coke',
   'A full case. Room temperature, obviously.', 25, '/store/diet-coke.png', 1),
  ('baja-blast-pie', 'bar', 'Carter''s Baja Blast Pie',
   'Carter swears the teal is a flavor, not a dye.', 60, '/store/baja-blast-pie.png', 2),
  ('board-game', 'merch', 'Jake''s Board Game',
   'Rules explained for 45 minutes. Played for 10.', 120, '/store/board-game.png', 1),
  ('zando-headshot', 'merch', 'Framed Headshot of Zando',
   'Hangs itself. Watches you type.', 200, '/store/zando-headshot.png', 2),
  ('seths-boat', 'merch', 'Seth''s Boat',
   'Not a boat payment. The boat.', 450, '/store/seths-boat.png', 3);
