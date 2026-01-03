// Decision framework for Event Sourcing with Governance
@decision_framework(type="pattern_selection")
actor PatternSelectionFramework {
    // Evaluate if Event Sourcing with Governance is appropriate
    @evaluation(requires_analysis=true)
    fn evaluate_for_use_case(requirements: Requirements) 
        -> (SuitabilityScore, Recommendation) {
        
        score = 0
        factors = []
        
        // Check for audit trail requirements
        if requirements.audit_trail_required {
            score += 30
            factors.append("Strong audit trail requirement")
        }
        
        // Check for complex business logic
        if requirements.business_logic_complexity >= HIGH {
            score += 25
            factors.append("Complex business logic")
        }
        
        // Check for regulatory compliance needs
        if requirements.regulatory_compliance_required {
            score += 20
            factors.append("Regulatory compliance needed")
        }
        
        // Check for governance requirements
        if requirements.governance_required {
            score += 15
            factors.append("Governance enforcement needed")
        }
        
        // Check for temporal query needs
        if requirements.temporal_queries_required {
            score += 10
            factors.append("Point-in-time queries needed")
        }
        
        // Generate recommendation
        recommendation = if score >= 70 {
            Recommendation {
                pattern: "Event Sourcing with Rift Governance",
                confidence: score / 100,
                justification: factors,
                implementation_guide: generate_implementation_guide(requirements)
            }
        } else if score >= 40 {
            Recommendation {
                pattern: "Event Sourcing (Basic)",
                confidence: score / 100,
                justification: factors,
                implementation_guide: generate_basic_implementation_guide(requirements)
            }
        } else {
            Recommendation {
                pattern: "Traditional CRUD",
                confidence: (100 - score) / 100,
                justification: ["Simpler requirements"],
                implementation_guide: generate_crud_guide(requirements)
            }
        }
        
        return (score, recommendation)
    }
}