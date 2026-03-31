-- RLS foundation for AtlasSeguros CRM
-- Session variables expected per DB connection:
--   app.current_user_id   (text)
--   app.current_user_role (text: ADMIN | OPERATIONS | AGENT)

-- ---------------------------------------------------------------------------
-- Helper predicates via current_setting(..., true)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.current_user_role', true), '')
$$;

CREATE OR REPLACE FUNCTION app_is_admin_or_operations()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app_current_user_role() IN ('ADMIN', 'OPERATIONS')
$$;

-- ---------------------------------------------------------------------------
-- Lead
-- ---------------------------------------------------------------------------
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" FORCE ROW LEVEL SECURITY;

CREATE POLICY lead_admin_ops_all ON "Lead"
  FOR ALL
  USING (app_is_admin_or_operations())
  WITH CHECK (app_is_admin_or_operations());

CREATE POLICY lead_agent_own ON "Lead"
  FOR ALL
  USING ("agentId" = app_current_user_id())
  WITH CHECK ("agentId" = app_current_user_id());

-- ---------------------------------------------------------------------------
-- Client
-- ---------------------------------------------------------------------------
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;

CREATE POLICY client_admin_ops_all ON "Client"
  FOR ALL
  USING (app_is_admin_or_operations())
  WITH CHECK (app_is_admin_or_operations());

CREATE POLICY client_agent_own ON "Client"
  FOR ALL
  USING ("agentId" = app_current_user_id())
  WITH CHECK ("agentId" = app_current_user_id());

-- ---------------------------------------------------------------------------
-- Offer
-- ---------------------------------------------------------------------------
ALTER TABLE "Offer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Offer" FORCE ROW LEVEL SECURITY;

CREATE POLICY offer_admin_ops_all ON "Offer"
  FOR ALL
  USING (app_is_admin_or_operations())
  WITH CHECK (app_is_admin_or_operations());

CREATE POLICY offer_agent_own ON "Offer"
  FOR ALL
  USING ("agentId" = app_current_user_id())
  WITH CHECK ("agentId" = app_current_user_id());

-- ---------------------------------------------------------------------------
-- Contract
-- ---------------------------------------------------------------------------
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" FORCE ROW LEVEL SECURITY;

CREATE POLICY contract_admin_ops_all ON "Contract"
  FOR ALL
  USING (app_is_admin_or_operations())
  WITH CHECK (app_is_admin_or_operations());

CREATE POLICY contract_agent_own ON "Contract"
  FOR ALL
  USING ("agentId" = app_current_user_id())
  WITH CHECK ("agentId" = app_current_user_id());

-- ---------------------------------------------------------------------------
-- ServiceRequest
-- ---------------------------------------------------------------------------
ALTER TABLE "ServiceRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceRequest" FORCE ROW LEVEL SECURITY;

CREATE POLICY service_request_admin_ops_all ON "ServiceRequest"
  FOR ALL
  USING (app_is_admin_or_operations())
  WITH CHECK (app_is_admin_or_operations());

CREATE POLICY service_request_agent_own ON "ServiceRequest"
  FOR ALL
  USING ("agentId" = app_current_user_id())
  WITH CHECK ("agentId" = app_current_user_id());

-- ---------------------------------------------------------------------------
-- SignatureDocument
-- ---------------------------------------------------------------------------
ALTER TABLE "SignatureDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SignatureDocument" FORCE ROW LEVEL SECURITY;

CREATE POLICY signature_doc_admin_ops_all ON "SignatureDocument"
  FOR ALL
  USING (app_is_admin_or_operations())
  WITH CHECK (app_is_admin_or_operations());

CREATE POLICY signature_doc_agent_own ON "SignatureDocument"
  FOR ALL
  USING ("agentId" = app_current_user_id())
  WITH CHECK ("agentId" = app_current_user_id());

-- ---------------------------------------------------------------------------
-- CommissionRecord
-- ---------------------------------------------------------------------------
ALTER TABLE "CommissionRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommissionRecord" FORCE ROW LEVEL SECURITY;

CREATE POLICY commission_admin_ops_all ON "CommissionRecord"
  FOR ALL
  USING (app_is_admin_or_operations())
  WITH CHECK (app_is_admin_or_operations());

CREATE POLICY commission_agent_own ON "CommissionRecord"
  FOR ALL
  USING ("agentId" = app_current_user_id())
  WITH CHECK ("agentId" = app_current_user_id());

