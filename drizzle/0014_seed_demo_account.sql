-- App Store review demo account: demo@example.com / demo123
DO $$
DECLARE
  demo_user_id varchar(255) := 'a0000000-0000-4000-8000-000000000001';
  demo_account_id text := 'a0000000-0000-4000-8000-000000000010';
  demo_business_id varchar(255) := 'a0000000-0000-4000-8000-000000000020';
  demo_client_acme varchar(255) := 'a0000000-0000-4000-8000-000000000030';
  demo_client_bright varchar(255) := 'a0000000-0000-4000-8000-000000000031';
  demo_invoice_draft varchar(255) := 'a0000000-0000-4000-8000-000000000040';
  demo_invoice_sent varchar(255) := 'a0000000-0000-4000-8000-000000000041';
  demo_invoice_paid varchar(255) := 'a0000000-0000-4000-8000-000000000042';
  demo_password_hash text := '$2b$12$90U31okgkhOwSQD5RDqHwO0QpcC.pkKsqKb1IPnHfKUZm/2A9hzs6';
BEGIN
  IF EXISTS (SELECT 1 FROM "beenvoice_user" WHERE "email" = 'demo@example.com') THEN
    RETURN;
  END IF;

  INSERT INTO "beenvoice_user" (
    "id", "name", "email", "emailVerified", "password", "role"
  ) VALUES (
    demo_user_id,
    'Demo User',
    'demo@example.com',
    true,
    demo_password_hash,
    'user'
  );

  INSERT INTO "beenvoice_account" (
    "id", "userId", "accountId", "providerId", "password"
  ) VALUES (
    demo_account_id,
    demo_user_id,
    demo_user_id,
    'credential',
    demo_password_hash
  );

  INSERT INTO "beenvoice_business" (
    "id", "name", "nickname", "email", "phone", "addressLine1", "city", "state",
    "postalCode", "country", "isDefault", "createdById"
  ) VALUES (
    demo_business_id,
    'Demo Studio LLC',
    'Demo Studio',
    'hello@demostudio.example',
    '(555) 010-2000',
    '100 Market Street',
    'San Francisco',
    'CA',
    '94105',
    'United States',
    true,
    demo_user_id
  );

  INSERT INTO "beenvoice_client" (
    "id", "name", "email", "phone", "defaultHourlyRate", "currency", "createdById"
  ) VALUES
    (
      demo_client_acme,
      'Acme Corporation',
      'billing@acme.example',
      '(555) 010-3001',
      150,
      'USD',
      demo_user_id
    ),
    (
      demo_client_bright,
      'Bright Labs',
      'ap@brightlabs.example',
      '(555) 010-3002',
      125,
      'USD',
      demo_user_id
    );

  INSERT INTO "beenvoice_invoice" (
    "id", "invoiceNumber", "invoicePrefix", "businessId", "clientId",
    "issueDate", "dueDate", "status", "totalAmount", "taxRate", "notes", "currency", "createdById"
  ) VALUES
    (
      demo_invoice_draft,
      'INV-DEMO-001',
      '#',
      demo_business_id,
      demo_client_acme,
      NOW() - INTERVAL '5 days',
      NOW() + INTERVAL '25 days',
      'draft',
      1500,
      0,
      'Website redesign — phase 1',
      'USD',
      demo_user_id
    ),
    (
      demo_invoice_sent,
      'INV-DEMO-002',
      '#',
      demo_business_id,
      demo_client_bright,
      NOW() - INTERVAL '20 days',
      NOW() - INTERVAL '5 days',
      'sent',
      2500,
      0,
      'Mobile app consulting',
      'USD',
      demo_user_id
    ),
    (
      demo_invoice_paid,
      'INV-DEMO-003',
      '#',
      demo_business_id,
      demo_client_acme,
      NOW() - INTERVAL '45 days',
      NOW() - INTERVAL '15 days',
      'paid',
      3200,
      0,
      'API integration project',
      'USD',
      demo_user_id
    );

  INSERT INTO "beenvoice_invoice_item" (
    "id", "invoiceId", "date", "description", "hours", "rate", "amount", "position"
  ) VALUES
    (
      'a0000000-0000-4000-8000-000000000050',
      demo_invoice_draft,
      NOW() - INTERVAL '5 days',
      'UX wireframes and design system',
      10,
      150,
      1500,
      0
    ),
    (
      'a0000000-0000-4000-8000-000000000051',
      demo_invoice_sent,
      NOW() - INTERVAL '20 days',
      'Sprint planning and implementation',
      20,
      125,
      2500,
      0
    ),
    (
      'a0000000-0000-4000-8000-000000000052',
      demo_invoice_paid,
      NOW() - INTERVAL '45 days',
      'Backend API work',
      16,
      150,
      2400,
      0
    ),
    (
      'a0000000-0000-4000-8000-000000000053',
      demo_invoice_paid,
      NOW() - INTERVAL '44 days',
      'Deployment and documentation',
      5.33,
      150,
      800,
      1
    );
END $$;
