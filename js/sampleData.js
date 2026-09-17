// js/sampleData.js — Realistic legal contracts and pre-computed analysis for Judgeman

export const SAMPLES = {
  lease: {
    name: "Residential Lease Agreement",
    type: "Real Estate",
    jurisdiction: "California, USA",
    wordCount: 4218,
    readingTime: "17 min",
    gradeLevel: "Grade 16 (College)",
    contractType: "Lease Agreement",
    fullText: `RESIDENTIAL LEASE AGREEMENT

This Residential Lease Agreement ("Agreement") is entered into as of January 1, 2025, between PRISM PROPERTIES LLC ("Landlord") and the undersigned tenant(s) ("Tenant").

1. PREMISES. Landlord hereby leases to Tenant the property located at 2847 Maplewood Drive, San Jose, CA 95128 ("Premises"), consisting of a 2-bedroom, 1-bathroom apartment unit.

2. TERM. The tenancy shall commence on January 1, 2025 and shall terminate on December 31, 2025 ("Initial Term"). Thereafter, this Agreement shall automatically renew on a month-to-month basis unless either party provides thirty (30) days' written notice of termination.

3. RENT. Tenant shall pay Landlord the sum of $2,800.00 per month ("Rent"), due and payable on the first (1st) day of each month. A late fee of $150.00 shall be assessed for any payment received after the fifth (5th) day of the month. Landlord reserves the right to increase rent upon sixty (60) days' notice.

4. SECURITY DEPOSIT. Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of $5,600.00 as a security deposit. Landlord may deduct from the security deposit amounts to cover unpaid rent, damages beyond normal wear and tear, cleaning costs, and any breach of this Agreement. Landlord shall return the security deposit within twenty-one (21) days of Tenant vacating the Premises.

5. UTILITIES. Tenant shall be responsible for payment of all utilities including electricity, gas, internet, and cable. Landlord shall be responsible for water, sewer, and trash removal.

6. MAINTENANCE. Tenant shall maintain the Premises in a clean and sanitary condition and shall not make any alterations, additions, or improvements to the Premises without Landlord's prior written consent. Tenant shall promptly notify Landlord of any damage or needed repairs.

7. NO SUBLETTING. Tenant shall not sublet the Premises or any portion thereof, nor assign this Agreement without the prior written consent of Landlord, which may be withheld at Landlord's sole discretion.

8. ENTRY BY LANDLORD. Landlord shall have the right to enter the Premises at reasonable times and upon 24-hour written notice for the purpose of inspection, repair, or showing to prospective tenants or buyers. In cases of emergency, no prior notice is required.

9. TERMINATION. In the event of Tenant's material breach of this Agreement, including but not limited to failure to pay rent, Landlord may terminate this Agreement upon three (3) days' written notice. Upon termination, Tenant shall vacate the Premises immediately. Tenant shall be liable for all remaining rent through the end of the lease term plus attorney's fees and costs.

10. INDEMNIFICATION. Tenant agrees to indemnify, defend, and hold harmless Landlord from any and all claims, damages, losses, costs, and expenses (including attorney's fees) arising out of or resulting from Tenant's use or occupancy of the Premises.

11. GOVERNING LAW. This Agreement shall be governed by the laws of the State of California. Any disputes shall be resolved exclusively through binding arbitration in Santa Clara County, California.

12. ENTIRE AGREEMENT. This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, and agreements.`,

    clauses: [
      {
        id: "c1",
        original: "Tenant shall be liable for all remaining rent through the end of the lease term plus attorney's fees and costs.",
        plain: "If you're kicked out for breaking the lease, you still owe ALL remaining monthly rent for the rest of the year — even if you've moved out — plus the landlord's lawyer bills.",
        trap: "This could mean owing thousands in rent you never paid, AND paying for their lawyers.",
        type: "high"
      },
      {
        id: "c2",
        original: "Landlord reserves the right to increase rent upon sixty (60) days' notice.",
        plain: "Your landlord can raise your rent mid-lease or at renewal with just 2 months' warning. There is no cap on how much they can raise it.",
        trap: "California requires just cause for rent hikes in rent-controlled cities — verify if your city has this protection.",
        type: "med"
      },
      {
        id: "c3",
        original: "Tenant agrees to indemnify, defend, and hold harmless Landlord from any and all claims, damages, losses, costs, and expenses (including attorney's fees) arising out of or resulting from Tenant's use or occupancy of the Premises.",
        plain: "You agree to personally pay for any lawsuit or claim against the landlord that involves your use of the property — even if the landlord was partially at fault.",
        trap: "This is extremely broad. A visitor's slip-and-fall could become your financial liability.",
        type: "high"
      }
    ],

    risks: [
      { level: "high",   title: "Uncapped Indemnification Clause",       desc: "Section 10 requires Tenant to cover all losses from Premises use including attorney fees with no liability ceiling.", category: "Liability" },
      { level: "high",   title: "Rent Accrual After Eviction",           desc: "Section 9 holds Tenant liable for all remaining lease rent even after eviction — a double penalty.",                category: "Termination" },
      { level: "medium", title: "Unilateral Rent Increase Right",        desc: "Section 3 allows Landlord to raise rent at any time with 60 days' notice, no cap stated.",                      category: "Payment" },
      { level: "medium", title: "Binding Arbitration Only (No Court)",   desc: "Section 11 strips your right to a jury trial, requiring private arbitration in Santa Clara County.",               category: "Dispute" },
      { level: "medium", title: "Auto-Renewal Without Active Notice",    desc: "Section 2 auto-converts to month-to-month without requiring affirmative renewal — easy to miss.",                 category: "Term" },
      { level: "low",    title: "Standard Security Deposit (2 months)",  desc: "Section 4 sets deposit at 2× rent which is California maximum — this is standard and legal.",                    category: "Payment" },
      { level: "low",    title: "24-Hour Entry Notice Provided",         desc: "Section 8 requires 24-hour notice before landlord entry, meeting California minimum.",                            category: "Privacy" },
    ],

    prepKit: {
      summary: "This is a 12-month residential lease in San Jose, CA with an automatic month-to-month renewal. Key concerns include an uncapped indemnification clause (Section 10), post-eviction rent liability (Section 9), unlimited rent increase rights (Section 3), and mandatory arbitration (Section 11). The security deposit is 2× monthly rent and California state law governs.",
      redFlags: [
        "Section 10 indemnification has no liability cap — you could be personally on the hook for unlimited amounts.",
        "Section 9 allows landlord to evict AND still collect all remaining rent from you.",
        "Section 3 gives landlord power to raise rent any amount mid-year with 60 days notice.",
        "Section 11 forces binding arbitration — you waive your right to sue in court.",
        "Section 7 gives landlord sole discretion to deny subletting with no stated criteria.",
      ],
      questions: [
        "Is this property subject to San Jose's Tenant Protection Ordinance or rent control?",
        "Can we negotiate a liability cap on the indemnification clause in Section 10?",
        "Will you agree to remove or limit the post-eviction rent liability in Section 9?",
        "Is there a cap on how much rent can be increased annually under Section 3?",
        "Can we add a mutual termination clause allowing Tenant to break lease with 60-day notice and 1-month penalty?",
      ]
    }
  },

  nda: {
    name: "Freelance Master Services Agreement",
    type: "Commercial Contract",
    jurisdiction: "New York, USA",
    wordCount: 3140,
    readingTime: "12 min",
    gradeLevel: "Grade 17 (Postgraduate)",
    contractType: "MSA / Freelance",

    clauses: [
      {
        id: "n1",
        original: "All Work Product, inventions, developments, discoveries, improvements, and works of authorship created, conceived, or reduced to practice by Contractor in connection with Services, whether or not during working hours, are hereby assigned irrevocably to Client.",
        plain: "Anything you create for this client — including stuff you work on in your own time at home — belongs to them forever. Not just deliverables; your creative process, notes, and drafts too.",
        trap: "The phrase 'whether or not during working hours' is dangerous. They may claim ownership of related personal projects.",
        type: "high"
      },
      {
        id: "n2",
        original: "Client may terminate this Agreement for any reason upon fourteen (14) days' written notice. Contractor may terminate only upon sixty (60) days' written notice.",
        plain: "The client can fire you with just 2 weeks' notice. But if you want to quit, you must give them a full 2 months' notice. This is heavily one-sided.",
        trap: "You're locked in for 60 days if you decide to leave, but they can walk in 14 days.",
        type: "high"
      }
    ],

    risks: [
      { level: "high",   title: "Overbroad IP Assignment (All Hours)",          desc: "IP assignment clause covers work done outside working hours, potentially claiming ownership of related personal projects.", category: "IP Ownership" },
      { level: "high",   title: "Asymmetric Termination Notice Periods",        desc: "Client can terminate in 14 days; Contractor requires 60 days. Critically unbalanced.",                                    category: "Termination" },
      { level: "medium", title: "Perpetual Non-Disclosure Period",              desc: "NDA has no expiration — you can never discuss this work publicly, even after the engagement ends.",                         category: "Liability" },
      { level: "medium", title: "Non-Compete Within 25-Mile Radius, 12 Months",desc: "After contract ends, you cannot work for competitors within 25 miles for 1 year.",                                         category: "Non-Compete" },
      { level: "low",    title: "Net-30 Payment Terms",                         desc: "Invoices paid 30 days after approval — standard commercial practice.",                                                      category: "Payment" },
      { level: "low",    title: "Governing Law: New York",                      desc: "New York law governs — well-established commercial jurisdiction, standard for freelance MSAs.",                            category: "Dispute" },
    ],

    prepKit: {
      summary: "This is a Freelance MSA governed by New York law. Major concerns: sweeping IP assignment covering off-hours work (Section 4), heavily asymmetric termination provisions (Section 7: client gets 14 days, you get 60), a perpetual NDA with no sunset clause, and a 12-month non-compete within 25 miles. Payment is Net-30 standard.",
      redFlags: [
        "IP Assignment clause captures work done 'whether or not during working hours' — needs to be narrowed to project deliverables only.",
        "Termination notice is 14 days for client vs. 60 days for contractor — demand parity at 30 days each.",
        "NDA has no expiration date — negotiate a 3–5 year sunset clause.",
        "Non-compete (25 miles, 12 months) may violate your right to work — ask attorney if enforceable in your state.",
        "No kill fee or partial payment protection if client terminates early.",
      ],
      questions: [
        "Can we limit IP assignment to only final deliverables submitted and approved during the contract?",
        "Will you agree to equal termination notice periods (e.g., 30 days for both parties)?",
        "Can we add an NDA expiration of 3 years post-contract?",
        "Is the non-compete clause enforceable in my state given its breadth?",
        "Can we add a kill fee provision (e.g., 50% of remaining contract value) if client terminates early?",
      ]
    }
  },

  employment: {
    name: "Technology Employment Offer Letter",
    type: "Employment",
    jurisdiction: "Texas, USA",
    wordCount: 2876,
    readingTime: "11 min",
    gradeLevel: "Grade 15 (College)",
    contractType: "Employment Offer",

    clauses: [
      {
        id: "e1",
        original: "Employee's employment with the Company is at-will, meaning that either party may terminate the employment relationship at any time, with or without cause, and with or without prior notice.",
        plain: "You can be fired at any moment, for any reason, or no reason at all, with zero notice. Similarly, you can quit anytime.",
        trap: "At-will is standard in Texas but means zero job security. You may want to negotiate a severance provision.",
        type: "med"
      }
    ],

    risks: [
      { level: "high",   title: "Broad Non-Solicitation (Clients + Employees)", desc: "Cannot contact clients or recruit employees for 24 months post-employment — extremely long restriction.", category: "Non-Compete" },
      { level: "medium", title: "At-Will Employment — No Severance Defined",    desc: "No severance guaranteed on termination. At-will means zero notice required from company.",                   category: "Termination" },
      { level: "medium", title: "Mandatory Arbitration for Disputes",           desc: "All employment disputes, including discrimination claims, go to private arbitration.",                          category: "Dispute" },
      { level: "low",    title: "Standard Confidentiality Agreement",           desc: "3-year NDA on proprietary information — reasonable and standard for tech roles.",                               category: "Liability" },
      { level: "low",    title: "Equity Vesting: 4-Year, 1-Year Cliff",        desc: "Standard Silicon Valley equity vesting schedule — 25% vests at 1-year mark, then monthly.",                   category: "Payment" },
    ],

    prepKit: {
      summary: "This is a Texas at-will employment offer for a tech role. Key concerns include a 24-month non-solicitation clause (both clients and employees), no defined severance, and mandatory arbitration waiving your right to sue for discrimination in court. Equity vesting is standard 4-year/1-year cliff. Overall less risky than the MSA but needs severance negotiation.",
      redFlags: [
        "24-month non-solicitation covers both clients AND employees — much longer than the industry standard of 6-12 months.",
        "No severance clause defined — if laid off, you get nothing unless you negotiate it now.",
        "Mandatory arbitration for ALL disputes — including sexual harassment or discrimination — limits your legal options.",
      ],
      questions: [
        "Can we reduce the non-solicitation period from 24 months to 12 months?",
        "Will you add a severance clause — e.g., 1 month per year of service, up to 6 months?",
        "Can we carve out statutory discrimination claims from the mandatory arbitration requirement?",
        "What happens to unvested equity if I'm laid off without cause before my 1-year cliff?",
      ]
    }
  },

  saas: {
    name: "SaaS Platform Terms of Service",
    type: "SaaS Agreement",
    jurisdiction: "Delaware, USA",
    wordCount: 5802,
    readingTime: "23 min",
    gradeLevel: "Grade 18 (Postgraduate)",
    contractType: "Terms of Service",

    clauses: [
      {
        id: "s1",
        original: "Company reserves the right to modify these Terms at any time without prior notice to users. Continued use of the Service following any such modification constitutes your acceptance of the new Terms.",
        plain: "They can change any rule in this agreement without telling you. If you keep using the app, you've automatically agreed to whatever they changed — even if you didn't read it.",
        trap: "There is no obligation to notify you. Your continued use = silent consent to unknown terms.",
        type: "high"
      }
    ],

    risks: [
      { level: "high",   title: "Unilateral Terms Modification Without Notice", desc: "Company can change any provision at any time, without user notification. Continued use = automatic acceptance.", category: "Liability" },
      { level: "high",   title: "Broad License to User-Generated Content",      desc: "You grant the company a worldwide, royalty-free, perpetual license to use any content you upload.",          category: "IP Ownership" },
      { level: "medium", title: "Limitation of Liability Cap at $100",          desc: "Company's total liability to you is capped at $100, regardless of damages caused.",                            category: "Liability" },
      { level: "medium", title: "Class Action Waiver",                          desc: "You waive your right to participate in any class action lawsuit against the company.",                          category: "Dispute" },
      { level: "low",    title: "Auto-Renewal Subscription",                   desc: "Subscription auto-renews annually. Cancel before renewal date or you'll be charged for another year.",          category: "Payment" },
    ],

    prepKit: {
      summary: "This SaaS ToS is extremely one-sided. The platform can change any term without notice (your continued use = consent), holds a perpetual license to your uploaded content, caps their liability at $100 regardless of harm, and requires you to waive class action rights. For business use, consult a data lawyer before uploading any proprietary information.",
      redFlags: [
        "Terms can be modified without notice — you could wake up to fundamentally different rules.",
        "You grant a perpetual, royalty-free license to your content — including business documents.",
        "$100 liability cap is effectively zero protection — negotiate a higher cap or service credit regime.",
        "Class action waiver removes your most powerful consumer legal tool.",
      ],
      questions: [
        "Will you commit to 30-day advance notice before any material Terms change?",
        "Can we negotiate a data processing addendum that limits use of our uploaded content to service delivery only?",
        "Can liability be capped at 12 months of fees paid rather than a flat $100?",
        "Is the class action waiver negotiable for enterprise customers?",
      ]
    }
  }
};

