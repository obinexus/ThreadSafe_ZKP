// Banking Account using Event Sourcing with Governance
@blueprint(type="bank_account")
@aggregate_root(type="event_sourced")
actor BankAccount {
    id: AccountID
    balance: Money
    status: AccountStatus
    transaction_history: List<TransactionEvent>
    
    // Events
    @event(type="account")
    struct AccountOpenedEvent {
        account_id: AccountID
        customer_id: CustomerID
        initial_balance: Money
        timestamp: DateTime
    }
    
    @event(type="account")
    struct MoneyDepositedEvent {
        account_id: AccountID
        amount: Money
        transaction_id: TransactionID
        timestamp: DateTime
    }
    
    @event(type="account")
    struct MoneyWithdrawnEvent {
        account_id: AccountID
        amount: Money
        transaction_id: TransactionID
        timestamp: DateTime
    }
    
    @event(type="account")
    struct AccountClosedEvent {
        account_id: AccountID
        reason: string
        timestamp: DateTime
    }
    
    // Commands with governance validation
    @command(type="account")
    struct OpenAccountCommand {
        customer_id: CustomerID
        initial_deposit: Money
        governance_approval: GovernanceToken
    }
    
    @command(type="account")
    struct DepositMoneyCommand {
        account_id: AccountID
        amount: Money
        transaction_id: TransactionID
        governance_approval: GovernanceToken
    }
    
    @command(type="account")
    struct WithdrawMoneyCommand {
        account_id: AccountID
        amount: Money
        transaction_id: TransactionID
        governance_approval: GovernanceToken
    }
    
    // Command handlers with governance checks
    @command_handler(governance_level="high")
    fn handle_open_account(cmd: OpenAccountCommand) 
        -> (List<AccountOpenedEvent>, ok) {
        
        // 1. Validate with governance policies
        governance_valid = self.validate_governance_token(
            cmd.governance_approval,
            "account_opening"
        )
        
        if !governance_valid {
            return ([], false)
        }
        
        // 2. Apply business rules with geometric proofs
        if cmd.initial_deposit < MINIMUM_BALANCE {
            return ([], false)
        }
        
        // 3. Generate event
        event = AccountOpenedEvent {
            account_id: self.generate_account_id(),
            customer_id: cmd.customer_id,
            initial_balance: cmd.initial_deposit,
            timestamp: now()
        }
        
        // 4. Add geometric proof
        event_with_proof = event.with_proof(
            generate_geometric_proof_for_account_opening(event)
        )
        
        return ([event_with_proof], ok)
    }
    
    @command_handler(governance_level="medium")
    fn handle_deposit(cmd: DepositMoneyCommand) 
        -> (List<MoneyDepositedEvent>, ok) {
        
        // Governance check for deposit limits
        daily_deposits = self.calculate_daily_deposits(cmd.account_id)
        if daily_deposits + cmd.amount > MAX_DAILY_DEPOSIT {
            // Trigger HITL for exception
            @hitl_recovery(priority="medium")
            return self.handle_deposit_limit_exception(cmd)
        }
        
        event = MoneyDepositedEvent {
            account_id: cmd.account_id,
            amount: cmd.amount,
            transaction_id: cmd.transaction_id,
            timestamp: now()
        }
        
        // Generate AML (Anti-Money Laundering) proof
        aml_proof = generate_aml_compliance_proof(event, cmd)
        event_with_proof = event.with_proof(aml_proof)
        
        return ([event_with_proof], ok)
    }
    
    // State reconstruction for auditing
    @audit(type="regulatory_compliance")
    fn reconstruct_account_history(
        start_time: DateTime,
        end_time: DateTime
    ) -> (List<Event<any>>, ComplianceReport) {
        // Get all events in timeframe
        all_events = self.event_store.get_events_in_range(
            self.id,
            start_time,
            end_time
        )
        
        // Reconstruct balance at each point
        balance_history = []
        current_balance = Money.zero()
        
        for event in all_events {
            match event {
                AccountOpenedEvent e => 
                    current_balance = e.initial_balance,
                MoneyDepositedEvent e => 
                    current_balance = current_balance + e.amount,
                MoneyWithdrawnEvent e => 
                    current_balance = current_balance - e.amount,
                _ => {}  // Other events
            }
            
            balance_history.append((event.timestamp, current_balance))
        }
        
        // Generate compliance report with geometric proofs
        report = ComplianceReport {
            account_id: self.id,
            period: (start_time, end_time),
            balance_history: balance_history,
            events_count: len(all_events),
            proof: generate_regulatory_compliance_proof(balance_history)
        }
        
        return (all_events, report)
    }
}