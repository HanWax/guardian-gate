-- Conversation state: tracks WhatsApp conversation flow per parent

CREATE TABLE conversation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  current_child_index INTEGER DEFAULT 0,
  state TEXT,
  verification_attempts INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversation_state_parent_id ON conversation_state(parent_id);
