// Event Store with Rift Governance and Thread Safety
@blueprint(type="governed_event_store")
@geometric_proof(integrity="verified")
actor GovernedEventStore {
    // Main storage with governance policies
    event_streams: Map<AggregateID, List<Event<any>>> = Map.new()
    projections: Map<ProjectionID, ProjectionState> = Map.new()
    governance_policies: Set<GovernancePolicy> = Set.new()
    
    // Thread-safe storage operations
    @thread_safe(isolation="serializable")
    @governance(policy_type="append_only")
    fn append_events(
        aggregate_id: AggregateID,
        events: List<Event<any>>
    ) -> (_, ok) {
        // 1. OBSERVE: Check governance policies
        governance_check = self.observe_governance_policies(
            aggregate_id, 
            events
        )
        
        if !governance_check.allowed {
            // Trigger HITL for governance violation
            @hitl_recovery(priority="high")
            return self.handle_governance_violation(governance_check)
        }
        
        // 2. VERIFY: Validate events with geometric proofs
        for event in events {
            proof_valid = verify_geometric_proof(event.proof)
            if !proof_valid {
                return (nil, false)
            }
        }
        
        // 3. GOVERN: Apply with thread safety
        pthread_mutex_lock(&self.store_mutex)
        
        // Append to event stream (immutable)
        current_stream = self.event_streams.get_or_default(aggregate_id, [])
        new_stream = current_stream + events
        self.event_streams[aggregate_id] = new_stream
        
        // Update projections (asynchronous, eventual consistency)
        self.update_projections_async(events)
        
        pthread_mutex_unlock(&self.store_mutex)
        
        // 4. EVOLVE: Update governance policies based on new events
        self.evolve_governance_policies(events)
        
        return (nil, ok)
    }
    
    // State reconstruction with governance logging
    @query(type="state_reconstruction")
    fn get_state_at_time(
        aggregate_id: AggregateID,
        timestamp: DateTime
    ) -> (State, List<Event<any>>) {
        // Get all events up to timestamp
        all_events = self.event_streams.get_or_default(aggregate_id, [])
        relevant_events = all_events.filter(e => e.timestamp <= timestamp)
        
        // Replay events to reconstruct state
        aggregate = self.load_aggregate(aggregate_id)
        state, _ = aggregate.replay_events(relevant_events)
        
        // Log governance access
        self.log_governance_access(
            operation: "state_reconstruction",
            aggregate_id: aggregate_id,
            timestamp: timestamp
        )
        
        return (state, relevant_events)
    }
    
    // Point-in-time query with governance validation
    @query(type="point_in_time")
    fn query_pit_state(
        aggregate_id: AggregateID,
        time: DateTime,
        query: Query
    ) -> (QueryResult, ok) {
        // Reconstruct state at point in time
        state, events = self.get_state_at_time(aggregate_id, time)
        
        // Apply query to reconstructed state
        result = query.apply_to(state)
        
        // Verify with governance policies
        governance_ok = self.verify_governance_for_query(
            aggregate_id,
            time,
            query,
            result
        )
        
        if !governance_ok {
            return (nil, false)
        }
        
        return (result, ok)
    }
}