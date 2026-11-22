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

3. Publique el sitio y compruebe el acceso al formulario con el código de
   Metropolitan. Cada portal recuerda el acceso por separado en la pestaña.
   El código del navegador solo controla la presentación del formulario.
4. Verifique la selección de meses, el acceso de los tres miembros, sus
   aprobaciones individuales y el PDF con datos ficticios.

## Notificaciones pendientes

El envío de correo al secretario queda pendiente para una actualización
posterior del proceso existente de Gmail Apps Script. Los eventos de
recepción y aprobación se registran en `aux_notifications`.
