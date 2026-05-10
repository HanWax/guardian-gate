ALTER TABLE conversation_state
  ADD CONSTRAINT conversation_state_parent_id_key UNIQUE (parent_id);
