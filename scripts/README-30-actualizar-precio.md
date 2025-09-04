How to deploy the RPC function `actualizar_precio_embarque`

1) Open Supabase SQL editor for your project (or psql connected to your DB).
2) Copy the contents of `30-actualizar-precio-rpc.sql` and run them.
   - The script is idempotent: it creates the function using CREATE OR REPLACE.
   - It also ensures `pgcrypto` extension is available for gen_random_uuid().

3) (Optional) Grant EXECUTE privileges to the role your API uses (for Supabase it might be `authenticated` or `service_role`).
   - Uncomment and adjust the GRANT line at the bottom of the SQL file if needed.

4) Test the RPC with a real embarque id:
   - Example (replace with a real UUID):
     SELECT public.actualizar_precio_embarque('00000000-0000-0000-0000-000000000000', 1250.50, 'you@company', 'Prueba de cambio de precio');

5) Verify results:
   - The `embarques` row should show the new `precio_flete`.
   - A new row should exist in `embarque_modificaciones` with the razon and usuario.

Notes:
- The function always updates `precio_flete` (per product requirement), even if quickpaid is enabled.
- If you use Row Level Security, ensure the role executing the function has permissions to UPDATE `embarques` and INSERT into `embarque_modificaciones` (or run the RPC via a service key / supabase function endpoint).

If you'd like, I can also add a tiny SQL test file that uses a temporary embarque row and verifies the function behavior.
