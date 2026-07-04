import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;
    const ANON = 'Deleted User';
    const admin = base44.asServiceRole.entities;

    // Find driver profile if the user is also a driver
    const driverProfiles = await admin.DriverProfile.filter({ email: userEmail });
    const driverProfileId = driverProfiles[0]?.id || userId;

    // === DELETE entirely (pure personal / non-financial data) ===
    const deletions = [
      admin.SavedAddress.deleteMany({ user_email: userEmail }),
      admin.RecurringDelivery.deleteMany({ customer_email: userEmail }),
      admin.LoyaltyAccount.deleteMany({ user_email: userEmail }),
      admin.Referral.deleteMany({ $or: [{ referrer_email: userEmail }, { referred_email: userEmail }] }),
      admin.Message.deleteMany({ sender_id: userId }),
      admin.LocationPing.deleteMany({ driver_profile_id: driverProfileId }),
      admin.MoveItem.deleteMany({ created_by_id: userId }),
      admin.RescheduleRequest.deleteMany({ requested_by_id: userId }),
      admin.DriverAvailability.deleteMany({ driver_profile_id: driverProfileId }),
      admin.ExpenseReceipt.deleteMany({ $or: [{ created_by_id: userId }, { driver_profile_id: driverProfileId }] }),
      admin.RouteLog.deleteMany({ driver_profile_id: driverProfileId }),
      admin.Rating.deleteMany({ rater_id: userId }),
      admin.RentalRequest.deleteMany({ renter_email: userEmail }),
    ];

    // === ANONYMIZE PII (preserve financial / legal records) ===
    const anonymizations = [
      // MoveRequest as customer — strip PII, keep pricing/payment fields
      admin.MoveRequest.updateMany(
        { $or: [{ customer_email: userEmail }, { created_by_id: userId }] },
        { $set: { customer_name: ANON, customer_email: null, customer_phone: null, pickup_address: 'Deleted', dropoff_address: 'Deleted', notes: null, multi_stop_addresses: null, intermediate_stops: null, referral_code: null, promo_code: null, onsite_photo_url: null, media_urls: null, access_media_urls: null, items_pdf_url: null } }
      ),
      // MoveRequest as driver — anonymize driver reference
      admin.MoveRequest.updateMany(
        { assigned_driver_id: driverProfileId },
        { $set: { assigned_driver_name: 'Deleted Driver' } }
      ),
      // DriverProfile — strip PII, license, banking, documents
      admin.DriverProfile.updateMany(
        { email: userEmail },
        { $set: { full_name: ANON, email: null, phone: null, license_number: 'Deleted', license_doc_url: null, insurance_doc_url: null, profile_photo_url: null, service_area: null, bank_name: null, bank_routing_number: null, bank_account_last4: null, stripe_account_id: null, referral_code: null, referred_by_code: null, status: 'suspended', available: false } }
      ),
      // BusinessAccount — strip PII
      admin.BusinessAccount.updateMany(
        { $or: [{ account_owner_email: userEmail }, { business_email: userEmail }] },
        { $set: { business_name: ANON, business_email: null, business_phone: null, contact_name: ANON, address: null, tax_id: null, account_owner_email: null, status: 'suspended' } }
      ),
      // Contract — strip PII but keep contract record
      admin.Contract.updateMany(
        { $or: [{ created_by_id: userId }, { party_email: userEmail }, { driver_profile_id: driverProfileId }] },
        { $set: { party_name: ANON, party_email: null, party_phone: null, signature_name: ANON, ip_address: null } }
      ),
      // DamageReport — strip PII
      admin.DamageReport.updateMany(
        { $or: [{ created_by_id: userId }, { customer_email: userEmail }, { driver_profile_id: driverProfileId }] },
        { $set: { customer_name: ANON, customer_email: null, driver_name: ANON, driver_statement: null, driver_evidence_photo_url: null, evidence_photo_url: null } }
      ),
      // Rating as ratee — anonymize name
      admin.Rating.updateMany(
        { ratee_id: userId },
        { $set: { ratee_name: ANON } }
      ),
      // Truck — strip references and docs
      admin.Truck.updateMany(
        { driver_profile_id: driverProfileId },
        { $set: { driver_profile_id: null, company_name: ANON, license_plate: 'Deleted', registration_doc_url: null, insurance_doc_url: null, inspection_doc_url: null, photo_url: null, exterior_photo_url: null, interior_photo_url: null } }
      ),
      // VehicleRental — strip PII
      admin.VehicleRental.updateMany(
        { owner_email: userEmail },
        { $set: { owner_name: ANON, owner_email: null, owner_phone: null, photo_urls: null, registration_doc_url: null, insurance_doc_url: null, status: 'inactive', available: false } }
      ),
      // RentalRequest as owner — strip owner email
      admin.RentalRequest.updateMany(
        { owner_email: userEmail },
        { $set: { owner_email: null } }
      ),
      // DriverPayout — note deletion (keep amount for accounting)
      admin.DriverPayout.updateMany(
        { driver_profile_id: driverProfileId },
        { $set: { notes: 'Driver account deleted' } }
      ),
    ];

    // Run all operations in parallel
    await Promise.all([...deletions, ...anonymizations]);

    console.log(`Account deletion completed for user ${userId} (${userEmail})`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});