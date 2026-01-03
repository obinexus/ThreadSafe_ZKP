// [Token State 1] --[Policy Rule]--> [Token // State 2]
type StateMachine struct {
    currentState State
    token *PhenoToken
    mutex Mutex
}

func (sm *StateMachine) Transition(event Event) (newState State, ok) {
    sm.mutex.Lock()
    defer sm.mutex.Unlock()
    
    // Perform state transition based on current state and event
    // Return the new state and true if successful, else false
}