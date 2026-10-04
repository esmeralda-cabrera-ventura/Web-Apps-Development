/**
 * One mapping between the dashboard's job record and the Cosmos document.
 *
 * The document keeps two things side by side:
 *   - structured fields (status, confirmedSlot, email, lang ...) that the
 *     server-side timers query and read, and
 *   - `record`, the dashboard's own copy of the job exactly as it was saved,
 *     so every device gets back precisely what another device wrote.
 *
 * Photo bytes never go into Cosmos. Only blob paths are stored; readable
 * signed URLs are added on the way out.
 */
const photos = require("./photos");

const composeAddress = (a) =>
  a ? [a.street + (a.unit ? `, ${a.unit}` : ""), a.city, `${a.state || "CA"} ${a.zip}`]
        .filter(Boolean).join(", ")
    : "";

/** Keep blob-backed photos as paths only; drop any inline image data. */
function photoRefs(list) {
  return (list || [])
    .map((p) => ({ id: p.id || p.blob, blob: p.blob || null, addedAt: p.addedAt || null }))
    .filter((p) => p.blob);
}

/** The dashboard record without inline image data, safe to store. */
function cleanRecord(body, id) {
  const rec = { ...body, id };
  rec.photos = photoRefs(body.photos);
  delete rec._local;
  return rec;
}

/** Dashboard record -> Cosmos document. */
function toDoc(body, id) {
  const structured = body.address && typeof body.address === "object";
  return {
    id,
    type: "job",
    status: body.status || "new",
    kind: body.kind || "residential",
    lang: body.lang || "en",
    name: body.name,
    company: body.company || null,
    email: body.email || null,
    phone: body.phone || null,
    address: structured ? body.address : {
      street: body.street || null,
      unit: body.unit || null,
      city: body.addressCity || body.city || null,
      state: body.addressState || "CA",
      zip: body.addressZip || body.zip || null
    },
    addressText: typeof body.address === "string" ? body.address : null,
    bedrooms: body.bedrooms || null,
    bathrooms: body.bathrooms || null,
    frequency: body.frequency || null,
    addons: body.addons || [],
    facility: body.facility || null,
    sqft: body.sqft || null,
    nights: body.nights || null,
    scope: body.scope || null,
    slot1: body.slot1 || null,
    slot2: body.slot2 || null,
    confirmedSlot: body.confirmedSlot || null,
    estimateCents: body.estimate ? Math.round(body.estimate * 100) : null,
    accessNotes: body.access || null,
    ownerNotes: body.ownerNotes || null,
    photos: photoRefs(body.photos),
    photoConsent: body.photoConsent !== false,
    smsConsent: body.smsConsent === true,
    smsConsentAt: body.smsConsentAt || (body.smsConsent === true ? (body.createdAt || null) : null),
    enRouteAt: body.enRouteAt || null,
    remindedAt: body.remindedAt || null,
    completedAt: body.completedAt || null,
    reopenedAt: body.reopenedAt || null,
    createdAt: body.createdAt || null,
    source: body.source || null,
    record: cleanRecord(body, id)
  };
}

/** Signed, readable URLs for a job's photos. */
async function signedPhotos(list) {
  const out = [];
  for (const p of list || []) {
    if (!p.blob) continue;
    let url = null;
    try { url = await photos.readUrl(p.blob); } catch { url = null; }
    out.push({ id: p.id || p.blob, blob: p.blob, addedAt: p.addedAt || null, dataUrl: url });
  }
  return out;
}

/**
 * Cosmos document -> the dashboard's record shape.
 * Documents written by the dashboard carry `record`; older ones are rebuilt
 * from the structured fields.
 */
async function toRecord(doc) {
  const shots = await signedPhotos(doc.photos);
  if (doc.record) {
    return { ...doc.record, id: doc.id, photos: shots, _cloudUpdatedAt: doc.updatedAt || null };
  }
  return {
    id: doc.id,
    status: doc.status,
    kind: doc.kind,
    lang: doc.lang,
    name: doc.name,
    company: doc.company,
    email: doc.email,
    phone: doc.phone,
    street: doc.address && doc.address.street,
    unit: doc.address && doc.address.unit,
    addressCity: doc.address && doc.address.city,
    addressState: (doc.address && doc.address.state) || "CA",
    addressZip: doc.address && doc.address.zip,
    address: doc.addressText || composeAddress(doc.address),
    city: (doc.address && doc.address.city) || doc.city,
    zip: (doc.address && doc.address.zip) || doc.zip,
    bedrooms: doc.bedrooms,
    bathrooms: doc.bathrooms,
    frequency: doc.frequency,
    addons: doc.addons || [],
    facility: doc.facility,
    sqft: doc.sqft,
    nights: doc.nights,
    scope: doc.scope,
    slot1: doc.slot1,
    slot2: doc.slot2,
    confirmedSlot: doc.confirmedSlot,
    estimate: doc.estimateCents ? doc.estimateCents / 100 : null,
    access: doc.accessNotes,
    ownerNotes: doc.ownerNotes,
    photoConsent: doc.photoConsent,
    smsConsent: doc.smsConsent,
    photos: shots,
    completedAt: doc.completedAt,
    reopenedAt: doc.reopenedAt,
    enRouteAt: doc.enRouteAt,
    remindedAt: doc.remindedAt,
    createdAt: doc.createdAt,
    _cloudUpdatedAt: doc.updatedAt || null
  };
}

module.exports = { toDoc, toRecord, composeAddress };
