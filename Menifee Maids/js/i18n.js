/* =========================================================================
   MCC.i18n — English / Spanish
   -------------------------------------------------------------------------
   The page declares its language on <html lang="…">. Everything the customer
   reads flows through T(key). The owner's dashboard stays in English; what
   changes is the language of the messages that go out to each customer, which
   is stored on the job so a reply months later still goes out in the language
   they booked in.

   Translations are written for how people actually speak in the Inland Empire
   — "recámaras" not "habitaciones", "cochera" not "garaje".
   ========================================================================= */
(function (window) {
  "use strict";

  var STRINGS = {
    en: {
      /* flow chrome */
      "step.area": "Area",
      "step.home": "Your place",
      "step.business": "Facility",
      "step.when": "Times",
      "step.contact": "Contact",
      "step.review": "Review",
      "btn.continue": "Continue",
      "btn.send": "Send request",
      "btn.back": "Back",

      /* area step */
      "area.inServiceArea": "Great \u2014 we clean in <strong>{city}</strong>.",
      "area.outOfArea": "That ZIP is outside our usual area. We may still be able to help \u2014 <a href=\"tel:9514648147\">call or text 951-464-8147</a> and we'll let you know.",

      /* facility options */
      "fac.office": "Office", "fac.office.note": "Suites, common areas",
      "fac.retail": "Retail or salon", "fac.retail.note": "Front of house",
      "fac.medical": "Medical or dental", "fac.medical.note": "Higher sanitation standard",
      "fac.construction": "Construction site", "fac.construction.note": "Post-build cleanup",
      "fac.other": "Something else", "fac.other.note": "Tell us below",

      /* times step */
      "when.homeTitle": "When works for you?",
      "when.bizTitle": "When can we walk the facility?",
      "when.first": "First choice",
      "when.backup": "Backup choice",
      "when.none": "No open times posted right now. <a href=\"tel:9514648147\">Call or text 951-464-8147</a> and we'll find you a slot.",

      /* address label */
      "addr.service": "Service address",
      "addr.facility": "Facility address",

      /* validation */
      "err.zip": "Enter a ZIP code we serve so we know where we're going.",
      "err.kind": "Choose whether we're cleaning your home or your business.",
      "err.facility": "Choose the type of facility.",
      "err.slot1date": "Pick a first-choice date.",
      "err.slot1window": "Pick a time window for your first choice.",
      "err.slot2date": "Pick a backup date.",
      "err.slot2window": "Pick a time window for your backup.",
      "err.name": "Add your full name.",
      "err.phoneMissing": "Add a mobile number.",
      "err.phoneShort": "That number looks short \u2014 we need all 10 digits.",
      "err.emailMissing": "Add an email \u2014 your confirmation goes there.",
      "err.emailBad": "That email doesn't look right. Check the spelling.",
      "err.company": "Add the company name.",
      "err.street": "Add the street address so we can find you.",
      "err.city": "Choose the city.",
      "err.zip2Missing": "Add the ZIP code.",
      "err.zip2Short": "A ZIP code is 5 digits.",
      "err.zip2Unserved": "We don't cover that ZIP code \u2014 call us and we'll check.",
      "err.zipCityMismatch": "ZIP {zip} is in {actual}, not {chosen}.",
      "err.oneThing": "One thing still needs filling in:",
      "err.fewThings": "A few things still need filling in:",

      /* review */
      "rev.service": "Service",
      "rev.house": "House cleaning",
      "rev.commercial": "Commercial cleaning",
      "rev.location": "Location",
      "rev.property": "Property",
      "rev.bedbath": "{bed} bed / {bath} bath",
      "rev.frequency": "How often",
      "rev.addons": "Add-ons",
      "rev.facility": "Facility",
      "rev.size": "Size",
      "rev.perWeek": "Cleanings per week",
      "rev.first": "First choice",
      "rev.backup": "Backup",
      "rev.name": "Name",
      "rev.company": "Company",
      "rev.phone": "Phone",
      "rev.email": "Email",
      "rev.address": "Address",
      "rev.estimateCap": "Estimated per visit",
      "rev.estimateNote": "This is an estimate based on what you told us. If the job turns out bigger than described, we'll talk to you before doing extra work \u2014 never after.",
      "rev.bizNote": "We'll send a written quote within 48 hours of the walkthrough, including scope, pricing and proof of insurance.",

      /* estimate bar */
      "est.label": "Your estimate",
      "est.perVisit": "per visit",
      "est.saving": "Saving {amount} every visit vs {oneTime} one-time",
      "est.each": "{amount} per visit",

      /* done */
      "done.title": "Request received",
      "done.body": "Thanks, {first}. This is a request, not a confirmed booking \u2014 we'll review it and confirm your time by the end of the day.",
      "done.ref": "Reference {id}",
      "done.email": "Email us this request",
      "done.call": "Call 951-464-8147",
      "done.nocharge": "Nothing has been charged. If you'd like to pay online, we'll email a secure link after the visit.",

      /* email to the business */
      "mail.subject": "Request {id} - {name} ({city})",
      "mail.headerHome": "NEW CLEANING REQUEST",
      "mail.headerBiz": "NEW COMMERCIAL QUOTE REQUEST",
      "mail.none": "none",
      "mail.notGiven": "not given"
    },

    es: {
      "step.area": "Zona",
      "step.home": "Su casa",
      "step.business": "Local",
      "step.when": "Horarios",
      "step.contact": "Contacto",
      "step.review": "Revisar",
      "btn.continue": "Continuar",
      "btn.send": "Enviar solicitud",
      "btn.back": "Atr\u00e1s",

      "area.inServiceArea": "\u00a1Perfecto! S\u00ed damos servicio en <strong>{city}</strong>.",
      "area.outOfArea": "Ese c\u00f3digo postal est\u00e1 fuera de nuestra zona habitual. Tal vez a\u00fan podamos ayudarle \u2014 <a href=\"tel:9514648147\">ll\u00e1menos o mande un texto al 951-464-8147</a> y le confirmamos.",

      "fac.office": "Oficina", "fac.office.note": "Suites y \u00e1reas comunes",
      "fac.retail": "Tienda o sal\u00f3n", "fac.retail.note": "\u00c1rea de atenci\u00f3n al p\u00fablico",
      "fac.medical": "Consultorio m\u00e9dico o dental", "fac.medical.note": "Requiere mayor sanitizaci\u00f3n",
      "fac.construction": "Obra en construcci\u00f3n", "fac.construction.note": "Limpieza despu\u00e9s de obra",
      "fac.other": "Otro tipo", "fac.other.note": "Cu\u00e9ntenos abajo",

      "when.homeTitle": "\u00bfQu\u00e9 d\u00eda le acomoda?",
      "when.bizTitle": "\u00bfCu\u00e1ndo podemos ir a ver el local?",
      "when.first": "Primera opci\u00f3n",
      "when.backup": "Segunda opci\u00f3n",
      "when.none": "Por ahora no hay horarios publicados. <a href=\"tel:9514648147\">Ll\u00e1menos o mande un texto al 951-464-8147</a> y le buscamos un espacio.",

      "addr.service": "Direcci\u00f3n del servicio",
      "addr.facility": "Direcci\u00f3n del local",

      "err.zip": "Escriba un c\u00f3digo postal de nuestra zona para saber a d\u00f3nde vamos.",
      "err.kind": "Elija si vamos a limpiar su casa o su negocio.",
      "err.facility": "Elija el tipo de local.",
      "err.slot1date": "Elija la fecha de su primera opci\u00f3n.",
      "err.slot1window": "Elija el horario de su primera opci\u00f3n.",
      "err.slot2date": "Elija la fecha de su segunda opci\u00f3n.",
      "err.slot2window": "Elija el horario de su segunda opci\u00f3n.",
      "err.name": "Escriba su nombre completo.",
      "err.phoneMissing": "Escriba un n\u00famero de celular.",
      "err.phoneShort": "Ese n\u00famero est\u00e1 incompleto \u2014 necesitamos los 10 d\u00edgitos.",
      "err.emailMissing": "Escriba su correo \u2014 ah\u00ed le mandamos la confirmaci\u00f3n.",
      "err.emailBad": "Ese correo no parece correcto. Rev\u00edselo por favor.",
      "err.company": "Escriba el nombre de la empresa.",
      "err.street": "Escriba la calle y n\u00famero para poder llegar.",
      "err.city": "Elija la ciudad.",
      "err.zip2Missing": "Escriba el c\u00f3digo postal.",
      "err.zip2Short": "El c\u00f3digo postal lleva 5 d\u00edgitos.",
      "err.zip2Unserved": "No cubrimos ese c\u00f3digo postal \u2014 ll\u00e1menos y lo revisamos.",
      "err.zipCityMismatch": "El c\u00f3digo {zip} es de {actual}, no de {chosen}.",
      "err.oneThing": "Falta un dato:",
      "err.fewThings": "Faltan algunos datos:",

      "rev.service": "Servicio",
      "rev.house": "Limpieza de casa",
      "rev.commercial": "Limpieza comercial",
      "rev.location": "Ubicaci\u00f3n",
      "rev.property": "Propiedad",
      "rev.bedbath": "{bed} rec\u00e1maras / {bath} ba\u00f1os",
      "rev.frequency": "Frecuencia",
      "rev.addons": "Servicios extra",
      "rev.facility": "Local",
      "rev.size": "Tama\u00f1o",
      "rev.perWeek": "Limpiezas por semana",
      "rev.first": "Primera opci\u00f3n",
      "rev.backup": "Segunda opci\u00f3n",
      "rev.name": "Nombre",
      "rev.company": "Empresa",
      "rev.phone": "Tel\u00e9fono",
      "rev.email": "Correo",
      "rev.address": "Direcci\u00f3n",
      "rev.estimateCap": "Estimado por visita",
      "rev.estimateNote": "Este es un estimado basado en lo que nos coment\u00f3. Si el trabajo resulta m\u00e1s grande de lo descrito, hablamos con usted antes de hacer trabajo extra \u2014 nunca despu\u00e9s.",
      "rev.bizNote": "Le enviamos una cotizaci\u00f3n por escrito dentro de 48 horas despu\u00e9s de visitar el local, con el alcance, los precios y el comprobante de seguro.",

      "est.label": "Su estimado",
      "est.perVisit": "por visita",
      "est.saving": "Ahorra {amount} en cada visita contra {oneTime} de una sola vez",
      "est.each": "{amount} por visita",

      "done.title": "Solicitud recibida",
      "done.body": "Gracias, {first}. Esto es una solicitud, todav\u00eda no es una cita confirmada \u2014 la revisamos y le confirmamos su horario hoy mismo.",
      "done.ref": "Referencia {id}",
      "done.email": "Env\u00edenos esta solicitud por correo",
      "done.call": "Llamar al 951-464-8147",
      "done.nocharge": "No se ha cobrado nada. Si desea pagar en l\u00ednea, le mandamos un enlace seguro despu\u00e9s de la visita.",

      "mail.subject": "Solicitud {id} - {name} ({city})",
      "mail.headerHome": "NUEVA SOLICITUD DE LIMPIEZA (cliente en espa\u00f1ol)",
      "mail.headerBiz": "NUEVA SOLICITUD DE COTIZACI\u00d3N COMERCIAL (cliente en espa\u00f1ol)",
      "mail.none": "ninguno",
      "mail.notGiven": "no indicado"
    }
  };

  /* Words that appear in the pricing table and the calendar. */
  var TERMS = {
    en: {
      windows: { morning: "Morning", midday: "Midday", afternoon: "Afternoon", evening: "Evening" },
      frequency: { once: "One-time", monthly: "Monthly", biweekly: "Biweekly", weekly: "Weekly" },
      addons: {
        oven: "Inside oven", fridge: "Inside refrigerator", windows: "Interior windows",
        laundry: "Laundry", fans: "Ceiling fans & vents", carpet: "Carpet & deodorizing",
        garage: "Garage organizing", declutter: "Decluttering & closets",
        petfur: "Pet fur removal", odor: "Odor removal"
      }
    },
    es: {
      windows: { morning: "Ma\u00f1ana", midday: "Mediod\u00eda", afternoon: "Tarde", evening: "Noche" },
      frequency: { once: "Una sola vez", monthly: "Mensual", biweekly: "Cada dos semanas", weekly: "Semanal" },
      addons: {
        oven: "Interior del horno", fridge: "Interior del refrigerador", windows: "Ventanas por dentro",
        laundry: "Lavander\u00eda", fans: "Ventiladores y ventilas", carpet: "Alfombra y desodorizado",
        garage: "Organizar la cochera", declutter: "Orden y cl\u00f3sets",
        petfur: "Quitar pelo de mascota", odor: "Eliminar olores"
      }
    }
  };


  /* =======================================================================
     Owner dashboard
     -----------------------------------------------------------------------
     The dashboard's static markup is translated in admin-es.html. Everything
     admin.js renders at runtime flows through trHTML() / dash() instead, so
     the Spanish dashboard runs the exact same code path as the English one —
     same functions, same behaviour, only the words change.
     ======================================================================= */
  var DASH_ES = {
    /* card + inbox */
    "No Stripe link saved yet, so the Pay button will tell the customer card payments aren\u2019t on.":
      "A\u00fan no hay enlace de Stripe, as\u00ed que el bot\u00f3n de pago le dir\u00e1 al cliente que no se aceptan tarjetas.",
    "Add it in Settings.": "Agr\u00e9galo en Configuraci\u00f3n.",
    "No Stripe link saved yet, so the Pay button will tell the customer card payments aren\u2019t on. Ask the owner to add it.":
      "A\u00fan no hay enlace de Stripe, as\u00ed que el bot\u00f3n de pago le dir\u00e1 al cliente que no se aceptan tarjetas. P\u00eddele al due\u00f1o que lo agregue.",
    "Enter a username for the helper.": "Escribe un usuario para el ayudante.",
    /* Errors the dashboard can surface, from js/db.js and from the API. */
    "The job database refused that API key. Check it in Settings.":
      "La base de datos rechaz\u00f3 esa clave. Rev\u00edsala en Configuraci\u00f3n.",
    "This account doesn't have access to the job database.":
      "Esta cuenta no tiene acceso a la base de datos de trabajos.",
    "The job database could not be reached. Check the connection and try again.":
      "No se pudo conectar con la base de datos. Revisa la conexi\u00f3n e int\u00e9ntalo de nuevo.",
    "The database rejected that request.": "La base de datos rechaz\u00f3 esa solicitud.",
    "The database rejected that payment update.": "La base de datos rechaz\u00f3 esa actualizaci\u00f3n de pago.",
    "Could not save the calendar.": "No se pudo guardar el calendario.",
    "Could not prepare the photo upload.": "No se pudo preparar la subida de fotos.",
    "A job needs at least a customer name.": "Un trabajo necesita al menos el nombre del cliente.",
    "A job number is required.": "Se requiere un n\u00famero de trabajo.",
    "No such job.": "Ese trabajo no existe.",
    "Not authorised.": "No autorizado.",
    "Signed in, but this account has not been given access to the dashboard.":
      "Iniciaste sesi\u00f3n, pero esta cuenta no tiene acceso al panel.",
    "An amount greater than zero is required.": "Se requiere un monto mayor que cero.",
    "No such payment link.": "Ese enlace de pago no existe.",
    "Searching\u2026": "Buscando\u2026",
    "Accept first choice": "Aceptar primera opci\u00f3n",
    "Accept backup": "Aceptar alternativa",
    "Change date &amp; time": "Cambiar fecha y hora",
    "Mark completed": "Marcar como terminado",
    "Mark as paid": "Marcar como pagado",
    "Mark unpaid": "Marcar como no pagado",
    "Mark as sent": "Marcar como enviado",
    "Reopen job": "Reabrir trabajo",
    "Rebook this job": "Reagendar este trabajo",
    "Send payment link": "Enviar enlace de pago",
    "Payment link": "Enlace de pago",
    "Add job photos": "Agregar fotos del trabajo",
    "Delete": "Eliminar",
    "Open": "Abrir",
    "Close": "Cerrar",
    "Cancel": "Cancelar",
    "Residential": "Residencial",
    "Commercial": "Comercial",
    "Paid": "Pagado",
    "Unpaid": "Sin pagar",
    "Link sent": "Enlace enviado",
    "New request": "Solicitud nueva",
    "Awaiting client": "Esperando al cliente",
    "Confirmed": "Confirmado",
    "Closed": "Cerrado",
    "Cancelled": "Cancelado",
    "Done \u2014 unpaid": "Terminado \u2014 sin pagar",
    "Quote after walkthrough": "Cotizaci\u00f3n tras la visita",
    "This customer booked in Spanish": "Este cliente reserv\u00f3 en espa\u00f1ol",

    /* summary rows */
    "First choice": "Primera opci\u00f3n",
    "Backup": "Alternativa",
    "Confirmed for": "Confirmado para",
    "Completed": "Terminado",
    "Reopened": "Reabierto",
    "Phone": "Tel\u00e9fono",
    "Email": "Correo",
    "Address": "Direcci\u00f3n",
    "Notes": "Notas",
    "Your notes": "Tus notas",
    "Scope": "Alcance",
    "Type": "Tipo",
    "Scheduled": "Agendado",
    "Status": "Estado",
    "Payment": "Pago",
    "Photos": "Fotos",
    "Amount": "Monto",
    "Expires": "Vence",
    "Customer": "Cliente",
    "Job number": "N\u00famero de trabajo",
    "Stripe reference": "Referencia de Stripe",
    "Not scheduled": "Sin agendar",
    "From the customer:": "Del cliente:",

    /* completion panel */
    "Finish this job": "Terminar este trabajo",
    "Upload job completion photos": "Subir fotos del trabajo terminado",
    "No photos yet. Tap the button above to take them or pick them from your phone.":
      "A\u00fan no hay fotos. Toca el bot\u00f3n de arriba para tomarlas o elegirlas de tu tel\u00e9fono.",
    "Message to the customer": "Mensaje para el cliente",
    "Complete &amp; send photos": "Terminar y enviar fotos",
    "Complete &amp; email": "Terminar y enviar correo",
    "Complete without sending": "Terminar sin enviar",
    "Remove this photo": "Quitar esta foto",
    "Completed and paid \u2014 this job is closed.": "Terminado y pagado \u2014 este trabajo est\u00e1 cerrado.",

    /* payment panel */
    "Create a payment link": "Crear un enlace de pago",
    "Amount to charge (USD)": "Monto a cobrar (USD)",
    "What it\u2019s for": "Concepto",
    "Create the link": "Crear el enlace",
    "Create a new link": "Crear un enlace nuevo",
    "The link": "El enlace",
    "Email the link": "Enviar enlace por correo",
    "Text the link": "Enviar enlace por mensaje",
    "Copy link": "Copiar enlace",
    "Check with Stripe": "Verificar con Stripe",

    /* messaging */
    "On my way": "Voy en camino",
    "On my way &mdash; email": "Voy en camino \u2014 correo",
    "Text confirmation": "Confirmar por mensaje",
    "Text reminder": "Recordatorio por mensaje",
    "Reminder sent": "Recordatorio enviado",
    "Reminders due": "Recordatorios pendientes",
    "Send reminder text": "Enviar recordatorio",
    "Their mobile": "Su celular",
    "Their email": "Su correo",
    "Email with photos": "Correo con fotos",
    "Text the message": "Enviar el mensaje",

    /* reschedule */
    "Move this job or propose a different slot": "Mueve este trabajo o propone otro horario",
    "Date": "Fecha",
    "Time window": "Horario",
    "Note to the customer": "Nota para el cliente",
    "Optional \u2014 e.g. we can start an hour earlier if that suits you":
      "Opcional \u2014 por ejemplo: podemos empezar una hora antes si le conviene",
    "Save as confirmed": "Guardar como confirmado",
    "Propose to customer": "Proponer al cliente",

    /* calendars */
    "Open all day": "Abrir todo el d\u00eda",
    "Close this day": "Cerrar este d\u00eda",
    "Click a highlighted day to see the jobs booked for it.":
      "Toca un d\u00eda marcado para ver los trabajos agendados.",
    "Nothing booked on this day.": "No hay nada agendado este d\u00eda.",
    "Notes for this job": "Notas de este trabajo",
    "Gate code, pets, parking, anything to remember":
      "C\u00f3digo de port\u00f3n, mascotas, estacionamiento, lo que sea",
    "Save changes": "Guardar cambios",
    "Save and email customer": "Guardar y avisar por correo",
    "Cancel booking": "Cancelar la cita",

    /* manual booking */
    "Add a booking": "Agregar una cita",
    "Customer name": "Nombre del cliente",
    "Mobile number": "N\u00famero de celular",
    "Service address": "Direcci\u00f3n del servicio",
    "Street address": "Calle y n\u00famero",
    "Apartment, suite or unit": "Departamento, suite o unidad",
    "City": "Ciudad",
    "State": "Estado",
    "ZIP code": "C\u00f3digo postal",
    "Choose": "Elegir",
    "Agreed price": "Precio acordado",
    "Add to calendar": "Agregar al calendario",
    "optional": "opcional",

    /* database */
    "Open jobs": "Trabajos abiertos",
    "Closed jobs": "Trabajos cerrados",
    "Outstanding": "Por cobrar",
    "Collected": "Cobrado",
    "Revenue collected": "Ingresos cobrados",
    "Days worked": "D\u00edas trabajados",
    "Jobs closed": "Trabajos cerrados",
    "Reset counters": "Reiniciar contadores",
    "Undo reset": "Deshacer reinicio",
    "Searching&hellip;": "Buscando&hellip;",
    "Show fewer": "Mostrar menos",
    "Nothing here yet. Try widening the dates, clearing the search box, or switching tabs.":
      "A\u00fan no hay nada. Prueba ampliar las fechas, borrar la b\u00fasqueda o cambiar de pesta\u00f1a.",
    "Click to download": "Toca para descargar",
    "Invoiced": "Facturado",
    "Menifee Maids \u2014 job records": "Menifee Maids \u2014 registros de trabajos",
    "job database": "base de datos de trabajos"
  };

  /* Composed strings: the template is translated, then values are slotted in. */
  var DASH_TPL_ES = {
    "Too many failed attempts. Try again in {n} minute.": "Demasiados intentos fallidos. Int\u00e9ntalo en {n} minuto.",
    "Too many failed attempts. Try again in {n} minutes.": "Demasiados intentos fallidos. Int\u00e9ntalo en {n} minutos.",
    "That username and password don't match.": "Ese usuario y contrase\u00f1a no coinciden.",
    "{n} attempt left before a 10 minute lockout.": "Queda {n} intento antes de un bloqueo de 10 minutos.",
    "{n} attempts left before a 10 minute lockout.": "Quedan {n} intentos antes de un bloqueo de 10 minutos.",
    "Your current password isn't right.": "Tu contrase\u00f1a actual no es correcta.",
    "Use at least 10 characters.": "Usa al menos 10 caracteres.",
    "Enter both your username and password.": "Escribe tu usuario y tu contrase\u00f1a.",
    "{n} job older than {m} months was removed just now.": "Se elimin\u00f3 {n} trabajo con m\u00e1s de {m} meses.",
    "{n} jobs older than {m} months were removed just now.": "Se eliminaron {n} trabajos con m\u00e1s de {m} meses.",
    "Records are kept for {m} months and then deleted automatically \u2014 export to PDF or CSV before that if you need them.":
      "Los registros se guardan {m} meses y luego se borran solos \u2014 exporta a PDF o CSV antes si los necesitas.",
    "Jobs are kept for {m} months and then deleted automatically.":
      "Los trabajos se guardan {m} meses y luego se borran autom\u00e1ticamente.",
    "Anything scheduled or completed before {date} has already gone. Export to PDF or CSV to keep a copy.":
      "Todo lo agendado o terminado antes del {date} ya se borr\u00f3. Exporta a PDF o CSV para guardar una copia.",
    "Showing {a} of {b} jobs": "Mostrando {a} de {b} trabajos",
    "Showing {a} of {b} job": "Mostrando {a} de {b} trabajo",
    "No jobs match those filters.": "Ning\u00fan trabajo coincide con esos filtros.",
    "Job photos ({n})": "Fotos del trabajo ({n})",
    "{n} of {max}": "{n} de {max}",
    "Show {n} more ({left} remaining)": "Mostrar {n} m\u00e1s (quedan {left})",
    "{n} job booked": "{n} trabajo agendado",
    "{n} jobs booked": "{n} trabajos agendados"
  };

  /** Exact-match lookup for a whole string (alerts, labels, textContent). */
  function dash(text, lang) {
    if ((lang || currentLang()) !== "es") return text;
    var hit = DASH_ES[text];
    return hit == null ? text : hit;
  }

  /** Template lookup with {placeholders}. */
  function dashT(template, vars, lang) {
    var out = (lang || currentLang()) === "es"
      ? (DASH_TPL_ES[template] || template)
      : template;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        out = out.split("{" + k + "}").join(vars[k]);
      });
    }
    return out;
  }

  /**
   * Translate a rendered HTML string. Only text that sits between tags or
   * inside a known copy attribute is touched, and only on an exact full match,
   * so markup, ids, classes and data attributes can never be altered.
   */
  function trHTML(html, lang) {
    if ((lang || currentLang()) !== "es" || !html) return html;
    var out = String(html).replace(/>([^<>]+)</g, function (whole, inner) {
      var trimmed = inner.trim();
      if (!trimmed) return whole;
      var hit = DASH_ES[trimmed];
      if (hit == null) return whole;
      return ">" + inner.replace(trimmed, hit) + "<";
    });
    out = out.replace(/(placeholder|title|aria-label)="([^"]+)"/g, function (whole, attr, val) {
      var hit = DASH_ES[val.trim()];
      return hit == null ? whole : attr + '="' + hit + '"';
    });
    return out;
  }

  function currentLang() {
    var l = (document.documentElement.getAttribute("lang") || "en").slice(0, 2).toLowerCase();
    return l === "es" ? "es" : "en";
  }

  /** T("err.name") or T("rev.bedbath", {bed: 3, bath: 2}) */
  function T(key, vars, lang) {
    var l = lang || currentLang();
    var table = STRINGS[l] || STRINGS.en;
    var out = table[key];
    if (out == null) out = STRINGS.en[key];
    if (out == null) return key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        out = out.split("{" + k + "}").join(vars[k]);
      });
    }
    return out;
  }

  function term(group, key, lang) {
    var l = lang || currentLang();
    var t = (TERMS[l] || TERMS.en)[group];
    return (t && t[key]) || (TERMS.en[group] && TERMS.en[group][key]) || key;
  }

  function locale(lang) { return (lang || currentLang()) === "es" ? "es-US" : "en-US"; }

  window.MCC = window.MCC || {};
  // Leave a breadcrumb for the shared error pages, which have no language of
  // their own and otherwise have to guess from the browser.
  try {
    window.localStorage.setItem("mcc.lang", currentLang() === "es" ? "es" : "en");
  } catch (e) { /* private browsing */ }

  window.MCC.i18n = { T: T, term: term, lang: currentLang, locale: locale, TERMS: TERMS,
    dash: dash, dashT: dashT, trHTML: trHTML };
})(window);