export const SAMPLE_COMPARISON = {
  original: {
    label: "Original Offer — v1",
    clauses: [
      { text: "Annual salary: $95,000.00", type: "removed" },
      { text: "Non-compete: 12 months, 10-mile radius", type: "removed" },
      { text: "Equity grant: 1,000 RSUs over 4 years", type: "neutral" },
      { text: "Remote work: Up to 3 days/week", type: "removed" },
      { text: "Severance: 3 months upon termination without cause", type: "removed" },
      { text: "Signing bonus: $10,000 (repayable if you leave within 12 months)", type: "neutral" },
    ]
  },
  revised: {
    label: "Revised Offer — v2 (Counter)",
    clauses: [
      { text: "Annual salary: $88,000.00 (↓ $7,000 reduction)", type: "added" },
      { text: "Non-compete: 24 months, 25-mile radius (expanded significantly)", type: "added" },
      { text: "Equity grant: 1,000 RSUs over 4 years", type: "neutral" },
      { text: "Remote work: 1 day/week only (reduced from 3 days)", type: "added" },
      { text: "Severance: REMOVED — at-will employment only", type: "added" },
      { text: "Signing bonus: $10,000 (repayable if you leave within 24 months — extended)", type: "neutral" },
    ]
  },
  summary: "The revised offer is significantly worse across 4 of 6 key terms. Salary dropped $7k, non-compete nearly tripled in scope, remote flexibility was slashed, and severance protection was entirely removed. The company appears to be negotiating backwards — counter-offer strongly advised."
};
