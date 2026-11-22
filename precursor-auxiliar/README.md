# Precursor auxiliar · Las Brisas Spanish

La solicitud está en `precursor-auxiliar/` y la bandeja del comité en
`precursor-auxiliar/comite.html`. El selector del comité navega entre páginas
distintas. Se comparten las cuentas existentes de Supabase. Las solicitudes,
aprobaciones y permisos de Auxiliar usan tablas propias.

## Activación

1. Confirme que el comité acepta la firma escrita en el formulario web.
2. Ejecute `precursor-auxiliar/schema.sql` una vez en el proyecto Supabase
   existente. Agregue a los tres miembros vigentes a `aux_committee` mediante
   sus UUID exactos de `profiles`. Verifique los tres roles antes de publicar.

   ```sql
   insert into public.aux_committee (user_id, rol)
   select user_id, rol from public.profiles
   where user_id in ('UUID-COORDINADOR', 'UUID-SECRETARIO', 'UUID-SUPERINTENDENTE');
   ```

3. Despliegue `supabase/functions/aux-notify` con `--no-verify-jwt`. Configure
   `AUX_WEBHOOK_SECRET` con un secreto aleatorio, `AUX_SECRETARY_EMAIL` con la
   misma dirección de aviso de Metropolitan, `AUX_FROM_EMAIL` con un remitente
   verificado en Resend, `RESEND_API_KEY` y `AUX_COMMITTEE_URL` con el enlace
   HTTPS directo a la bandeja Auxiliar. Configure un webhook de base de datos
   para INSERT en `public.aux_notifications` hacia esa función, con
   `Authorization: Bearer <AUX_WEBHOOK_SECRET>`. Mantenga estos valores fuera
   del código público. Los avisos no incluyen nombres ni detalles de la solicitud.
   Revise los errores del webhook y reintente el evento si el proveedor falla.
4. Publique el sitio y realice una prueba con datos ficticios. Compruebe que un
   usuario de Metropolitan sin membresía Auxiliar no puede leer sus solicitudes,
   ni abrirlas por la API. Compruebe que se recibe un aviso al enviar y otro tras
   la tercera inicial, que cada cuenta solo firma una vez y que el PDF refleja
   las tres iniciales. Compruebe que el selector navega a la otra bandeja y que
   las solicitudes de prueba permanecen en Auxiliar.
