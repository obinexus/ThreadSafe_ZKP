// Core Event Sourcing Types
@blueprint(type="event_sourcing_foundation")
module EventSourcing {
    // Event type with geometric proof
    @immutable(type="append_only")
    struct Event<E> {
        id: EventID
        type: string
        aggregate_id: AggregateID
        payload: E
        timestamp: DateTime
        version: Version
        proof: GeometricProof
        metadata: Map[string, any]
        
        // Thread-safe serialization
        @thread_safe(isolation="serializable")
        fn serialize() -> (bytes, ok) {
            return encode_with_proof(self)
        }
    }
    
    // Command with validation
    struct Command<C> {
        id: CommandID
        type: string
        aggregate_id: AggregateID
        payload: C
        timestamp: DateTime
        expected_version: Version
        validation_proof: ValidationProof
        
        @validation(requires_geometric_proof=true)
        fn validate(current_state: State) -> (bool, ValidationResult) {
            // Validate with geometric constraints
            return validate_with_constraints(self, current_state)
        }
    }
    
    // Aggregate root
    @aggregate_root(type="event_sourced")
    actor Aggregate<A, E, C> {
        id: AggregateID
        current_state: A
        version: Version
        pending_events: List[Event<E>]
        
        // Command processing
        @command_handler(requires_lock=true)
        fn handle_command(cmd: Command<C>) -> (List[Event<E>>, ok) {
            // Validate command against current state
            valid, result := cmd.validate(self.current_state)
            if !valid {
                return ([], false)
            }
            
            // Apply business logic (deterministic)
            events = self.apply_business_logic(cmd)
            
            // Generate geometric proofs for events
            events_with_proofs = events.map(e => 
                e.with_proof(generate_geometric_proof(e))
            )
            
            self.pending_events.append_all(events_with_proofs)
            return (events_with_proofs, ok)
        }
        
        // Event application
        @event_handler(requires_replay=false)
        fn apply_event(event: Event<E>) -> (_, ok) {
            // Apply event to state (must be deterministic)
            new_state = self.apply_state_transition(self.current_state, event)
            self.current_state = new_state
            self.version = event.version
            
            return (nil, ok)
        }
        
        // State reconstruction by replaying events
        @replay(type="deterministic")
        fn replay_events(events: List[Event<E>>) -> (A, ok) {
            // Start from initial state
            state = self.initial_state()
            
            // Apply events in order (must be deterministic)
            for event in events {
                state = self.apply_state_transition(state, event)
            }
            
            return (state, ok)
        }
    }
}